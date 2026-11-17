import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatARSFromCents, formatBpsPercent } from "@/lib/commission";
import { DEAL_STATUS_LABELS } from "@/lib/constants";
import { Handshake, ArrowRight } from "lucide-react";

export const metadata = {
  title: "Tus operaciones",
};

export default async function DealsListPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const userId = session.user.id;

  const deals = await db.deal.findMany({
    where: {
      OR: [{ buyerId: userId }, { sellerId: userId }],
    },
    orderBy: { createdAt: "desc" },
    include: {
      listing: {
        select: {
          id: true,
          title: true,
          images: { orderBy: { position: "asc" }, take: 1 },
        },
      },
      buyer: { select: { id: true, name: true } },
      seller: { select: { id: true, name: true } },
      payment: true,
    },
  });

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-[#16324F]">
          Tus operaciones
        </h1>
        <p className="text-sm text-[#243447]">
          Seguimiento de tus compras, ventas y trueques acordados.
        </p>
      </div>

      {deals.length === 0 ? (
        <div className="rounded-2xl border border-[#E2EAF2] bg-white p-10 text-center space-y-3 shadow-sm">
          <Handshake className="mx-auto h-10 w-10 text-[#75AADB]" />
          <p className="text-base font-bold text-[#16324F]">
            Todavía no tenés operaciones iniciadas
          </p>
          <p className="text-sm text-[#243447]">
            Cuando coordines por chat con otro usuario y toquen &ldquo;Confirmar operación&rdquo;, va a aparecer acá.
          </p>
          <div className="pt-2">
            <Link
              href="/chat"
              className="inline-flex min-h-[44px] items-center justify-center rounded-xl bg-[#16324F] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#0F243A]"
            >
              Ir a tus chats
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {deals.map((deal) => {
            const isBuyer = deal.buyerId === userId;
            const otherParty = isBuyer ? deal.seller : deal.buyer;
            const roleLabel = isBuyer
              ? "Comprador / Interesado"
              : "Vendedor / Dueño";
            const thumb = deal.listing.images[0]?.url;

            return (
              <Link
                key={deal.id}
                href={`/operaciones/${deal.id}`}
                className="flex flex-col justify-between gap-4 rounded-2xl border border-[#E2EAF2] bg-white p-4 shadow-sm transition hover:border-[#75AADB] sm:flex-row sm:items-center"
              >
                <div className="flex items-start gap-3.5">
                  <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-[#E2EAF2] bg-[#F3F8FC]">
                    {thumb ? (
                      <img
                        src={thumb}
                        alt={deal.listing.title}
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
                      <span className="rounded-full bg-[#16324F] px-2.5 py-0.5 text-xs font-bold text-white">
                        {DEAL_STATUS_LABELS[deal.status]}
                      </span>
                      <span className="text-xs font-medium text-[#243447]">
                        {deal.kind === "TRUEQUE" ? "Trueque" : "Venta"} • Con{" "}
                        <strong className="text-[#16324F]">
                          {otherParty.name}
                        </strong>{" "}
                        ({roleLabel})
                      </span>
                    </div>

                    <h3 className="text-base font-bold text-[#16324F]">
                      {deal.listing.title}
                    </h3>

                    <p className="text-xs text-[#243447]">
                      {deal.kind === "TRUEQUE" ? (
                        "Trueque directo (sin comisión)"
                      ) : (
                        <>
                          Monto acordado:{" "}
                          <strong className="text-[#16324F]">
                            {formatARSFromCents(deal.agreedPriceCents)}
                          </strong>{" "}
                          • Comisión ({formatBpsPercent(deal.commissionBps)}):{" "}
                          <strong className="text-[#16324F]">
                            {formatARSFromCents(deal.commissionCents)}
                          </strong>
                        </>
                      )}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-1.5 text-xs font-bold text-[#75AADB]">
                  <span>Ver operación</span>
                  <ArrowRight className="h-4 w-4" />
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
