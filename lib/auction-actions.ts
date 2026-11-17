"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { placeBidInAuction } from "@/lib/auction";
import { processUploadedImage, MAX_LISTING_IMAGES } from "@/lib/storage";
import {
  AuctionShipping,
  AuctionStatus,
  Condition,
} from "@prisma/client";
import { z } from "zod";

export interface ActionResult<T = unknown> {
  ok: boolean;
  data?: T;
  error?: string;
}

const createAuctionSchema = z.object({
  title: z
    .string()
    .min(5, "El título debe tener al menos 5 caracteres.")
    .max(80, "Máximo 80 caracteres."),
  description: z
    .string()
    .min(10, "La descripción debe tener al menos 10 caracteres.")
    .max(4000, "Máximo 4000 caracteres."),
  condition: z.nativeEnum(Condition, {
    errorMap: () => ({ message: "Seleccioná el estado del producto." }),
  }),
  categoryId: z.string().min(1, "Seleccioná una categoría."),
  shipping: z.nativeEnum(AuctionShipping, {
    errorMap: () => ({ message: "Seleccioná quién asume el envío." }),
  }),
  basePesos: z
    .number({ invalid_type_error: "Ingresá un precio base válido." })
    .min(100, "El precio base mínimo es de $100 pesos."),
  reservePesos: z.number().nullable().optional(),
  duration: z.enum(["12h", "24h", "3d", "5d", "7d"], {
    errorMap: () => ({ message: "Seleccioná la duración del remate." }),
  }),
  commitment: z.literal(true, {
    errorMap: () => ({
      message: "Tenés que aceptar el compromiso de entrega para publicar.",
    }),
  }),
  images: z
    .array(z.string().min(1))
    .min(1, "Subí al menos una foto del producto.")
    .max(MAX_LISTING_IMAGES, `Podés subir hasta ${MAX_LISTING_IMAGES} fotos.`),
});

const DURATION_HOURS: Record<string, number> = {
  "12h": 12,
  "24h": 24,
  "3d": 72,
  "5d": 120,
  "7d": 168,
};

export async function createAuctionAction(
  rawInput: unknown
): Promise<ActionResult<{ auctionId: string }>> {
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false, error: "Tenés que iniciar sesión para publicar un remate." };
  }

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, city: true, province: true },
  });

  if (!user || !user.city || !user.province) {
    return {
      ok: false,
      error: "Completá tu ciudad y provincia en Ajustes antes de publicar un remate.",
    };
  }

  // Tope estricto de 3 remates activos por usuario
  const activeCount = await db.auction.count({
    where: {
      sellerId: user.id,
      status: AuctionStatus.ACTIVO,
    },
  });

  if (activeCount >= 3) {
    return {
      ok: false,
      error: "Llegaste al límite máximo de 3 remates activos en simultáneo.",
    };
  }

  const parsed = createAuctionSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }

  const data = parsed.data;
  const baseCents = Math.round(data.basePesos * 100);
  const reserveCents = data.reservePesos ? Math.round(data.reservePesos * 100) : null;

  if (reserveCents !== null && reserveCents < baseCents) {
    return {
      ok: false,
      error: "El precio de reserva debe ser mayor o igual al precio base.",
    };
  }

  const durationHours = DURATION_HOURS[data.duration] ?? 24;
  const now = new Date();
  const endAt = new Date(now.getTime() + durationHours * 3600 * 1000);

  // Procesar imágenes (data URL o S3)
  const storedUrls: string[] = [];
  for (const img of data.images) {
    const stored = await processUploadedImage(img);
    storedUrls.push(stored);
  }

  const auction = await db.auction.create({
    data: {
      sellerId: user.id,
      title: data.title.trim(),
      description: data.description.trim(),
      condition: data.condition,
      categoryId: data.categoryId,
      shipping: data.shipping,
      baseCents,
      reserveCents,
      currentCents: baseCents,
      bidCount: 0,
      startAt: now,
      endAt,
      status: AuctionStatus.ACTIVO,
      images: {
        create: storedUrls.map((url, idx) => ({
          url,
          position: idx,
        })),
      },
    },
  });

  revalidatePath("/remates");
  return { ok: true, data: { auctionId: auction.id } };
}

export async function placeBidAction(input: {
  auctionId: string;
  amountPesos: number;
  autoMaxPesos?: number | null;
}): Promise<ActionResult<{
  currentCents?: number;
  bidCount?: number;
  leaderId?: string | null;
  endAt?: string;
  extended?: boolean;
}>> {
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false, error: "Tenés que iniciar sesión para pujar." };
  }

  if (typeof input.amountPesos !== "number" || input.amountPesos <= 0) {
    return { ok: false, error: "Monto de oferta inválido." };
  }

  const amountCents = Math.round(input.amountPesos * 100);
  const autoMaxCents = input.autoMaxPesos
    ? Math.round(input.autoMaxPesos * 100)
    : null;

  const result = await placeBidInAuction({
    auctionId: input.auctionId,
    bidderId: session.user.id,
    amountCents,
    autoMaxCents,
  });

  if (!result.ok) {
    return { ok: false, error: result.error };
  }

  revalidatePath(`/remates/${input.auctionId}`);
  revalidatePath("/remates");

  return {
    ok: true,
    data: {
      currentCents: result.currentCents,
      bidCount: result.bidCount,
      leaderId: result.leaderId,
      endAt: result.endAt,
      extended: result.extended,
    },
  };
}

/**
 * Conecta al ganador o a un postor con el vendedor en el sistema de chat existente.
 */
export async function startAuctionConversationAction(
  auctionId: string,
  targetBuyerId?: string
): Promise<ActionResult<{ conversationId: string }>> {
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false, error: "Tenés que iniciar sesión para abrir el chat." };
  }

  const currentUserId = session.user.id;

  const auction = await db.auction.findUnique({
    where: { id: auctionId },
    select: {
      id: true,
      sellerId: true,
      leaderId: true,
      title: true,
      currentCents: true,
    },
  });

  if (!auction) {
    return { ok: false, error: "Remate no encontrado." };
  }

  // Determinar quién es el comprador (si llama el vendedor, debe indicar el postor; si llama el postor, es él mismo)
  const isSeller = auction.sellerId === currentUserId;
  let buyerId: string;

  if (isSeller) {
    if (!targetBuyerId) {
      buyerId = auction.leaderId ?? "";
    } else {
      buyerId = targetBuyerId;
    }
  } else {
    buyerId = currentUserId;
  }

  if (!buyerId) {
    return { ok: false, error: "No hay postor para iniciar la conversación." };
  }

  if (buyerId === auction.sellerId) {
    return { ok: false, error: "No podés abrir un chat con vos mismo." };
  }

  // Buscar conversación existente para este remate y comprador
  const existing = await db.conversation.findUnique({
    where: {
      auctionId_buyerId: {
        auctionId: auction.id,
        buyerId,
      },
    },
  });

  if (existing) {
    return { ok: true, data: { conversationId: existing.id } };
  }

  // Crear la conversación
  const created = await db.conversation.create({
    data: {
      auctionId: auction.id,
      buyerId,
      sellerId: auction.sellerId,
    },
  });

  return { ok: true, data: { conversationId: created.id } };
}
