import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { isMercadoPagoConfigured } from "@/lib/mercadopago";
import { formatARSFromCents, formatBpsPercent } from "@/lib/commission";
import { DEAL_STATUS_LABELS } from "@/lib/constants";
import { DealPanel } from "@/components/DealPanel";
import { ArrowLeft, MessageSquare, ShieldCheck } from "lucide-react";

export const metadata = {
  title: "Detalle de operación",
};

export default async function DealDetailPage({
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

  const [deal, settings] = await Promise.all([
    db.deal.findUnique({
      where: { id },
      include: {
        listing: {
          include: {
            images: { orderBy: { position: "asc" }, take: 1 },
          },
        },
        buyer: { select: { id: true, name: true, email: true, city: true } },
        seller: { select: { id: true, name: true, email: true, city: true } },
        payment: true,
        reviews: true,
      },
    }),
    db.platformSetting.findUnique({ where: { id: "default" } }),
  ]);

  if (!deal) {
    notFound();
  }

  const isBuyer = deal.buyerId === userId;
  const isSeller = deal.sellerId === userId;
  const isAdmin = session.user.role === "ADMIN";

  if (!isBuyer && !isSeller && !isAdmin) {
    redirect("/operaciones");
  }

  const otherParty = isBuyer ? deal.seller : deal.buyer;
  const thumb = deal.listing.images[0]?.url;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <Link
          href="/operaciones"
          className="inline-flex min-h-[44px] items-center gap-1.5 text-xs font-bold text-[#16324F] hover:text-[#75AADB]"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Volver a tus operaciones</span>
        </Link>

        <Link
          href={`/chat/${deal.conversationId}`}
          className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border border-[#75AADB] bg-white px-3.5 py-2 text-xs font-bold text-[#16324F] hover:bg-[#F3F8FC]"
        >
          <MessageSquare className="h-4 w-4 text-[#75AADB]" />
          <span>Abrir chat de la operación</span>
        </Link>
      </div>

      {/* Resumen de la operación */}
      <div className="rounded-2xl border border-[#E2EAF2] bg-white p-5 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#E2EAF2] pb-4">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-[#75AADB]">
              Operación #{deal.id.slice(-8)}
            </span>
            <h1 className="text-xl font-extrabold text-[#16324F]">
              {deal.listing.title}
            </h1>
          </div>
          <span className="rounded-full border border-[#E2EAF2] bg-[#F3F8FC] px-3.5 py-1 text-xs font-bold text-[#16324F]">
            {DEAL_STATUS_LABELS[deal.status]}
          </span>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="flex items-center gap-3 sm:col-span-2">
            {thumb && (
              <img
                src={thumb}
                alt={deal.listing.title}
                className="h-16 w-16 rounded-xl border border-[#E2EAF2] object-cover"
              />
            )}
            <div className="space-y-1 text-xs text-[#243447]">
              <p>
                <strong className="text-[#16324F]">Vendedor:</strong>{" "}
                {deal.seller.name}
              </p>
              <p>
                <strong className="text-[#16324F]">
                  Comprador / Interesado:
                </strong>{" "}
                {deal.buyer.name}
              </p>
              <p>
                <strong className="text-[#16324F]">Modalidad:</strong>{" "}
                {deal.kind === "TRUEQUE" ? "Trueque directo" : "Venta en pesos"}
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-[#E2EAF2] bg-[#F3F8FC] p-3.5 text-xs space-y-1">
            {deal.kind === "VENTA" ? (
              <>
                <div className="flex justify-between">
                  <span className="text-[#243447]">Precio acordado:</span>
                  <span className="font-bold text-[#16324F]">
                    {formatARSFromCents(deal.agreedPriceCents)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#243447]">
                    Comisión ({formatBpsPercent(deal.commissionBps)}):
                  </span>
                  <span className="font-extrabold text-[#16324F]">
                    {formatARSFromCents(deal.commissionCents)}
                  </span>
                </div>
                <div className="flex justify-between border-t border-[#E2EAF2] pt-1">
                  <span className="text-[#243447]">Pago comisión:</span>
                  <span className="font-bold text-[#16324F]">
                    {deal.payment?.status === "APPROVED"
                      ? "Pagada"
                      : "Pendiente"}
                  </span>
                </div>
              </>
            ) : (
              <p className="font-bold text-[#16324F]">
                Trueque mano a mano — $0 de comisión
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Acciones interactivas de la operación: Confirmación, Pago y Calificación */}
      <DealPanel
        conversationId={deal.conversationId}
        listingDealType={deal.listing.dealType}
        listingPriceCents={deal.listing.priceCents}
        currentUserId={userId}
        otherPartyName={otherParty.name}
        deal={deal}
        isMPConfigured={isMercadoPagoConfigured()}
        defaultRateBps={settings?.commissionBps ?? 400}
        showDetailLink={false}
      />

      <div className="rounded-2xl border border-[#E2EAF2] bg-white p-4 text-xs text-[#243447] flex items-start gap-2.5">
        <ShieldCheck className="h-5 w-5 text-[#75AADB] shrink-0 mt-0.5" />
        <p>
          Recordá: TruequeAR solo cobra la comisión de plataforma cuando hay venta en plata (con el porcentaje congelado al momento de crear el trato). El pago del producto y la entrega los arreglan directamente entre comprador y vendedor.
        </p>
      </div>
    </div>
  );
}
