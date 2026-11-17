import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { DEAL_STATUS_LABELS } from "@/lib/constants";
import { MessageSquare } from "lucide-react";

export const metadata = {
  title: "Tus chats",
};

export default async function ChatListPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const userId = session.user.id;

  const conversations = await db.conversation.findMany({
    where: {
      OR: [{ buyerId: userId }, { sellerId: userId }],
    },
    orderBy: { lastMessageAt: "desc" },
    include: {
      listing: {
        select: {
          id: true,
          title: true,
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
        orderBy: { createdAt: "desc" },
        take: 1,
      },
      deal: {
        select: { id: true, status: true },
      },
    },
  });

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-[#16324F]">Tus chats</h1>
        <p className="text-sm text-[#243447]">
          Conversaciones activas por compras, ventas o trueques.
        </p>
      </div>

      {conversations.length === 0 ? (
        <div className="rounded-2xl border border-[#E2EAF2] bg-white p-10 text-center space-y-3 shadow-sm">
          <MessageSquare className="mx-auto h-10 w-10 text-[#75AADB]" />
          <p className="text-base font-bold text-[#16324F]">
            Todavía no tenés chats activos
          </p>
          <p className="text-sm text-[#243447]">
            Entrá a cualquier aviso que te interese y tocá &ldquo;Me interesa&rdquo; para hablar con el dueño.
          </p>
          <div className="pt-2">
            <Link
              href="/"
              className="inline-flex min-h-[44px] items-center justify-center rounded-xl bg-[#16324F] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#0F243A]"
            >
              Ver publicaciones
            </Link>
          </div>
        </div>
      ) : (
        <div className="divide-y divide-[#E2EAF2] overflow-hidden rounded-2xl border border-[#E2EAF2] bg-white shadow-sm">
          {conversations.map((conv) => {
            const isBuyer = conv.buyerId === userId;
            const otherParty = isBuyer ? conv.seller : conv.buyer;
            const lastMsg = conv.messages[0];
            const myReadAt = isBuyer ? conv.buyerReadAt : conv.sellerReadAt;
            const hasUnread =
              lastMsg &&
              lastMsg.senderId !== userId &&
              (!myReadAt || new Date(lastMsg.createdAt) > new Date(myReadAt));

            const thumb = conv.listing.images[0]?.url;

            return (
              <Link
                key={conv.id}
                href={`/chat/${conv.id}`}
                className={`flex items-center justify-between gap-3.5 p-4 transition hover:bg-[#F3F8FC] ${
                  hasUnread ? "bg-[#F3F8FC]" : ""
                }`}
              >
                <div className="flex min-w-0 items-center gap-3.5">
                  <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-[#E2EAF2] bg-[#F3F8FC]">
                    {thumb ? (
                      <img
                        src={thumb}
                        alt={conv.listing.title}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-[10px] font-bold text-[#16324F]">
                        Sin foto
                      </div>
                    )}
                  </div>

                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-extrabold text-[#16324F]">
                        {otherParty.name}
                      </span>
                      <span className="text-xs text-[#243447]/50">•</span>
                      <span className="truncate text-xs font-bold text-[#75AADB]">
                        {conv.listing.title}
                      </span>
                      {conv.deal && (
                        <span className="rounded-full border border-[#E2EAF2] bg-[#F3F8FC] px-2 py-0.5 text-[10px] font-bold text-[#16324F]">
                          {DEAL_STATUS_LABELS[conv.deal.status]}
                        </span>
                      )}
                    </div>

                    <p
                      className={`truncate text-xs ${
                        hasUnread
                          ? "font-bold text-[#16324F]"
                          : "text-[#243447]"
                      }`}
                    >
                      {lastMsg
                        ? lastMsg.body || "📷 Imagen adjunta"
                        : "Conversación iniciada. ¡Escribí el primer mensaje!"}
                    </p>
                  </div>
                </div>

                <div className="flex shrink-0 flex-col items-end gap-1.5">
                  <span className="text-[11px] text-[#243447]/70">
                    {new Date(conv.lastMessageAt).toLocaleDateString("es-AR", {
                      day: "2-digit",
                      month: "2-digit",
                    })}
                  </span>
                  {hasUnread && (
                    <span className="h-2.5 w-2.5 rounded-full bg-[#F6C445]" />
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
