import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { isMercadoPagoConfigured } from "@/lib/mercadopago";
import { ChatThread } from "@/components/ChatThread";

export const metadata = {
  title: "Conversación",
};

export default async function ChatDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const { id } = await params;
  const userId = session.user.id;

  const [conversation, settings] = await Promise.all([
    db.conversation.findUnique({
      where: { id },
      include: {
        listing: {
          include: {
            images: { orderBy: { position: "asc" }, take: 1 },
          },
        },
        buyer: {
          select: { id: true, name: true, imageUrl: true },
        },
        seller: {
          select: { id: true, name: true, imageUrl: true },
        },
        messages: {
          orderBy: { createdAt: "asc" },
        },
        deal: {
          include: {
            payment: true,
            reviews: true,
          },
        },
      },
    }),
    db.platformSetting.findUnique({ where: { id: "default" } }),
  ]);

  if (!conversation) {
    notFound();
  }

  const isBuyer = conversation.buyerId === userId;
  const isSeller = conversation.sellerId === userId;

  if (!isBuyer && !isSeller) {
    redirect("/chat");
  }

  await db.conversation.update({
    where: { id: conversation.id },
    data: isBuyer ? { buyerReadAt: new Date() } : { sellerReadAt: new Date() },
  });

  const otherParty = isBuyer ? conversation.seller : conversation.buyer;
  const otherPartyReadAt = isBuyer
    ? conversation.sellerReadAt
    : conversation.buyerReadAt;

  return (
    <ChatThread
      conversationId={conversation.id}
      currentUserId={userId}
      otherParty={otherParty}
      listing={{
        id: conversation.listing.id,
        title: conversation.listing.title,
        priceCents: conversation.listing.priceCents,
        dealType: conversation.listing.dealType,
        imageUrl: conversation.listing.images[0]?.url ?? null,
      }}
      initialMessages={conversation.messages.map((m) => ({
        id: m.id,
        body: m.body,
        imageUrl: m.imageUrl,
        senderId: m.senderId,
        createdAt: m.createdAt.toISOString(),
      }))}
      initialDeal={conversation.deal}
      initialOtherPartyReadAt={
        otherPartyReadAt ? otherPartyReadAt.toISOString() : null
      }
      isMPConfigured={isMercadoPagoConfigured()}
      defaultRateBps={settings?.commissionBps ?? 400}
    />
  );
}
