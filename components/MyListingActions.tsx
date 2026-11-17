"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { ListingStatus } from "@prisma/client";
import { updateListingStatusAction } from "@/lib/actions";
import {
  Edit3,
  PauseCircle,
  PlayCircle,
  BookmarkCheck,
  CheckCircle2,
  Trash2,
  Loader2,
} from "lucide-react";

interface MyListingActionsProps {
  listingId: string;
  currentStatus: ListingStatus;
}

export function MyListingActions({
  listingId,
  currentStatus,
}: MyListingActionsProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function changeStatus(status: ListingStatus) {
    setError(null);
    startTransition(async () => {
      const res = await updateListingStatusAction({ listingId, status });
      if (!res.ok) {
        setError(res.error);
      }
    });
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <Link
          href={`/editar/${listingId}`}
          className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border border-[#75AADB] bg-white px-3.5 py-2 text-xs font-bold text-[#16324F] hover:bg-[#F3F8FC]"
        >
          <Edit3 className="h-3.5 w-3.5 text-[#75AADB]" />
          <span>Editar</span>
        </Link>

        {currentStatus !== "ACTIVA" && (
          <button
            type="button"
            disabled={isPending}
            onClick={() => changeStatus("ACTIVA")}
            className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl bg-[#16324F] px-3.5 py-2 text-xs font-bold text-white hover:bg-[#0F243A] disabled:opacity-50"
          >
            <PlayCircle className="h-3.5 w-3.5 text-[#F6C445]" />
            <span>Activar</span>
          </button>
        )}

        {currentStatus === "ACTIVA" && (
          <button
            type="button"
            disabled={isPending}
            onClick={() => changeStatus("PAUSADA")}
            className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border border-[#75AADB] bg-white px-3.5 py-2 text-xs font-bold text-[#16324F] hover:bg-[#F3F8FC] disabled:opacity-50"
          >
            <PauseCircle className="h-3.5 w-3.5 text-[#75AADB]" />
            <span>Pausar</span>
          </button>
        )}

        {currentStatus !== "RESERVADA" && currentStatus !== "VENDIDA" && (
          <button
            type="button"
            disabled={isPending}
            onClick={() => changeStatus("RESERVADA")}
            className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border border-[#75AADB] bg-white px-3.5 py-2 text-xs font-bold text-[#16324F] hover:bg-[#F3F8FC] disabled:opacity-50"
          >
            <BookmarkCheck className="h-3.5 w-3.5 text-[#75AADB]" />
            <span>Marcar reservado</span>
          </button>
        )}

        {currentStatus !== "VENDIDA" && (
          <button
            type="button"
            disabled={isPending}
            onClick={() => changeStatus("VENDIDA")}
            className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl bg-[#16324F] px-3.5 py-2 text-xs font-bold text-white hover:bg-[#0F243A] disabled:opacity-50"
          >
            <CheckCircle2 className="h-3.5 w-3.5 text-[#F6C445]" />
            <span>Marcar vendido</span>
          </button>
        )}

        <button
          type="button"
          disabled={isPending}
          onClick={() => changeStatus("ELIMINADA")}
          className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2 text-xs font-semibold text-red-700 hover:bg-red-100 disabled:opacity-50"
        >
          {isPending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Trash2 className="h-3.5 w-3.5" />
          )}
          <span>Borrar</span>
        </button>
      </div>

      {error && <p className="text-xs font-medium text-red-600">{error}</p>}
    </div>
  );
}
