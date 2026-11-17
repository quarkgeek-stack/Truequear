export interface CommissionParams {
  kind: "VENTA" | "TRUEQUE";
  agreedPriceCents: number | null | undefined;
  commissionBps: number;
  minCommissionCents?: number;
  maxCommissionCents?: number | null;
}

export function calculateCommissionCents({
  kind,
  agreedPriceCents,
  commissionBps,
  minCommissionCents = 0,
  maxCommissionCents = null,
}: CommissionParams): number {
  if (kind === "TRUEQUE") {
    return 0;
  }
  if (!agreedPriceCents || agreedPriceCents <= 0 || commissionBps <= 0) {
    return 0;
  }

  let commission = Math.round((agreedPriceCents * commissionBps) / 10000);

  if (minCommissionCents > 0 && commission < minCommissionCents) {
    commission = minCommissionCents;
  }

  if (maxCommissionCents !== null && maxCommissionCents !== undefined && maxCommissionCents > 0) {
    if (commission > maxCommissionCents) {
      commission = maxCommissionCents;
    }
  }

  return commission;
}

export function formatARSFromCents(cents: number | null | undefined): string {
  if (cents === null || cents === undefined) return "Solo trueque";
  const pesos = Math.round(cents / 100);
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
    minimumFractionDigits: 0,
  }).format(pesos);
}

export function formatNumberARS(pesos: number): string {
  return new Intl.NumberFormat("es-AR", {
    maximumFractionDigits: 0,
  }).format(pesos);
}

export function formatBpsPercent(bps: number): string {
  const pct = bps / 100;
  return Number.isInteger(pct) ? `${pct}%` : `${pct.toFixed(2).replace(".", ",")}%`;
}

export function canCreateConversation(buyerId: string, ownerId: string): boolean {
  if (!buyerId || !ownerId) return false;
  return buyerId !== ownerId;
}
