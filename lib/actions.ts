"use server";

import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { AuthError } from "next-auth";
import { auth, signIn, signOut, isAdminEmail } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  registerSchema,
  loginSchema,
  profileSchema,
  changePasswordSchema,
  listingSchema,
  listingStatusUpdateSchema,
  sendMessageSchema,
  confirmDealSchema,
  reviewSchema,
  platformSettingSchema,
} from "@/lib/validators";
import { calculateCommissionCents, canCreateConversation } from "@/lib/commission";
import { createOrProcessCommissionPayment } from "@/lib/mercadopago";
import { z } from "zod";

export type ActionResult<T = undefined> =
  | { ok: true; data?: T }
  | { ok: false; error: string };

export async function registerAction(
  input: z.infer<typeof registerSchema>
): Promise<ActionResult> {
  const parsed = registerSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Revisá los datos ingresados.",
    };
  }

  const email = parsed.data.email.toLowerCase();
  const existing = await db.user.findUnique({ where: { email } });
  if (existing) {
    return {
      ok: false,
      error: "Ya existe una cuenta registrada con ese email.",
    };
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 12);
  const role = isAdminEmail(email) ? "ADMIN" : "USER";

  await db.user.create({
    data: {
      email,
      name: parsed.data.name,
      passwordHash,
      role,
    },
  });

  try {
    await signIn("credentials", {
      email,
      password: parsed.data.password,
      redirect: false,
    });
  } catch {
    // Sign in handled after creation
  }

  revalidatePath("/");
  return { ok: true };
}

export async function loginAction(
  input: z.infer<typeof loginSchema>
): Promise<ActionResult> {
  const parsed = loginSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Ingresá tu email y contraseña.",
    };
  }

  try {
    await signIn("credentials", {
      email: parsed.data.email.toLowerCase(),
      password: parsed.data.password,
      redirect: false,
    });
    revalidatePath("/");
    return { ok: true };
  } catch (error) {
    if (error instanceof AuthError) {
      if (error.cause?.err?.message === "RATE_LIMIT") {
        return {
          ok: false,
          error:
            "Demasiados intentos fallidos. Esperá 10 minutos antes de volver a probar.",
        };
      }
      return {
        ok: false,
        error: "El email o la contraseña no son correctos.",
      };
    }
    if (error instanceof Error && error.message.includes("RATE_LIMIT")) {
      return {
        ok: false,
        error:
          "Demasiados intentos fallidos. Esperá 10 minutos antes de volver a probar.",
      };
    }
    return {
      ok: false,
      error: "El email o la contraseña no son correctos.",
    };
  }
}

export async function logoutAction(): Promise<void> {
  await signOut({ redirectTo: "/" });
}

export async function googleSignInAction(): Promise<void> {
  await signIn("google", { redirectTo: "/api/auth/post-login" });
}

export async function updateProfileAction(
  input: z.infer<typeof profileSchema>
): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false, error: "Iniciá sesión para editar tu perfil." };
  }

  const parsed = profileSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Datos de perfil inválidos.",
    };
  }

  await db.user.update({
    where: { id: session.user.id },
    data: {
      name: parsed.data.name,
      city: parsed.data.city,
      province: parsed.data.province,
      bio: parsed.data.bio || null,
      imageUrl: parsed.data.imageUrl || null,
    },
  });

  revalidatePath("/perfil");
  revalidatePath("/ajustes");
  revalidatePath("/");
  return { ok: true };
}

export async function changePasswordAction(
  input: z.infer<typeof changePasswordSchema>
): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false, error: "Iniciá sesión para cambiar tu contraseña." };
  }

  const parsed = changePasswordSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Revisá las contraseñas ingresadas.",
    };
  }

  const user = await db.user.findUnique({
    where: { id: session.user.id },
  });

  if (!user) {
    return { ok: false, error: "Usuario no encontrado." };
  }

  const matches = await bcrypt.compare(
    parsed.data.currentPassword,
    user.passwordHash
  );
  if (!matches) {
    return { ok: false, error: "Tu contraseña actual no es correcta." };
  }

  const newHash = await bcrypt.hash(parsed.data.newPassword, 12);
  await db.user.update({
    where: { id: user.id },
    data: { passwordHash: newHash },
  });

  return { ok: true };
}

export async function createListingAction(
  input: z.infer<typeof listingSchema>
): Promise<ActionResult<{ id: string }>> {
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false, error: "Tenés que iniciar sesión para publicar." };
  }

  const parsed = listingSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Revisá los campos del aviso.",
    };
  }

  const category = await db.category.findUnique({
    where: { id: parsed.data.categoryId },
  });
  if (!category || !category.parentId) {
    return {
      ok: false,
      error: "Elegí una subcategoría válida.",
    };
  }

  const priceCents =
    parsed.data.dealType === "TRUEQUE"
      ? null
      : Math.round((parsed.data.pricePesos ?? 0) * 100);

  const tradeNotes =
    parsed.data.dealType === "VENTA"
      ? null
      : parsed.data.tradeNotes?.trim() || null;

  const created = await db.listing.create({
    data: {
      ownerId: session.user.id,
      title: parsed.data.title,
      description: parsed.data.description,
      categoryId: parsed.data.categoryId,
      condition: parsed.data.condition,
      dealType: parsed.data.dealType,
      priceCents,
      tradeNotes,
      province: parsed.data.province,
      city: parsed.data.city,
      status: "ACTIVA",
      images: {
        create: parsed.data.images.map((url, idx) => ({
          url,
          position: idx,
        })),
      },
    },
  });

  revalidatePath("/");
  revalidatePath("/mis-publicaciones");
  return { ok: true, data: { id: created.id } };
}

export async function updateListingAction(
  listingId: string,
  input: z.infer<typeof listingSchema>
): Promise<ActionResult<{ id: string }>> {
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false, error: "Tenés que iniciar sesión." };
  }

  const parsedId = z.string().min(1).safeParse(listingId);
  if (!parsedId.success) {
    return { ok: false, error: "Aviso inválido." };
  }

  const existing = await db.listing.findUnique({
    where: { id: parsedId.data },
  });

  if (!existing || existing.ownerId !== session.user.id) {
    return { ok: false, error: "No tenés permiso para editar esta publicación." };
  }

  const parsed = listingSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Revisá los campos del aviso.",
    };
  }

  const category = await db.category.findUnique({
    where: { id: parsed.data.categoryId },
  });
  if (!category || !category.parentId) {
    return { ok: false, error: "Elegí una subcategoría válida." };
  }

  const priceCents =
    parsed.data.dealType === "TRUEQUE"
      ? null
      : Math.round((parsed.data.pricePesos ?? 0) * 100);

  const tradeNotes =
    parsed.data.dealType === "VENTA"
      ? null
      : parsed.data.tradeNotes?.trim() || null;

  await db.$transaction(async (tx) => {
    await tx.listing.update({
      where: { id: existing.id },
      data: {
        title: parsed.data.title,
        description: parsed.data.description,
        categoryId: parsed.data.categoryId,
        condition: parsed.data.condition,
        dealType: parsed.data.dealType,
        priceCents,
        tradeNotes,
        province: parsed.data.province,
        city: parsed.data.city,
      },
    });

    await tx.listingImage.deleteMany({
      where: { listingId: existing.id },
    });

    await tx.listingImage.createMany({
      data: parsed.data.images.map((url, idx) => ({
        listingId: existing.id,
        url,
        position: idx,
      })),
    });
  });

  revalidatePath("/");
  revalidatePath(`/aviso/${existing.id}`);
  revalidatePath("/mis-publicaciones");
  return { ok: true, data: { id: existing.id } };
}

export async function updateListingStatusAction(
  input: z.infer<typeof listingStatusUpdateSchema>
): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false, error: "Iniciá sesión para gestionar tus publicaciones." };
  }

  const parsed = listingStatusUpdateSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Datos inválidos." };
  }

  const listing = await db.listing.findUnique({
    where: { id: parsed.data.listingId },
  });

  if (!listing) {
    return { ok: false, error: "Publicación no encontrada." };
  }

  const isOwner = listing.ownerId === session.user.id;
  const isAdmin = session.user.role === "ADMIN";

  if (!isOwner && !isAdmin) {
    return { ok: false, error: "No tenés permiso para modificar este aviso." };
  }

  await db.listing.update({
    where: { id: listing.id },
    data: { status: parsed.data.status },
  });

  revalidatePath("/");
  revalidatePath(`/aviso/${listing.id}`);
  revalidatePath("/mis-publicaciones");
  revalidatePath("/admin");
  return { ok: true };
}

export async function toggleFavoriteAction(
  listingId: string
): Promise<ActionResult<{ favorited: boolean }>> {
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false, error: "Iniciá sesión para guardar favoritos." };
  }

  const parsedId = z.string().min(1).safeParse(listingId);
  if (!parsedId.success) {
    return { ok: false, error: "Aviso inválido." };
  }

  const userId = session.user.id;
  const existing = await db.favorite.findUnique({
    where: {
      userId_listingId: {
        userId,
        listingId: parsedId.data,
      },
    },
  });

  if (existing) {
    await db.favorite.delete({
      where: {
        userId_listingId: {
          userId,
          listingId: parsedId.data,
        },
      },
    });
    revalidatePath("/favoritos");
    revalidatePath(`/aviso/${parsedId.data}`);
    return { ok: true, data: { favorited: false } };
  }

  await db.favorite.create({
    data: {
      userId,
      listingId: parsedId.data,
    },
  });

  revalidatePath("/favoritos");
  revalidatePath(`/aviso/${parsedId.data}`);
  return { ok: true, data: { favorited: true } };
}

export async function startOrGetConversationAction(
  listingId: string
): Promise<ActionResult<{ conversationId: string }>> {
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false, error: "Iniciá sesión para contactar al vendedor." };
  }

  const parsedId = z.string().min(1).safeParse(listingId);
  if (!parsedId.success) {
    return { ok: false, error: "Aviso inválido." };
  }

  const listing = await db.listing.findUnique({
    where: { id: parsedId.data },
  });

  if (!listing || listing.status === "ELIMINADA") {
    return { ok: false, error: "La publicación no está disponible." };
  }

  if (!canCreateConversation(session.user.id, listing.ownerId)) {
    return { ok: false, error: "No podés abrir un chat en tu propia publicación." };
  }

  const existing = await db.conversation.findUnique({
    where: {
      listingId_buyerId: {
        listingId: listing.id,
        buyerId: session.user.id,
      },
    },
  });

  if (existing) {
    return { ok: true, data: { conversationId: existing.id } };
  }

  const created = await db.conversation.create({
    data: {
      listingId: listing.id,
      buyerId: session.user.id,
      sellerId: listing.ownerId,
      lastMessageAt: new Date(),
      buyerReadAt: new Date(),
    },
  });

  revalidatePath("/chat");
  revalidatePath(`/aviso/${listing.id}`);
  return { ok: true, data: { conversationId: created.id } };
}

export async function sendMessageAction(
  input: z.infer<typeof sendMessageSchema>
): Promise<
  ActionResult<{
    id: string;
    body: string;
    imageUrl: string | null;
    senderId: string;
    createdAt: string;
  }>
> {
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false, error: "Tenés que iniciar sesión." };
  }

  const parsed = sendMessageSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Mensaje inválido.",
    };
  }

  const conversation = await db.conversation.findUnique({
    where: { id: parsed.data.conversationId },
  });

  if (!conversation) {
    return { ok: false, error: "Conversación no encontrada." };
  }

  const userId = session.user.id;
  if (conversation.buyerId !== userId && conversation.sellerId !== userId) {
    return { ok: false, error: "No tenés permiso para enviar mensajes en este chat." };
  }

  const isBuyer = conversation.buyerId === userId;
  const now = new Date();

  const message = await db.$transaction(async (tx) => {
    const msg = await tx.message.create({
      data: {
        conversationId: conversation.id,
        senderId: userId,
        body: parsed.data.body,
        imageUrl: parsed.data.imageUrl || null,
      },
    });

    await tx.conversation.update({
      where: { id: conversation.id },
      data: {
        lastMessageAt: now,
        ...(isBuyer ? { buyerReadAt: now } : { sellerReadAt: now }),
      },
    });

    return msg;
  });

  revalidatePath("/chat");
  return {
    ok: true,
    data: {
      id: message.id,
      body: message.body,
      imageUrl: message.imageUrl,
      senderId: message.senderId,
      createdAt: message.createdAt.toISOString(),
    },
  };
}

export async function confirmDealAction(
  input: z.infer<typeof confirmDealSchema>
): Promise<ActionResult<{ dealId: string; status: string }>> {
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false, error: "Iniciá sesión para confirmar la operación." };
  }

  const parsed = confirmDealSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Revisá los datos de la operación.",
    };
  }

  const conversation = await db.conversation.findUnique({
    where: { id: parsed.data.conversationId },
    include: {
      listing: true,
      deal: true,
    },
  });

  if (!conversation) {
    return { ok: false, error: "Conversación no encontrada." };
  }

  const userId = session.user.id;
  const isBuyer = conversation.buyerId === userId;
  const isSeller = conversation.sellerId === userId;

  if (!isBuyer && !isSeller) {
    return { ok: false, error: "No formás parte de esta conversación." };
  }

  // Validar que el tipo de trato sea compatible con la publicación
  const listingDealType = conversation.listing.dealType;
  if (listingDealType === "VENTA" && parsed.data.kind !== "VENTA") {
    return { ok: false, error: "Esta publicación es solo de venta." };
  }
  if (listingDealType === "TRUEQUE" && parsed.data.kind !== "TRUEQUE") {
    return { ok: false, error: "Esta publicación es solo para trueque." };
  }

  const agreedPriceCents =
    parsed.data.kind === "VENTA" && parsed.data.agreedPricePesos
      ? Math.round(parsed.data.agreedPricePesos * 100)
      : null;

  const settings = await db.platformSetting.upsert({
    where: { id: "default" },
    update: {},
    create: {
      id: "default",
      commissionBps: 400,
      minCommissionCents: 0,
      maxCommissionCents: null,
    },
  });

  const now = new Date();
  const existingDeal = conversation.deal;

  if (
    existingDeal &&
    (existingDeal.status === "COMISION_PAGADA" || existingDeal.status === "CERRADA")
  ) {
    return {
      ok: false,
      error: "Esta operación ya fue pagada o cerrada.",
    };
  }

  // Si no existe deal o estaba CANCELADA, creamos/reiniciamos con la confirmación de quien inicia
  if (!existingDeal || existingDeal.status === "CANCELADA") {
    const commissionCents = calculateCommissionCents({
      kind: parsed.data.kind,
      agreedPriceCents,
      commissionBps: settings.commissionBps,
      minCommissionCents: settings.minCommissionCents,
      maxCommissionCents: settings.maxCommissionCents,
    });

    const saved = await db.deal.upsert({
      where: { conversationId: conversation.id },
      update: {
        kind: parsed.data.kind,
        agreedPriceCents,
        commissionBps: settings.commissionBps,
        commissionCents,
        status: "PENDIENTE_CONFIRMACION",
        buyerConfirmedAt: isBuyer ? now : null,
        sellerConfirmedAt: isSeller ? now : null,
      },
      create: {
        conversationId: conversation.id,
        listingId: conversation.listingId,
        buyerId: conversation.buyerId,
        sellerId: conversation.sellerId,
        kind: parsed.data.kind,
        agreedPriceCents,
        commissionBps: settings.commissionBps,
        commissionCents,
        status: "PENDIENTE_CONFIRMACION",
        buyerConfirmedAt: isBuyer ? now : null,
        sellerConfirmedAt: isSeller ? now : null,
      },
    });

    revalidatePath(`/chat/${conversation.id}`);
    revalidatePath("/operaciones");
    return { ok: true, data: { dealId: saved.id, status: saved.status } };
  }

  // Si ya hay un deal PENDIENTE_CONFIRMACION o ACORDADA:
  // Verificamos si las condiciones propuestas coinciden con las actuales
  const sameTerms =
    existingDeal.kind === parsed.data.kind &&
    (parsed.data.kind === "TRUEQUE" ||
      existingDeal.agreedPriceCents === agreedPriceCents);

  const nextBuyerConfirmedAt = isBuyer
    ? now
    : sameTerms
    ? existingDeal.buyerConfirmedAt
    : null;
  const nextSellerConfirmedAt = isSeller
    ? now
    : sameTerms
    ? existingDeal.sellerConfirmedAt
    : null;

  const bothConfirmed = Boolean(nextBuyerConfirmedAt && nextSellerConfirmedAt);

  // Al confirmar ambas partes, se congela el commissionBps de PlatformSetting y pasa a ACORDADA
  const frozenBps = bothConfirmed
    ? settings.commissionBps
    : existingDeal.commissionBps;

  const commissionCents = calculateCommissionCents({
    kind: parsed.data.kind,
    agreedPriceCents,
    commissionBps: frozenBps,
    minCommissionCents: settings.minCommissionCents,
    maxCommissionCents: settings.maxCommissionCents,
  });

  const nextStatus = bothConfirmed ? "ACORDADA" : "PENDIENTE_CONFIRMACION";

  const updated = await db.$transaction(async (tx) => {
    const d = await tx.deal.update({
      where: { id: existingDeal.id },
      data: {
        kind: parsed.data.kind,
        agreedPriceCents,
        commissionBps: frozenBps,
        commissionCents,
        status: nextStatus,
        buyerConfirmedAt: nextBuyerConfirmedAt,
        sellerConfirmedAt: nextSellerConfirmedAt,
      },
    });

    if (bothConfirmed && conversation.listing.status === "ACTIVA") {
      await tx.listing.update({
        where: { id: conversation.listingId },
        data: { status: "RESERVADA" },
      });
    }

    return d;
  });

  revalidatePath(`/chat/${conversation.id}`);
  revalidatePath("/operaciones");
  revalidatePath(`/operaciones/${updated.id}`);
  return { ok: true, data: { dealId: updated.id, status: updated.status } };
}

export async function cancelDealAction(dealId: string): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false, error: "Iniciá sesión para cancelar el trato." };
  }

  const parsedId = z.string().min(1).safeParse(dealId);
  if (!parsedId.success) {
    return { ok: false, error: "Operación inválida." };
  }

  const deal = await db.deal.findUnique({
    where: { id: parsedId.data },
  });

  if (!deal) {
    return { ok: false, error: "Operación no encontrada." };
  }

  if (deal.buyerId !== session.user.id && deal.sellerId !== session.user.id) {
    return { ok: false, error: "No tenés permiso sobre esta operación." };
  }

  if (deal.status === "COMISION_PAGADA" || deal.status === "CERRADA") {
    return {
      ok: false,
      error: "No se puede cancelar un trato que ya tiene la comisión paga o está cerrado.",
    };
  }

  await db.deal.update({
    where: { id: deal.id },
    data: {
      status: "CANCELADA",
      buyerConfirmedAt: null,
      sellerConfirmedAt: null,
    },
  });

  revalidatePath(`/chat/${deal.conversationId}`);
  revalidatePath("/operaciones");
  revalidatePath(`/operaciones/${deal.id}`);
  return { ok: true };
}

export async function payDealCommissionAction(
  dealId: string
): Promise<ActionResult<{ checkoutUrl: string }>> {
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false, error: "Iniciá sesión para pagar la comisión." };
  }

  const parsedId = z.string().min(1).safeParse(dealId);
  if (!parsedId.success) {
    return { ok: false, error: "Operación inválida." };
  }

  const deal = await db.deal.findUnique({
    where: { id: parsedId.data },
  });

  if (!deal) {
    return { ok: false, error: "Operación no encontrada." };
  }

  if (deal.buyerId !== session.user.id && deal.sellerId !== session.user.id) {
    return { ok: false, error: "No formás parte de esta operación." };
  }

  try {
    const result = await createOrProcessCommissionPayment(deal.id);
    revalidatePath(`/operaciones/${deal.id}`);
    revalidatePath("/operaciones");
    revalidatePath(`/chat/${deal.conversationId}`);
    revalidatePath("/admin");
    return { ok: true, data: result };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "No se pudo procesar el pago.";
    return { ok: false, error: message };
  }
}

export async function createReviewAction(
  input: z.infer<typeof reviewSchema>
): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false, error: "Iniciá sesión para calificar." };
  }

  const parsed = reviewSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Datos de calificación inválidos.",
    };
  }

  const deal = await db.deal.findUnique({
    where: { id: parsed.data.dealId },
    include: { reviews: true },
  });

  if (!deal) {
    return { ok: false, error: "Operación no encontrada." };
  }

  const authorId = session.user.id;
  if (deal.buyerId !== authorId && deal.sellerId !== authorId) {
    return { ok: false, error: "No participaste de esta operación." };
  }

  const canReview =
    deal.status === "COMISION_PAGADA" ||
    deal.status === "CERRADA" ||
    (deal.kind === "TRUEQUE" && deal.status === "ACORDADA");

  if (!canReview) {
    return {
      ok: false,
      error:
        deal.kind === "VENTA"
          ? "Primero hay que abonar la comisión para habilitar las calificaciones."
          : "Ambas partes tienen que confirmar el trueque antes de calificar.",
    };
  }

  const alreadyReviewed = deal.reviews.some((r) => r.authorId === authorId);
  if (alreadyReviewed) {
    return { ok: false, error: "Ya calificaste a la otra parte en esta operación." };
  }

  const targetId = deal.buyerId === authorId ? deal.sellerId : deal.buyerId;

  await db.$transaction(async (tx) => {
    await tx.review.create({
      data: {
        dealId: deal.id,
        authorId,
        targetId,
        stars: parsed.data.stars,
        comment: parsed.data.comment,
      },
    });

    // Recalcular ratingAvg y ratingCount del target dentro de la transacción
    const agg = await tx.review.aggregate({
      where: { targetId },
      _avg: { stars: true },
      _count: { stars: true },
    });

    const ratingAvg = Number((agg._avg.stars ?? 0).toFixed(2));
    const ratingCount = agg._count.stars ?? 0;

    await tx.user.update({
      where: { id: targetId },
      data: {
        ratingAvg,
        ratingCount,
      },
    });

    // Si ya están las dos calificaciones, pasamos la operación a CERRADA
    const totalReviews = await tx.review.count({
      where: { dealId: deal.id },
    });

    if (totalReviews >= 2 && deal.status !== "CERRADA") {
      await tx.deal.update({
        where: { id: deal.id },
        data: { status: "CERRADA" },
      });

      if (deal.kind === "TRUEQUE") {
        await tx.listing.update({
          where: { id: deal.listingId },
          data: { status: "VENDIDA" },
        });
      }
    }
  });

  revalidatePath(`/operaciones/${deal.id}`);
  revalidatePath("/operaciones");
  revalidatePath(`/chat/${deal.conversationId}`);
  revalidatePath("/perfil");
  return { ok: true };
}

export async function updatePlatformSettingAction(
  input: z.infer<typeof platformSettingSchema>
): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return { ok: false, error: "Acceso restringido a administradores." };
  }

  const parsed = platformSettingSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Porcentaje de comisión inválido.",
    };
  }

  await db.platformSetting.upsert({
    where: { id: "default" },
    update: {
      commissionBps: parsed.data.commissionBps,
      minCommissionCents: parsed.data.minCommissionCents,
      maxCommissionCents: parsed.data.maxCommissionCents ?? null,
    },
    create: {
      id: "default",
      commissionBps: parsed.data.commissionBps,
      minCommissionCents: parsed.data.minCommissionCents,
      maxCommissionCents: parsed.data.maxCommissionCents ?? null,
    },
  });

  revalidatePath("/admin");
  return { ok: true };
}
