"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { DealType } from "@prisma/client";
import { sendMessageAction } from "@/lib/actions";
import { uploadCompressedImages } from "@/lib/client-image";
import { formatARSFromCents } from "@/lib/commission";
import { DealPanel, type DealViewData } from "@/components/DealPanel";
import {
  Send,
  ImagePlus,
  Loader2,
  ArrowLeft,
  CheckCheck,
  X,
} from "lucide-react";

export interface ChatMessageItem {
  id: string;
  body: string;
  imageUrl: string | null;
  senderId: string;
  createdAt: string;
  optimistic?: boolean;
}

interface ChatThreadProps {
  conversationId: string;
  currentUserId: string;
  otherParty: {
    id: string;
    name: string;
    imageUrl: string | null;
  };
  listing: {
    id: string;
    title: string;
    priceCents: number | null;
    dealType: DealType;
    imageUrl: string | null;
    isAuction?: boolean;
  };
  initialMessages: ChatMessageItem[];
  initialDeal: DealViewData | null;
  initialOtherPartyReadAt: string | null;
  isMPConfigured: boolean;
  defaultRateBps: number;
  auctionNotice?: string | null;
}

export function ChatThread({
  conversationId,
  currentUserId,
  otherParty,
  listing,
  initialMessages,
  initialDeal,
  initialOtherPartyReadAt,
  isMPConfigured,
  defaultRateBps,
  auctionNotice,
}: ChatThreadProps) {
  const [messages, setMessages] = useState<ChatMessageItem[]>(initialMessages);
  const [deal, setDeal] = useState<DealViewData | null>(initialDeal);
  const [otherReadAt, setOtherReadAt] = useState<string | null>(
    initialOtherPartyReadAt
  );

  const [body, setBody] = useState("");
  const [attachedImage, setAttachedImage] = useState<string | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  const bottomRef = useRef<HTMLDivElement | null>(null);
  const lastKnownIdRef = useRef<string | null>(
    initialMessages.filter((m) => !m.optimistic).at(-1)?.id ?? null
  );

  useEffect(() => {
    const lastServerMsg = messages.filter((m) => !m.optimistic).at(-1);
    if (lastServerMsg) {
      lastKnownIdRef.current = lastServerMsg.id;
    }
  }, [messages]);

  const pollMessages = useCallback(async () => {
    if (
      typeof document !== "undefined" &&
      document.visibilityState !== "visible"
    ) {
      return;
    }

    try {
      const afterParam = lastKnownIdRef.current
        ? `?after=${encodeURIComponent(lastKnownIdRef.current)}`
        : "";
      const res = await fetch(
        `/api/chat/${conversationId}/messages${afterParam}`,
        {
          cache: "no-store",
        }
      );
      if (!res.ok) return;

      const data = (await res.json()) as {
        messages?: Array<{
          id: string;
          body: string;
          imageUrl: string | null;
          senderId: string;
          createdAt: string;
        }>;
        deal?: DealViewData | null;
        otherPartyReadAt?: string | null;
      };

      if (data.deal !== undefined) {
        setDeal(data.deal);
      }

      if (data.otherPartyReadAt !== undefined) {
        setOtherReadAt(data.otherPartyReadAt);
      }

      if (data.messages && data.messages.length > 0) {
        setMessages((prev) => {
          const existingIds = new Set(prev.map((m) => m.id));
          const incoming = data.messages!.filter(
            (m) => !existingIds.has(m.id)
          );
          if (incoming.length === 0) return prev;
          return [...prev.filter((m) => !m.optimistic), ...incoming];
        });
      }
    } catch {
      // Silenciar errores transitorios de polling
    }
  }, [conversationId]);

  // Polling cada 2500 ms + refetch al volver el foco
  useEffect(() => {
    const interval = setInterval(() => {
      void pollMessages();
    }, 2500);

    function handleFocusOrVisibility() {
      if (document.visibilityState === "visible") {
        void pollMessages();
      }
    }

    window.addEventListener("focus", handleFocusOrVisibility);
    document.addEventListener("visibilitychange", handleFocusOrVisibility);

    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", handleFocusOrVisibility);
      document.removeEventListener("visibilitychange", handleFocusOrVisibility);
    };
  }, [pollMessages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setSendError(null);
    setIsUploadingImage(true);
    try {
      const urls = await uploadCompressedImages([file]);
      if (urls[0]) {
        setAttachedImage(urls[0]);
      }
    } catch (err) {
      setSendError(
        err instanceof Error ? err.message : "No se pudo subir la imagen."
      );
    } finally {
      setIsUploadingImage(false);
      e.target.value = "";
    }
  }

  async function handleSend() {
    const trimmed = body.trim();
    if ((!trimmed && !attachedImage) || isSending) return;

    setSendError(null);
    const tempId = `temp-${Date.now()}`;
    const optimisticMsg: ChatMessageItem = {
      id: tempId,
      body: trimmed,
      imageUrl: attachedImage,
      senderId: currentUserId,
      createdAt: new Date().toISOString(),
      optimistic: true,
    };

    setMessages((prev) => [...prev, optimisticMsg]);
    setBody("");
    const imageToSend = attachedImage;
    setAttachedImage(null);
    setIsSending(true);

    try {
      const res = await sendMessageAction({
        conversationId,
        body: trimmed,
        imageUrl: imageToSend,
      });

      if (!res.ok || !res.data) {
        setMessages((prev) => prev.filter((m) => m.id !== tempId));
        setBody(trimmed);
        setAttachedImage(imageToSend);
        setSendError(res.ok ? "Error al enviar" : res.error);
        return;
      }

      const saved = res.data;
      setMessages((prev) => {
        const withoutTemp = prev.filter((m) => m.id !== tempId);
        if (withoutTemp.some((m) => m.id === saved.id)) {
          return withoutTemp;
        }
        return [...withoutTemp, saved];
      });
    } finally {
      setIsSending(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  }

  const lastMessage = messages.at(-1);
  const seenByOther =
    lastMessage &&
    lastMessage.senderId === currentUserId &&
    otherReadAt &&
    new Date(otherReadAt) >= new Date(lastMessage.createdAt);

  return (
    <div className="mx-auto flex max-w-3xl flex-col space-y-4">
      {/* Header del chat con el aviso y la otra parte */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#E2EAF2] bg-white p-3.5 shadow-sm">
        <div className="flex min-w-0 items-center gap-3">
          <Link
            href="/chat"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[#75AADB] text-[#16324F] hover:bg-[#F3F8FC]"
            title="Volver a tus chats"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>

          <Link
            href={`/aviso/${listing.id}`}
            className="h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-[#E2EAF2] bg-[#F3F8FC]"
          >
            {listing.imageUrl ? (
              <img
                src={listing.imageUrl}
                alt={listing.title}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-[10px] font-bold text-[#16324F]">
                Foto
              </div>
            )}
          </Link>

          <div className="min-w-0">
            <p className="truncate text-sm font-extrabold text-[#16324F]">
              {otherParty.name}
            </p>
            <Link
              href={listing.isAuction ? `/remates/${listing.id}` : `/aviso/${listing.id}`}
              className="block truncate text-xs font-bold text-[#75AADB] hover:underline"
            >
              {listing.title} •{" "}
              {listing.dealType === "TRUEQUE"
                ? "Solo trueque"
                : formatARSFromCents(listing.priceCents)}
            </Link>
          </div>
        </div>
      </div>

      {auctionNotice && (
        <div className="rounded-2xl border-2 border-[#16324F] bg-[#FFF8E7] p-4 text-center text-xs font-extrabold text-[#16324F] shadow-sm">
          🔨 {auctionNotice}
        </div>
      )}

      {/* Panel de cierre de operación (Confirmar operación, Comisión, Calificar) */}
      <DealPanel
        conversationId={conversationId}
        listingDealType={listing.dealType}
        listingPriceCents={listing.priceCents}
        currentUserId={currentUserId}
        otherPartyName={otherParty.name}
        deal={deal}
        isMPConfigured={isMPConfigured}
        defaultRateBps={defaultRateBps}
        onUpdated={() => void pollMessages()}
      />

      {/* Contenedor de burbujas de mensajes */}
      <div className="flex h-[420px] flex-col justify-between overflow-hidden rounded-2xl border border-[#E2EAF2] bg-white shadow-sm sm:h-[480px]">
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.length === 0 ? (
            <div className="flex h-full items-center justify-center text-center text-sm text-[#243447]/60">
              Mandale un mensaje a {otherParty.name} para coordinar los detalles.
            </div>
          ) : (
            messages.map((msg) => {
              const isMine = msg.senderId === currentUserId;
              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${
                    isMine ? "items-end" : "items-start"
                  }`}
                >
                  <div
                    className={`max-w-[82%] rounded-2xl px-4 py-2.5 text-sm shadow-sm ${
                      isMine
                        ? "rounded-br-sm bg-[#16324F] text-white"
                        : "rounded-bl-sm border border-[#E2EAF2] bg-[#F3F8FC] text-[#243447]"
                    }`}
                  >
                    {msg.imageUrl && (
                      <div className="mb-2 overflow-hidden rounded-xl">
                        <img
                          src={msg.imageUrl}
                          alt="Adjunto en chat"
                          className="max-h-60 w-auto rounded-xl object-cover"
                        />
                      </div>
                    )}
                    {msg.body && (
                      <p className="whitespace-pre-wrap break-words leading-relaxed">
                        {msg.body}
                      </p>
                    )}
                    <p
                      className={`mt-1 text-right text-[10px] ${
                        isMine ? "text-[#75AADB]" : "text-[#243447]/60"
                      }`}
                    >
                      {new Date(msg.createdAt).toLocaleTimeString("es-AR", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>
              );
            })
          )}

          {seenByOther && (
            <div className="flex items-center justify-end gap-1 text-[11px] font-bold text-[#75AADB]">
              <CheckCheck className="h-3.5 w-3.5" />
              <span>Visto por {otherParty.name}</span>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Input fijo abajo */}
        <div className="border-t border-[#E2EAF2] bg-[#F3F8FC] p-3 space-y-2">
          {attachedImage && (
            <div className="flex items-center gap-2 rounded-xl border border-[#E2EAF2] bg-white p-2">
              <img
                src={attachedImage}
                alt="Previsualización"
                className="h-12 w-12 rounded-lg object-cover"
              />
              <span className="flex-1 truncate text-xs text-[#243447]">
                Foto lista para enviar
              </span>
              <button
                type="button"
                onClick={() => setAttachedImage(null)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-[#243447] hover:bg-[#F3F8FC]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          {sendError && (
            <p className="text-xs font-medium text-red-600">{sendError}</p>
          )}

          <div className="flex items-end gap-2">
            <label
              className="flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-xl border border-[#75AADB] bg-white text-[#16324F] transition hover:bg-[#F3F8FC]"
              title="Adjuntar foto (máx. 500 KB comprimida)"
            >
              {isUploadingImage ? (
                <Loader2 className="h-5 w-5 animate-spin text-[#75AADB]" />
              ) : (
                <ImagePlus className="h-5 w-5 text-[#75AADB]" />
              )}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleImageUpload}
                disabled={isUploadingImage}
                className="hidden"
              />
            </label>

            <textarea
              rows={1}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Escribí un mensaje... (Enter para enviar)"
              className="min-h-[44px] max-h-28 flex-1 resize-none rounded-xl border border-[#E2EAF2] bg-white px-3.5 py-2.5 text-sm text-[#243447] focus:border-[#75AADB] focus:outline-none"
            />

            <button
              type="button"
              onClick={() => void handleSend()}
              disabled={isSending || (!body.trim() && !attachedImage)}
              className="flex h-11 min-w-[44px] shrink-0 items-center justify-center gap-1.5 rounded-xl bg-[#16324F] px-4 text-sm font-bold text-white shadow-sm transition hover:bg-[#0F243A] disabled:opacity-50"
            >
              {isSending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              <span className="hidden sm:inline">Enviar</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
