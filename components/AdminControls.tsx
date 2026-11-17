"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ListingStatus } from "@prisma/client";
import {
  updatePlatformSettingAction,
  updateListingStatusAction,
} from "@/lib/actions";
import { formatBpsPercent } from "@/lib/commission";
import {
  CheckCircle2,
  Loader2,
  PauseCircle,
  PlayCircle,
  Trash2,
} from "lucide-react";

interface AdminCommissionFormProps {
  initialBps: number;
  initialMinCents: number;
  initialMaxCents: number | null;
}

export function AdminCommissionForm({
  initialBps,
  initialMinCents,
  initialMaxCents,
}: AdminCommissionFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [bps, setBps] = useState<number>(initialBps);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(
    null
  );

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    startTransition(async () => {
      const res = await updatePlatformSettingAction({
        commissionBps: Number(bps),
        minCommissionCents: initialMinCents,
        maxCommissionCents: initialMaxCents,
      });
      if (!res.ok) {
        setMsg({ type: "err", text: res.error });
        return;
      }
      setMsg({
        type: "ok",
        text: `Comisión actualizada a ${bps} bps (${formatBpsPercent(
          bps
        )}). Las operaciones anteriores mantienen su comisión congelada.`,
      });
      router.refresh();
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl border border-[#E2EAF2] bg-white p-5 shadow-sm space-y-4"
    >
      <div>
        <h2 className="text-base font-extrabold text-[#16324F]">
          Configuración de comisión de plataforma
        </h2>
        <p className="text-xs text-[#243447]">
          Definí la comisión en basis points (100 bps = 1%, 400 bps = 4%, 800 bps = 8%). El valor vigente se congela como snapshot en cada nuevo trato acordado.
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label
            htmlFor="commissionBps"
            className="mb-1 block text-xs font-semibold text-[#16324F]"
          >
            Basis points (100 a 800)
          </label>
          <input
            id="commissionBps"
            type="number"
            min={100}
            max={800}
            step={10}
            value={bps}
            onChange={(e) => setBps(Number(e.target.value))}
            className="min-h-[44px] w-40 rounded-xl border border-[#E2EAF2] px-3.5 py-2 text-sm font-bold text-[#16324F] focus:border-[#75AADB] focus:outline-none"
          />
        </div>

        <div className="flex min-h-[44px] items-center rounded-xl border border-[#E2EAF2] bg-[#F3F8FC] px-3.5 py-2 text-xs font-extrabold text-[#16324F]">
          Equivale a: {formatBpsPercent(bps || 0)}
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-[#16324F] px-5 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-[#0F243A] disabled:opacity-60"
        >
          {isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Guardando...</span>
            </>
          ) : (
            <span>Guardar comisión</span>
          )}
        </button>
      </div>

      {msg && (
        <div
          className={`flex items-center gap-2 rounded-xl px-3.5 py-2.5 text-xs font-semibold ${
            msg.type === "ok"
              ? "border border-[#75AADB] bg-[#F3F8FC] text-[#16324F]"
              : "border border-red-200 bg-red-50 text-red-700"
          }`}
        >
          {msg.type === "ok" && (
            <CheckCircle2 className="h-4 w-4 shrink-0 text-[#75AADB]" />
          )}
          <span>{msg.text}</span>
        </div>
      )}
    </form>
  );
}

export function AdminListingRowActions({
  listingId,
  status,
}: {
  listingId: string;
  status: ListingStatus;
}) {
  const [isPending, startTransition] = useTransition();

  function setStatus(nextStatus: ListingStatus) {
    startTransition(async () => {
      await updateListingStatusAction({ listingId, status: nextStatus });
    });
  }

  return (
    <div className="flex items-center gap-1.5">
      {status === "ACTIVA" ? (
        <button
          type="button"
          disabled={isPending}
          onClick={() => setStatus("PAUSADA")}
          className="inline-flex min-h-[44px] items-center gap-1 rounded-lg border border-[#75AADB] bg-white px-2.5 py-1.5 text-xs font-bold text-[#16324F] hover:bg-[#F3F8FC] disabled:opacity-50"
        >
          <PauseCircle className="h-3.5 w-3.5 text-[#75AADB]" />
          <span>Pausar</span>
        </button>
      ) : (
        <button
          type="button"
          disabled={isPending}
          onClick={() => setStatus("ACTIVA")}
          className="inline-flex min-h-[44px] items-center gap-1 rounded-lg bg-[#16324F] px-2.5 py-1.5 text-xs font-bold text-white hover:bg-[#0F243A] disabled:opacity-50"
        >
          <PlayCircle className="h-3.5 w-3.5 text-[#F6C445]" />
          <span>Activar</span>
        </button>
      )}

      <button
        type="button"
        disabled={isPending}
        onClick={() => setStatus("ELIMINADA")}
        className="inline-flex min-h-[44px] items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-2.5 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100 disabled:opacity-50"
      >
        <Trash2 className="h-3.5 w-3.5" />
        <span>Eliminar</span>
      </button>
    </div>
  );
}
