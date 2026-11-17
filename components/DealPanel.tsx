"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  DealKind,
  DealStatus,
  DealType,
  PaymentProvider,
  PaymentStatus,
} from "@prisma/client";
import {
  confirmDealAction,
  cancelDealAction,
  payDealCommissionAction,
  createReviewAction,
} from "@/lib/actions";
import {
  formatARSFromCents,
  formatBpsPercent,
  formatNumberARS,
} from "@/lib/commission";
import { DEAL_STATUS_LABELS } from "@/lib/constants";
import {
  Handshake,
  CheckCircle2,
  CreditCard,
  Star,
  XCircle,
  Loader2,
  ExternalLink,
} from "lucide-react";

export interface DealViewData {
  id: string;
  conversationId: string;
  listingId: string;
  buyerId: string;
  sellerId: string;
  kind: DealKind;
  agreedPriceCents: number | null;
  commissionBps: number;
  commissionCents: number;
  status: DealStatus;
  buyerConfirmedAt: string | Date | null;
  sellerConfirmedAt: string | Date | null;
  payment?: {
    id: string;
    provider: PaymentProvider;
    status: PaymentStatus;
    checkoutUrl: string | null;
  } | null;
  reviews?: Array<{
    id: string;
    authorId: string;
    targetId: string;
    stars: number;
    comment: string;
  }>;
}

interface DealPanelProps {
  conversationId: string;
  listingDealType: DealType;
  listingPriceCents: number | null;
  currentUserId: string;
  otherPartyName: string;
  deal: DealViewData | null;
  isMPConfigured: boolean;
  defaultRateBps: number;
  showDetailLink?: boolean;
  onUpdated?: () => void;
}

export function DealPanel({
  conversationId,
  listingDealType,
  listingPriceCents,
  currentUserId,
  otherPartyName,
  deal,
  isMPConfigured,
  defaultRateBps,
  showDetailLink = true,
  onUpdated,
}: DealPanelProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const initialKind: DealKind =
    deal?.kind ?? (listingDealType === "TRUEQUE" ? "TRUEQUE" : "VENTA");

  const initialPesos = deal?.agreedPriceCents
    ? Math.round(deal.agreedPriceCents / 100)
    : listingPriceCents
    ? Math.round(listingPriceCents / 100)
    : 0;

  const [kind, setKind] = useState<DealKind>(initialKind);
  const [priceInput, setPriceInput] = useState<string>(
    initialPesos > 0 ? formatNumberARS(initialPesos) : ""
  );
  const [pricePesos, setPricePesos] = useState<number | null>(
    initialPesos > 0 ? initialPesos : null
  );

  // Estado para calificación
  const [stars, setStars] = useState<number>(5);
  const [comment, setComment] = useState<string>("");

  const isBuyer = deal ? deal.buyerId === currentUserId : false;
  const myConfirmed = deal
    ? isBuyer
      ? Boolean(deal.buyerConfirmedAt)
      : Boolean(deal.sellerConfirmedAt)
    : false;
  const otherConfirmed = deal
    ? isBuyer
      ? Boolean(deal.sellerConfirmedAt)
      : Boolean(deal.buyerConfirmedAt)
    : false;

  const myReview = deal?.reviews?.find((r) => r.authorId === currentUserId);
  const otherReview = deal?.reviews?.find((r) => r.authorId !== currentUserId);

  const canReview =
    deal &&
    (deal.status === "COMISION_PAGADA" ||
      deal.status === "CERRADA" ||
      (deal.kind === "TRUEQUE" && deal.status === "ACORDADA"));

  const canCancel =
    deal &&
    deal.status !== "CANCELADA" &&
    deal.status !== "COMISION_PAGADA" &&
    deal.status !== "CERRADA";

  function handlePriceChange(val: string) {
    const digits = val.replace(/\D/g, "");
    if (!digits) {
      setPriceInput("");
      setPricePesos(null);
      return;
    }
    const num = parseInt(digits, 10);
    setPriceInput(formatNumberARS(num));
    setPricePesos(num);
  }

  function handleConfirmDeal(
    customKind?: DealKind,
    customPesos?: number | null
  ) {
    setError(null);
    const chosenKind = customKind ?? kind;
    const chosenPesos = customPesos !== undefined ? customPesos : pricePesos;

    startTransition(async () => {
      const res = await confirmDealAction({
        conversationId,
        kind: chosenKind,
        agreedPricePesos: chosenKind === "VENTA" ? chosenPesos : null,
      });

      if (!res.ok) {
        setError(res.error);
        return;
      }

      setModalOpen(false);
      onUpdated?.();
      router.refresh();
    });
  }

  function handleQuickConfirmPending() {
    if (!deal) return;
    const pendingPesos = deal.agreedPriceCents
      ? Math.round(deal.agreedPriceCents / 100)
      : null;
    handleConfirmDeal(deal.kind, pendingPesos);
  }

  function handlePayCommission() {
    if (!deal) return;
    setError(null);
    startTransition(async () => {
      const res = await payDealCommissionAction(deal.id);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      if (res.data?.checkoutUrl) {
        window.location.href = res.data.checkoutUrl;
        return;
      }
      onUpdated?.();
      router.refresh();
    });
  }

  function handleCancelDeal() {
    if (!deal) return;
    setError(null);
    startTransition(async () => {
      const res = await cancelDealAction(deal.id);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      onUpdated?.();
      router.refresh();
    });
  }

  function handleSubmitReview(e: React.FormEvent) {
    e.preventDefault();
    if (!deal) return;
    setError(null);
    startTransition(async () => {
      const res = await createReviewAction({
        dealId: deal.id,
        stars,
        comment,
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      onUpdated?.();
      router.refresh();
    });
  }

  return (
    <div className="rounded-2xl border border-[#E2EAF2] bg-white p-4 shadow-sm space-y-3">
      {/* Encabezado de estado de la operación */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Handshake className="h-5 w-5 text-[#75AADB]" />
          <span className="text-sm font-bold text-[#16324F]">
            Estado del trato:
          </span>
          <span className="rounded-full border border-[#E2EAF2] bg-[#F3F8FC] px-3 py-0.5 text-xs font-bold text-[#16324F]">
            {deal ? DEAL_STATUS_LABELS[deal.status] : "Sin iniciar"}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {showDetailLink && deal && (
            <Link
              href={`/operaciones/${deal.id}`}
              className="inline-flex min-h-[44px] items-center gap-1 rounded-xl border border-[#75AADB] bg-white px-3 py-2 text-xs font-bold text-[#16324F] hover:bg-[#F3F8FC]"
            >
              <span>Ver detalle de operación</span>
              <ExternalLink className="h-3.5 w-3.5 text-[#75AADB]" />
            </Link>
          )}

          {(!deal || deal.status === "CANCELADA") && (
            <button
              type="button"
              onClick={() => setModalOpen(true)}
              className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl bg-[#16324F] px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-[#0F243A]"
            >
              <CheckCircle2 className="h-4 w-4 text-[#F6C445]" />
              <span>Confirmar operación</span>
            </button>
          )}

          {canCancel && (
            <button
              type="button"
              disabled={isPending}
              onClick={handleCancelDeal}
              className="inline-flex min-h-[44px] items-center gap-1 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-100 disabled:opacity-50"
            >
              <XCircle className="h-3.5 w-3.5" />
              <span>Cancelar trato</span>
            </button>
          )}
        </div>
      </div>

      {/* Estado PENDIENTE_CONFIRMACION */}
      {deal && deal.status === "PENDIENTE_CONFIRMACION" && (
        <div className="rounded-xl border border-[#75AADB] bg-[#F3F8FC] p-3.5 text-xs space-y-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-sm font-bold text-[#16324F]">
                Propuesta:{" "}
                {deal.kind === "TRUEQUE"
                  ? "Trueque mano a mano ($0 comisión)"
                  : `Venta por ${formatARSFromCents(deal.agreedPriceCents)}`}
              </p>
              <p className="mt-0.5 text-[#243447]">
                {myConfirmed && !otherConfirmed
                  ? `Ya confirmaste. Falta que ${otherPartyName} toque "Confirmar operación".`
                  : !myConfirmed && otherConfirmed
                  ? `${otherPartyName} ya confirmó este trato. Revisá y confirmá para acordar la operación.`
                  : "Falta la confirmación de ambas partes."}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {!myConfirmed && (
                <button
                  type="button"
                  disabled={isPending}
                  onClick={handleQuickConfirmPending}
                  className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl bg-[#16324F] px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-[#0F243A] disabled:opacity-60"
                >
                  {isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4 text-[#F6C445]" />
                  )}
                  <span>Confirmar operación</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => setModalOpen(true)}
                className="inline-flex min-h-[44px] items-center rounded-xl border border-[#75AADB] bg-white px-3 py-2 text-xs font-bold text-[#16324F] hover:bg-[#F3F8FC]"
              >
                Modificar condiciones
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Estado ACORDADA — Comisión (si es VENTA) */}
      {deal && deal.status === "ACORDADA" && deal.kind === "VENTA" && (
        <div className="rounded-xl border border-[#E2EAF2] bg-[#F3F8FC] p-4 space-y-3">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <div className="space-y-1">
              <p className="text-xs font-bold uppercase tracking-wide text-[#75AADB]">
                Operación acordada por{" "}
                {formatARSFromCents(deal.agreedPriceCents)}
              </p>
              <p className="text-base font-extrabold text-[#16324F]">
                Comisión TruequeAR: {formatARSFromCents(deal.commissionCents)} (
                {formatBpsPercent(deal.commissionBps)})
              </p>
              <p className="text-xs text-[#243447]">
                {isMPConfigured
                  ? "El pago del producto se arregla entre las dos personas y acá abonás únicamente la comisión de plataforma por MercadoPago."
                  : "El pago del producto se arregla entre las dos personas y la comisión de la plataforma se va a cobrar por MercadoPago cuando las credenciales estén cargadas."}
              </p>
            </div>

            {isMPConfigured && (
              <button
                type="button"
                disabled={isPending}
                onClick={handlePayCommission}
                className="inline-flex min-h-[44px] shrink-0 items-center justify-center gap-2 rounded-xl bg-[#16324F] px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-[#0F243A] disabled:opacity-60"
              >
                {isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Procesando...</span>
                  </>
                ) : (
                  <>
                    <CreditCard className="h-4 w-4 text-[#F6C445]" />
                    <span>Pagar comisión con MercadoPago</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Bloque de Calificación (cuando está COMISION_PAGADA, CERRADA o TRUEQUE ACORDADA) */}
      {canReview && (
        <div className="rounded-xl border border-[#E2EAF2] bg-[#F3F8FC] p-4 space-y-3">
          {deal.status === "COMISION_PAGADA" && (
            <div className="flex items-center gap-2 text-xs font-bold text-[#16324F]">
              <CheckCircle2 className="h-4 w-4 text-[#75AADB]" />
              <span>
                Comisión abonada ({formatARSFromCents(deal.commissionCents)}).
                ¡Ya pueden calificarse!
              </span>
            </div>
          )}

          {myReview ? (
            <div className="rounded-lg border border-[#E2EAF2] bg-white p-3 text-xs space-y-1">
              <p className="font-bold text-[#16324F]">
                Tu calificación para {otherPartyName}:{" "}
                <span className="text-[#F6C445]">
                  {"★".repeat(myReview.stars)}
                </span>
              </p>
              <p className="text-[#243447]">{myReview.comment}</p>
            </div>
          ) : (
            <form onSubmit={handleSubmitReview} className="space-y-3">
              <p className="text-sm font-bold text-[#16324F]">
                Calificá tu experiencia con {otherPartyName}
              </p>

              <div className="flex items-center gap-1.5">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setStars(n)}
                    className="flex h-11 w-11 items-center justify-center rounded-xl border border-[#E2EAF2] bg-white transition hover:border-[#75AADB]"
                  >
                    <Star
                      className={`h-5 w-5 ${
                        n <= stars
                          ? "fill-[#F6C445] text-[#F6C445]"
                          : "text-[#E2EAF2]"
                      }`}
                    />
                  </button>
                ))}
                <span className="ml-2 text-xs font-bold text-[#16324F]">
                  {stars} de 5
                </span>
              </div>

              <div>
                <textarea
                  rows={2}
                  maxLength={500}
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Contá brevemente cómo salió el trato..."
                  className="w-full rounded-xl border border-[#E2EAF2] bg-white p-3 text-xs text-[#243447] focus:border-[#75AADB] focus:outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={isPending}
                className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-[#16324F] px-4 py-2 text-xs font-bold text-white hover:bg-[#0F243A] disabled:opacity-60"
              >
                {isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Guardando calificación...</span>
                  </>
                ) : (
                  <span>Enviar calificación</span>
                )}
              </button>
            </form>
          )}

          {otherReview && (
            <div className="rounded-lg border border-[#E2EAF2] bg-white p-3 text-xs space-y-1">
              <p className="font-bold text-[#16324F]">
                Calificación de {otherPartyName}:{" "}
                <span className="text-[#F6C445]">
                  {"★".repeat(otherReview.stars)}
                </span>
              </p>
              <p className="text-[#243447]">{otherReview.comment}</p>
            </div>
          )}
        </div>
      )}

      {/* Modal para proponer / confirmar condiciones del trato */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl border border-[#E2EAF2] bg-white p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-extrabold text-[#16324F]">
                Confirmar operación
              </h3>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="min-h-[44px] px-2 text-xs font-semibold text-[#243447] hover:text-[#16324F]"
              >
                Cerrar
              </button>
            </div>

            <p className="text-xs text-[#243447]">
              Elegí el tipo de cierre y el monto final acordado. Cuando ambos confirmen, la operación queda acordada.
            </p>

            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-semibold text-[#16324F]">
                  Tipo de operación final
                </label>
                <select
                  value={kind}
                  onChange={(e) => setKind(e.target.value as DealKind)}
                  disabled={listingDealType !== "AMBOS"}
                  className="min-h-[44px] w-full rounded-xl border border-[#E2EAF2] bg-white px-3 py-2 text-sm text-[#243447]"
                >
                  {(listingDealType === "VENTA" ||
                    listingDealType === "AMBOS") && (
                    <option value="VENTA">
                      Venta en pesos (Comisión {formatBpsPercent(defaultRateBps)})
                    </option>
                  )}
                  {(listingDealType === "TRUEQUE" ||
                    listingDealType === "AMBOS") && (
                    <option value="TRUEQUE">
                      Trueque mano a mano (Sin comisión)
                    </option>
                  )}
                </select>
              </div>

              {kind === "VENTA" && (
                <div>
                  <label className="mb-1 block text-xs font-semibold text-[#16324F]">
                    Precio acordado en pesos ($ ARS)
                  </label>
                  <div className="relative">
                    <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-[#243447]/60">
                      $
                    </span>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={priceInput}
                      onChange={(e) => handlePriceChange(e.target.value)}
                      placeholder="160.000"
                      className="min-h-[44px] w-full rounded-xl border border-[#E2EAF2] pl-8 pr-4 py-2 text-base font-bold text-[#16324F]"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="min-h-[44px] rounded-xl border border-[#75AADB] bg-white px-4 py-2 text-xs font-bold text-[#16324F] hover:bg-[#F3F8FC]"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isPending}
                onClick={() => handleConfirmDeal()}
                className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl bg-[#16324F] px-5 py-2 text-xs font-bold text-white hover:bg-[#0F243A] disabled:opacity-60"
              >
                {isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-4 w-4 text-[#F6C445]" />
                )}
                <span>Confirmar ahora</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {error && <p className="text-xs font-semibold text-red-600">{error}</p>}
    </div>
  );
}
