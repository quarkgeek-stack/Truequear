"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatARSFromCents, formatBpsPercent } from "@/lib/commission";
import { placeBidAction, startAuctionConversationAction } from "@/lib/auction-actions";
import { AuctionStatus, AuctionShipping, Condition } from "@prisma/client";
import {
  Clock,
  Gavel,
  Volume2,
  VolumeX,
  Share2,
  Check,
  MessageSquare,
  AlertTriangle,
  Loader2,
  ArrowRight,
  ShieldCheck,
  Info,
} from "lucide-react";

export interface BidItem {
  id: string;
  amountCents: number;
  createdAt: string;
  bidder: {
    id: string;
    name: string;
  };
}

export interface AuctionDetailProps {
  initialAuction: {
    id: string;
    title: string;
    description: string;
    condition: Condition;
    categoryName: string;
    shipping: AuctionShipping;
    baseCents: number;
    reserveCents: number | null;
    currentCents: number;
    bidCount: number;
    startAt: string;
    endAt: string;
    status: AuctionStatus;
    sellerId: string;
    sellerName: string;
    sellerLocation: string;
    leaderId: string | null;
    leaderName: string | null;
    images: Array<{ url: string; position: number }>;
  };
  currentUserId: string | null;
  commissionBps: number;
  isMPConfigured: boolean;
}

function timeAgo(dateString: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateString).getTime()) / 1000);
  if (seconds < 60) return "hace instantes";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `hace ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `hace ${hours} h`;
  const days = Math.floor(hours / 24);
  return `hace ${days} d`;
}

export function AuctionDetailClient({
  initialAuction,
  currentUserId,
  commissionBps,
  isMPConfigured,
}: AuctionDetailProps) {
  const router = useRouter();

  // Estados reactivos sincronizados por polling
  const [currentCents, setCurrentCents] = useState(initialAuction.currentCents);
  const [bidCount, setBidCount] = useState(initialAuction.bidCount);
  const [endAt, setEndAt] = useState(initialAuction.endAt);
  const [status, setStatus] = useState<AuctionStatus>(initialAuction.status);
  const [leaderId, setLeaderId] = useState(initialAuction.leaderId);
  const [leaderName, setLeaderName] = useState(initialAuction.leaderName);
  const [bids, setBids] = useState<BidItem[]>([]);

  // Estados locales de interfaz
  const [activeImageIdx, setActiveImageIdx] = useState(0);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [priceScaled, setPriceScaled] = useState(false);
  const [extendedNotice, setExtendedNotice] = useState(false);
  const [wasOutbidNotice, setWasOutbidNotice] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  // Formulario de puja
  const [customPesos, setCustomPesos] = useState<string>("");
  const [autoMaxPesos, setAutoMaxPesos] = useState<string>("");
  const [showAutoMaxInput, setShowAutoMaxInput] = useState(false);
  const [bidError, setBidError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isOpeningChat, setIsOpeningChat] = useState(false);

  // Contador regresivo en tiempo real
  const [remainingSeconds, setRemainingSeconds] = useState(
    Math.max(0, Math.floor((new Date(initialAuction.endAt).getTime() - Date.now()) / 1000))
  );

  const prevPriceRef = useRef(initialAuction.currentCents);
  const prevLeaderRef = useRef(initialAuction.leaderId);

  // Cargar preferencia de sonido de localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem("truequear_auction_sound");
      if (stored === "true") setSoundEnabled(true);
    } catch {}
  }, []);

  function toggleSound() {
    const next = !soundEnabled;
    setSoundEnabled(next);
    try {
      localStorage.setItem("truequear_auction_sound", String(next));
    } catch {}
  }

  // Reproductor de sonido Web Audio API (oscilador 40 ms, sin archivos externos)
  function playClickSound() {
    if (!soundEnabled) return;
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(800, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(350, ctx.currentTime + 0.04);

      gain.gain.setValueAtTime(0.18, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.04);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.04);
    } catch {}
  }

  // Actualizar temporizador segundo a segundo
  useEffect(() => {
    const interval = setInterval(() => {
      const diff = Math.max(
        0,
        Math.floor((new Date(endAt).getTime() - Date.now()) / 1000)
      );
      setRemainingSeconds(diff);
      if (diff === 0 && status === AuctionStatus.ACTIVO) {
        // Al expirar localmente, refrescar estado del servidor
        void fetchPollData();
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [endAt, status]);

  // Polling cada 2 segundos mientras la pestaña esté visible
  async function fetchPollData() {
    try {
      const res = await fetch(`/api/remates/${initialAuction.id}/poll`, {
        cache: "no-store",
      });
      if (!res.ok) return;
      const data = await res.json();

      // Detectar aumento de precio
      if (data.currentCents > prevPriceRef.current) {
        // Disparar animación de escala (1 -> 1.06 -> 1 en 200ms)
        setPriceScaled(true);
        setTimeout(() => setPriceScaled(false), 200);
        playClickSound();

        // Si el usuario era el líder y lo superaron
        if (
          currentUserId &&
          prevLeaderRef.current === currentUserId &&
          data.leaderId !== currentUserId
        ) {
          setWasOutbidNotice(`Te superaron. Ahora va primero ${data.leaderName ?? "otro postor"}.`);
        }

        prevPriceRef.current = data.currentCents;
      }

      if (data.leaderId) {
        prevLeaderRef.current = data.leaderId;
      }

      setCurrentCents(data.currentCents);
      setBidCount(data.bidCount);
      setEndAt(data.endAt);
      setStatus(data.status);
      setLeaderId(data.leaderId);
      setLeaderName(data.leaderName);
      if (Array.isArray(data.bids)) {
        setBids(data.bids);
      }
    } catch {}
  }

  useEffect(() => {
    void fetchPollData();

    const interval = setInterval(() => {
      if (document.visibilityState === "visible") {
        void fetchPollData();
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [initialAuction.id, currentUserId, soundEnabled]);

  // Cálculo de la puja mínima permitida
  function calcMinBidPesos(): number {
    if (bidCount === 0) {
      return Math.round(initialAuction.baseCents / 100);
    }
    let inc = Math.max(500_00, Math.round(currentCents * 0.05));
    const rem = inc % 100;
    if (rem !== 0) inc += 100 - rem;
    return Math.round((currentCents + inc) / 100);
  }

  const minNextPesos = calcMinBidPesos();

  // Función para pujar
  function handlePlaceBid(amountPesos: number) {
    setBidError(null);
    setWasOutbidNotice(null);

    const autoMax = autoMaxPesos ? Number(autoMaxPesos) : null;

    startTransition(async () => {
      const res = await placeBidAction({
        auctionId: initialAuction.id,
        amountPesos,
        autoMaxPesos: autoMax,
      });

      if (!res.ok || !res.data) {
        setBidError(res.error ?? "No se pudo registrar la puja.");
        return;
      }

      // Actualizar pantalla instantáneamente con la respuesta del servidor sin esperar al poll
      if (res.data.currentCents) {
        setCurrentCents(res.data.currentCents);
        prevPriceRef.current = res.data.currentCents;
        setPriceScaled(true);
        setTimeout(() => setPriceScaled(false), 200);
        playClickSound();
      }
      if (typeof res.data.bidCount === "number") setBidCount(res.data.bidCount);
      if (res.data.leaderId) {
        setLeaderId(res.data.leaderId);
        prevLeaderRef.current = res.data.leaderId;
      }
      if (res.data.endAt) setEndAt(res.data.endAt);
      if (res.data.extended) {
        setExtendedNotice(true);
        setTimeout(() => setExtendedNotice(false), 6000);
      }

      setCustomPesos("");
      void fetchPollData();
    });
  }

  // Compartir ficha
  async function handleShare() {
    const shareText = "Están rematando esto en TruequeAR. Entrá a pujar.";
    const shareUrl = window.location.href;

    if (navigator.share) {
      try {
        await navigator.share({
          title: initialAuction.title,
          text: shareText,
          url: shareUrl,
        });
        return;
      } catch {}
    }

    try {
      await navigator.clipboard.writeText(`${shareText} ${shareUrl}`);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    } catch {}
  }

  // Abrir chat existente con el ganador o postor
  function handleOpenChat(targetBuyerId?: string) {
    setIsOpeningChat(true);
    startTransition(async () => {
      const res = await startAuctionConversationAction(
        initialAuction.id,
        targetBuyerId
      );
      if (res.ok && res.data?.conversationId) {
        router.push(`/chat/${res.data.conversationId}`);
      } else {
        setIsOpeningChat(false);
        setBidError(res.error ?? "No se pudo iniciar el chat.");
      }
    });
  }

  // Formato del cronómetro
  const hoursLeft = Math.floor(remainingSeconds / 3600);
  const minutesLeft = Math.floor((remainingSeconds % 3600) / 60);
  const secsLeft = remainingSeconds % 60;

  const isLess10Min = remainingSeconds < 600 && remainingSeconds > 0;
  const isLastMinute = remainingSeconds < 60 && remainingSeconds > 0;
  const isExpired = remainingSeconds === 0 || status !== AuctionStatus.ACTIVO;

  const isSeller = currentUserId === initialAuction.sellerId;
  const isLeader = currentUserId === leaderId;
  const isWinner = isExpired && status === AuctionStatus.CERRADO_VENDIDO && isLeader;

  const images = initialAuction.images.length > 0
    ? initialAuction.images
    : [{ url: "", position: 0 }];

  return (
    <div className="mx-auto max-w-lg space-y-5 pb-12">
      {/* 1. Galería de fotos 1:1 arriba */}
      <section className="relative overflow-hidden rounded-3xl border border-[#E2EAF2] bg-white shadow-sm">
        <div className="relative aspect-square w-full bg-[#F3F8FC]">
          {images[activeImageIdx]?.url ? (
            <img
              src={images[activeImageIdx].url}
              alt={initialAuction.title}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-xs font-bold text-[#5C6B82]">
              Sin foto cargada
            </div>
          )}

          {/* Badges superiores */}
          <div className="absolute left-3 top-3 flex items-center gap-1.5">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-black shadow-md ${
                isExpired
                  ? "bg-[#16324F] text-white"
                  : isLess10Min
                  ? "bg-[#9B2335] text-white"
                  : "bg-[#16324F]/90 text-white backdrop-blur-md"
              } ${isLastMinute ? "animate-pulse" : ""}`}
            >
              <Clock className="h-3.5 w-3.5" />
              <span className="tabular-nums">
                {isExpired
                  ? "FINALIZADO"
                  : `${String(hoursLeft).padStart(2, "0")}:${String(
                      minutesLeft
                    ).padStart(2, "0")}:${String(secsLeft).padStart(2, "0")}`}
              </span>
            </span>

            {extendedNotice && (
              <span className="rounded-full bg-amber-400 px-2.5 py-1 text-xs font-black text-[#16324F] shadow-md animate-bounce">
                +3 min
              </span>
            )}
          </div>

          <div className="absolute right-3 top-3 flex items-center gap-2">
            {/* Switch de Sonido */}
            <button
              type="button"
              onClick={toggleSound}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-[#16324F] shadow-md backdrop-blur-md hover:bg-white"
              title={soundEnabled ? "Desactivar sonido" : "Activar sonido"}
            >
              {soundEnabled ? (
                <Volume2 className="h-4 w-4 text-[#16324F]" />
              ) : (
                <VolumeX className="h-4 w-4 text-[#5C6B82]" />
              )}
            </button>

            {/* Botón Compartir */}
            <button
              type="button"
              onClick={handleShare}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-[#16324F] shadow-md backdrop-blur-md hover:bg-white"
              title="Compartir remate"
            >
              {copiedLink ? (
                <Check className="h-4 w-4 text-emerald-600" />
              ) : (
                <Share2 className="h-4 w-4 text-[#16324F]" />
              )}
            </button>
          </div>

          {/* Miniaturas inferiores si hay más de 1 foto */}
          {images.length > 1 && (
            <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5 px-4">
              {images.map((img, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setActiveImageIdx(idx)}
                  className={`h-2.5 rounded-full transition-all ${
                    activeImageIdx === idx
                      ? "w-7 bg-white shadow"
                      : "w-2.5 bg-white/50"
                  }`}
                />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* 2. Barra de aviso si te superaron */}
      {wasOutbidNotice && (
        <div className="flex items-center gap-2.5 rounded-2xl border-2 border-red-300 bg-red-50 p-4 text-xs font-black text-red-800 shadow-sm animate-shake">
          <AlertTriangle className="h-4 w-4 shrink-0 text-red-600" />
          <span>{wasOutbidNotice}</span>
        </div>
      )}

      {/* 3. Panel principal de precio y cronómetro */}
      <section className="rounded-3xl border border-[#E2EAF2] bg-white p-5 shadow-sm space-y-4">
        {/* Título y categoría */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs font-semibold text-[#5C6B82]">
            <span>{initialAuction.categoryName}</span>
            <span>{initialAuction.sellerLocation}</span>
          </div>
          <h1 className="text-lg font-black text-[#16324F] leading-snug">
            {initialAuction.title}
          </h1>
        </div>

        {/* Precio en tinta enorme con escala 1.06 */}
        <div className="rounded-2xl border border-[#D6E8F7] bg-[#F3F8FC] p-4 text-center space-y-1">
          <p className="text-[11px] font-bold uppercase tracking-wider text-[#5C6B82]">
            {bidCount === 0 ? "Precio de salida" : "Puja más alta"}
          </p>
          <div
            className={`text-4xl font-black tabular-nums transition-transform duration-200 ${
              priceScaled ? "scale-105" : "scale-100"
            } ${isLess10Min && !isExpired ? "text-[#9B2335]" : "text-[#16324F]"}`}
          >
            {formatARSFromCents(currentCents)}
          </div>
          <p className="text-xs font-bold text-[#5C6B82]">
            {bidCount === 0
              ? "Nadie pujó todavía"
              : `${bidCount} ${bidCount === 1 ? "puja registrada" : "pujas registradas"}`}
          </p>
        </div>

        {/* Banners de estado cerrado */}
        {isExpired && (
          <div className="space-y-3">
            {status === AuctionStatus.CERRADO_VENDIDO ? (
              <div className="rounded-2xl border-2 border-emerald-500 bg-emerald-50 p-5 text-center space-y-2">
                <p className="text-xs uppercase font-black tracking-wider text-emerald-800">
                  🎉 ¡Remate Vendido!
                </p>
                <p className="text-base font-black text-emerald-950">
                  Ganador: {leaderName ?? "Postor ganador"} por{" "}
                  {formatARSFromCents(currentCents)}
                </p>
                <p className="text-xs text-emerald-900 leading-relaxed">
                  El ganador y el vendedor coordinan el pago y la entrega por chat.
                </p>

                {(isWinner || isSeller) && (
                  <button
                    type="button"
                    disabled={isOpeningChat}
                    onClick={() => handleOpenChat(isSeller ? leaderId ?? undefined : undefined)}
                    className="mt-2 inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl bg-[#16324F] px-4 py-2.5 text-xs font-black text-white shadow-sm hover:bg-[#0F243A] disabled:opacity-60"
                  >
                    {isOpeningChat ? (
                      <Loader2 className="h-4 w-4 animate-spin text-[#F6C445]" />
                    ) : (
                      <MessageSquare className="h-4 w-4 text-[#F6C445]" />
                    )}
                    <span>Abrir chat del remate</span>
                  </button>
                )}
              </div>
            ) : status === AuctionStatus.CERRADO_SIN_RESERVA ? (
              <div className="rounded-2xl border-2 border-amber-300 bg-amber-50 p-5 text-center space-y-2">
                <p className="text-xs uppercase font-black tracking-wider text-amber-800">
                  No se alcanzó el precio de reserva
                </p>
                <p className="text-xs text-amber-950 leading-relaxed">
                  La mejor puja fue de {formatARSFromCents(currentCents)}, pero no alcanzó la reserva mínima del vendedor. No hay venta automática.
                </p>
                {isSeller && leaderId && (
                  <button
                    type="button"
                    disabled={isOpeningChat}
                    onClick={() => handleOpenChat(leaderId)}
                    className="mt-2 inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl bg-[#16324F] px-4 py-2.5 text-xs font-bold text-white hover:bg-[#0F243A]"
                  >
                    <MessageSquare className="h-4 w-4 text-[#F6C445]" />
                    <span>Contactar al mejor postor por chat</span>
                  </button>
                )}
              </div>
            ) : (
              <div className="rounded-2xl border border-[#E2EAF2] bg-[#F3F8FC] p-5 text-center space-y-1">
                <p className="text-sm font-bold text-[#16324F]">
                  Remate finalizado sin ofertas
                </p>
                <p className="text-xs text-[#5C6B82]">
                  No se registraron ofertas durante el tiempo de publicación.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Acciones de puja activa (Solo si el remate sigue ACTIVO) */}
        {!isExpired && (
          <div className="space-y-3 pt-1">
            {isSeller ? (
              <div className="rounded-xl border border-[#D6E8F7] bg-[#E7F1FA] p-3 text-center text-xs font-bold text-[#16324F]">
                🛡️ Sos el vendedor de este remate. Podés seguir las ofertas en vivo desde acá.
              </div>
            ) : isLeader ? (
              <div className="rounded-xl border-2 border-emerald-500 bg-emerald-50 p-3 text-center text-xs font-black text-emerald-800">
                ⭐ Vas liderando el remate con {formatARSFromCents(currentCents)}.
              </div>
            ) : !currentUserId ? (
              <div className="rounded-2xl border border-[#E2EAF2] bg-[#F3F8FC] p-4 text-center space-y-2">
                <p className="text-xs font-bold text-[#16324F]">
                  Iniciá sesión para participar en las ofertas
                </p>
                <Link
                  href="/login"
                  className="inline-flex min-h-[44px] w-full items-center justify-center rounded-xl bg-[#16324F] px-4 py-2 text-xs font-black text-white shadow-sm hover:bg-[#0F243A]"
                >
                  Ingresar a TruequeAR
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-xs font-bold text-[#16324F]">
                  Oferta mínima sugerida:{" "}
                  <strong className="text-[#0F243A]">
                    ${minNextPesos.toLocaleString("es-AR")}
                  </strong>
                </p>

                {/* Botones de puja rápida (+1.000, +5.000, +10.000) a 48px de alto */}
                <div className="grid grid-cols-3 gap-2">
                  {[1000, 5000, 10000].map((inc) => {
                    const targetPesos = Math.max(
                      minNextPesos,
                      Math.round(currentCents / 100) + inc
                    );
                    return (
                      <button
                        key={inc}
                        type="button"
                        disabled={isPending}
                        onClick={() => handlePlaceBid(targetPesos)}
                        className="flex min-h-[48px] items-center justify-center rounded-xl border-2 border-[#16324F] bg-white px-2 text-xs font-black text-[#16324F] shadow-sm transition hover:bg-[#16324F] hover:text-white disabled:opacity-50"
                      >
                        +${inc.toLocaleString("es-AR")}
                      </button>
                    );
                  })}
                </div>

                {/* Input libre de oferta */}
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-[#5C6B82]">
                      $
                    </span>
                    <input
                      type="number"
                      min={minNextPesos}
                      step={100}
                      value={customPesos}
                      onChange={(e) => setCustomPesos(e.target.value)}
                      placeholder={`Mínimo ${minNextPesos}`}
                      className="min-h-[48px] w-full rounded-xl border border-[#C5D4E5] bg-white pl-7 pr-3 text-xs font-extrabold text-[#16324F] placeholder:text-[#5C6B82] focus:border-[#75AADB] focus:outline-none"
                    />
                  </div>

                  <button
                    type="button"
                    disabled={isPending || !customPesos || Number(customPesos) < minNextPesos}
                    onClick={() => handlePlaceBid(Number(customPesos))}
                    className="flex min-h-[48px] min-w-[96px] items-center justify-center rounded-xl bg-[#16324F] px-4 text-xs font-black text-white shadow-sm hover:bg-[#0F243A] disabled:opacity-50"
                  >
                    {isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin text-[#F6C445]" />
                    ) : (
                      <span>Pujar</span>
                    )}
                  </button>
                </div>

                {/* Opcional: Puja automática */}
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={() => setShowAutoMaxInput(!showAutoMaxInput)}
                    className="text-[11px] font-bold text-[#75AADB] hover:underline"
                  >
                    {showAutoMaxInput
                      ? "− Ocultar tope de puja automática"
                      : "+ Configurar puja automática (Proxy)"}
                  </button>

                  {showAutoMaxInput && (
                    <div className="mt-2 rounded-xl border border-[#D5E4F2] bg-[#F3F8FC] p-3 space-y-2">
                      <p className="text-[11px] text-[#3D5270] leading-snug">
                        El sistema pujará automáticamente el mínimo necesario para mantenerte primero sin superar tu tope confidencial.
                      </p>
                      <div className="relative">
                        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-[#5C6B82]">
                          $
                        </span>
                        <input
                          type="number"
                          min={minNextPesos}
                          step={500}
                          value={autoMaxPesos}
                          onChange={(e) => setAutoMaxPesos(e.target.value)}
                          placeholder="Tu monto máximo a pagar"
                          className="min-h-[44px] w-full rounded-lg border border-[#C5D4E5] bg-white pl-7 pr-3 text-xs font-extrabold text-[#16324F] focus:border-[#75AADB] focus:outline-none"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {bidError && (
                  <p className="text-xs font-bold text-red-600 animate-shake">
                    {bidError}
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </section>

      {/* 4. Historial de ofertas recientes (máx 8) */}
      <section className="rounded-3xl border border-[#E2EAF2] bg-white p-5 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-black text-[#16324F]">
            Historial de ofertas ({bidCount})
          </h2>
          {soundEnabled && (
            <span className="flex items-center gap-1 text-[11px] text-[#5C6B82]">
              <Volume2 className="h-3 w-3 text-emerald-600" />
              Sonido activo
            </span>
          )}
        </div>

        {bids.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[#C5D4E5] p-6 text-center text-xs text-[#5C6B82]">
            Nadie pujó todavía. La primera oferta se lleva la delantera por el precio de salida.
          </div>
        ) : (
          <div className="divide-y divide-[#F3F8FC]">
            {bids.map((b, idx) => (
              <div
                key={b.id}
                className="flex items-center justify-between py-2.5 text-xs"
              >
                <div className="flex items-center gap-2">
                  {idx === 0 && (
                    <span className="rounded-md bg-[#16324F] px-1.5 py-0.5 text-[10px] font-black text-[#F6C445]">
                      1°
                    </span>
                  )}
                  <span className="font-bold text-[#16324F]">
                    {b.bidder.name}
                  </span>
                  <span className="text-[11px] text-[#5C6B82]">
                    {timeAgo(b.createdAt)}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="font-black text-[#16324F] tabular-nums">
                    {formatARSFromCents(b.amountCents)}
                  </span>
                  {/* Si el vendedor quiere escribirle a un postor del historial */}
                  {isSeller && isExpired && b.bidder.id !== currentUserId && (
                    <button
                      type="button"
                      disabled={isOpeningChat}
                      onClick={() => handleOpenChat(b.bidder.id)}
                      className="rounded-lg border border-[#75AADB] px-2 py-1 text-[10px] font-bold text-[#16324F] hover:bg-[#F3F8FC]"
                      title="Escribirle a este postor"
                    >
                      Chat
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 5. Detalles del producto y reglas */}
      <section className="rounded-3xl border border-[#E2EAF2] bg-white p-5 shadow-sm space-y-4">
        <h2 className="text-sm font-black text-[#16324F]">
          Descripción y condiciones
        </h2>
        <p className="whitespace-pre-line text-xs text-[#3D5270] leading-relaxed">
          {initialAuction.description}
        </p>

        <div className="grid grid-cols-2 gap-3 pt-3 border-t border-[#F3F8FC] text-xs">
          <div>
            <span className="text-[#5C6B82]">Estado:</span>{" "}
            <strong className="text-[#16324F]">
              {initialAuction.condition}
            </strong>
          </div>
          <div>
            <span className="text-[#5C6B82]">Envío:</span>{" "}
            <strong className="text-[#16324F]">
              {initialAuction.shipping === "COMPRADOR"
                ? "A cargo del comprador"
                : initialAuction.shipping === "VENDEDOR"
                ? "A cargo del vendedor"
                : "A convenir"}
            </strong>
          </div>
        </div>

        {/* Nota de comisión */}
        <div className="rounded-2xl border border-[#D6E8F7] bg-[#F3F8FC] p-4 text-xs text-[#243447] space-y-1">
          <p className="font-bold text-[#16324F]">
            ℹ️ Comisión de plataforma
          </p>
          <p className="text-[11px] leading-relaxed">
            Si se vende, la comisión de TruequeAR es de{" "}
            <strong>{formatBpsPercent(commissionBps)}</strong> y la paga el
            vendedor por fuera del precio. Si no se vende, no se cobra.
          </p>
          {!isMPConfigured && (
            <p className="text-[10px] text-[#5C6B82] pt-1">
              Mercado Pago en configuración. El cobro de comisión de la plataforma se coordinará por email una vez completada la entrega.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
