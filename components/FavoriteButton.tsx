"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Heart } from "lucide-react";
import { toggleFavoriteAction } from "@/lib/actions";

interface FavoriteButtonProps {
  listingId: string;
  initialFavorited: boolean;
  isAuthenticated: boolean;
  variant?: "icon" | "full";
}

export function FavoriteButton({
  listingId,
  initialFavorited,
  isAuthenticated,
  variant = "icon",
}: FavoriteButtonProps) {
  const router = useRouter();
  const [favorited, setFavorited] = useState(initialFavorited);
  const [isPending, startTransition] = useTransition();

  function handleClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();

    if (!isAuthenticated) {
      router.push("/login");
      return;
    }

    const nextState = !favorited;
    setFavorited(nextState);

    startTransition(async () => {
      const res = await toggleFavoriteAction(listingId);
      if (!res.ok) {
        setFavorited(!nextState);
      } else if (res.data) {
        setFavorited(res.data.favorited);
      }
    });
  }

  if (variant === "full") {
    return (
      <button
        type="button"
        onClick={handleClick}
        disabled={isPending}
        className={`flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-bold transition ${
          favorited
            ? "border-[#16324F] bg-[#F3F8FC] text-[#16324F]"
            : "border-[#75AADB] bg-white text-[#16324F] hover:bg-[#F3F8FC]"
        }`}
      >
        <Heart
          className={`h-5 w-5 ${
            favorited ? "fill-[#75AADB] text-[#75AADB]" : "text-[#75AADB]"
          }`}
        />
        <span>{favorited ? "En tus favoritos" : "Guardar en favoritos"}</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      aria-label={favorited ? "Quitar de favoritos" : "Agregar a favoritos"}
      className="flex h-11 w-11 items-center justify-center rounded-full border border-[#E2EAF2] bg-white/95 text-[#16324F] shadow-sm transition hover:border-[#75AADB]"
    >
      <Heart
        className={`h-5 w-5 transition ${
          favorited
            ? "fill-[#75AADB] text-[#75AADB] scale-110"
            : "text-[#16324F]"
        }`}
      />
    </button>
  );
}
