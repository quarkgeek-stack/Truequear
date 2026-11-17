import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

const paramsSchema = z.object({
  conversationId: z.string().min(1),
});

export async function GET(
  request: Request,
  context: { params: Promise<{ conversationId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const resolvedParams = await context.params;
  const parsedParams = paramsSchema.safeParse(resolvedParams);
  if (!parsedParams.success) {
    return NextResponse.json({ error: "Parámetros inválidos" }, { status: 400 });
  }

  const { conversationId } = parsedParams.data;
  const url = new URL(request.url);
  const afterId = url.searchParams.get("after");

  const conversation = await db.conversation.findUnique({
    where: { id: conversationId },
    include: {
      deal: {
        include: {
          payment: true,
          reviews: true,
        },
      },
      listing: {
        select: {
          id: true,
          status: true,
          dealType: true,
          priceCents: true,
        },
      },
    },
  });

  if (!conversation) {
    return NextResponse.json({ error: "Conversación no encontrada" }, { status: 404 });
  }

  const userId = session.user.id;
  if (conversation.buyerId !== userId && conversation.sellerId !== userId) {
    return NextResponse.json({ error: "No tenés permiso para ver este chat" }, { status: 403 });
  }

  const isBuyer = conversation.buyerId === userId;

  // Marcar como leído
  await db.conversation.update({
    where: { id: conversationId },
    data: isBuyer ? { buyerReadAt: new Date() } : { sellerReadAt: new Date() },
  });

  let afterDate: Date | undefined;
  if (afterId) {
    const refMsg = await db.message.findUnique({
      where: { id: afterId },
      select: { createdAt: true },
    });
    if (refMsg) {
      afterDate = refMsg.createdAt;
    }
  }

  const messages = await db.message.findMany({
    where: {
      conversationId,
      ...(afterDate && afterId
        ? {
            createdAt: { gte: afterDate },
            id: { not: afterId },
          }
        : {}),
    },
    orderBy: { createdAt: "asc" },
    include: {
      sender: {
        select: {
          id: true,
          name: true,
          imageUrl: true,
        },
      },
    },
  });

  const otherPartyReadAt = isBuyer ? conversation.sellerReadAt : conversation.buyerReadAt;

  return NextResponse.json({
    messages,
    deal: conversation.deal,
    listingStatus: conversation.listing.status,
    otherPartyReadAt,
  });
}
