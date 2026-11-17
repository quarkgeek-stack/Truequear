"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { MessageSquare, Loader2 } from "lucide-react";
import { startOrGetConversationAction } from "@/lib/actions";

interface ContactSellerButtonProps {
  listingId: string;
  existingConversationId: string | null;
  isAuthenticated: boolean;
  disabled?: boolean;
}

export function ContactSellerButton({
  listingId,
  existingConversationId,
  isAuthenticated,
  disabled = false,
}: ContactSellerButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleClick() {
    setError(null);

    if (!isAuthenticated) {
      router.push("/login");
      return;
    }

    if (existingConversationId) {
      router.push(`/chat/${existingConversationId}`);
      return;
    }

    startTransition(async () => {
      const res = await startOrGetConversationAction(listingId);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      if (res.data?.conversationId) {
        router.push(`/chat/${res.data.conversationId}`);
      }
    });
  }

  return (
    <div className="w-full space-y-2">
      <button
        type="button"
        onClick={handleClick}
        disabled={isPending || disabled}
        className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl bg-[#16324F] px-5 py-3 text-base font-bold text-white shadow-sm transition hover:bg-[#0F243A] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Abriendo chat...</span>
          </>
        ) : (
          <>
            <MessageSquare className="h-5 w-5 text-[#F6C445]" />
            <span>
              {existingConversationId ? "Seguir charlando" : "Me interesa"}
            </span>
          </>
        )}
      </button>
      {error && <p className="text-xs font-medium text-red-600">{error}</p>}
    </div>
  );
}
