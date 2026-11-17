import { db } from "./db";
import { AuctionStatus, Prisma } from "@prisma/client";
import { formatARSFromCents } from "./commission";

/**
 * Calcula el monto mínimo requerido para la próxima puja.
 * Regla:
 * - Primera puja: igual al precio base.
 * - Siguientes: max(puja actual + 500 pesos, puja actual + 5%), redondeado a pesos enteros (centavos en múltiplos de 100).
 */
export function calcMinNextBid(
  currentCents: number,
  bidCount: number,
  baseCents: number
): number {
  if (bidCount === 0) {
    return baseCents;
  }

  let increment = Math.max(500_00, Math.round(currentCents * 0.05));
  const remainder = increment % 100;
  if (remainder !== 0) {
    increment += 100 - remainder;
  }

  return currentCents + increment;
}

/**
 * Cierra remates vencidos según su fecha de fin y estado actual.
 * Llamado por el cron y también antes de consultar el detalle de un remate.
 */
export async function closeExpiredAuctions(): Promise<number> {
  const now = new Date();

  const expired = await db.auction.findMany({
    where: {
      status: AuctionStatus.ACTIVO,
      endAt: { lte: now },
    },
    select: {
      id: true,
      currentCents: true,
      reserveCents: true,
      bidCount: true,
      leaderId: true,
    },
  });

  let closedCount = 0;

  for (const item of expired) {
    let nextStatus: AuctionStatus;

    if (item.bidCount === 0 || !item.leaderId) {
      nextStatus = AuctionStatus.CERRADO_SIN_PUJAS;
    } else if (item.reserveCents && item.currentCents < item.reserveCents) {
      nextStatus = AuctionStatus.CERRADO_SIN_RESERVA;
    } else {
      nextStatus = AuctionStatus.CERRADO_VENDIDO;
    }

    await db.auction.update({
      where: { id: item.id },
      data: { status: nextStatus },
    });
    closedCount++;
  }

  return closedCount;
}

export interface PlaceBidInput {
  auctionId: string;
  bidderId: string;
  amountCents: number;
  autoMaxCents?: number | null;
}

export interface PlaceBidResult {
  ok: boolean;
  error?: string;
  currentCents?: number;
  bidCount?: number;
  leaderId?: string | null;
  endAt?: string;
  extended?: boolean;
}

/**
 * Procesa una puja de usuario dentro de una transacción serializable.
 * Implementa anti-snipe y resolución de puja automática en la misma transacción.
 */
export async function placeBidInAuction(
  input: PlaceBidInput
): Promise<PlaceBidResult> {
  const { auctionId, bidderId, amountCents, autoMaxCents } = input;

  return await db.$transaction(async (tx) => {
    const auction = await tx.auction.findUnique({
      where: { id: auctionId },
      select: {
        id: true,
        sellerId: true,
        leaderId: true,
        currentCents: true,
        baseCents: true,
        bidCount: true,
        status: true,
        endAt: true,
        extensionCount: true,
      },
    });

    if (!auction) {
      return { ok: false, error: "El remate no existe." };
    }

    const now = new Date();
    if (auction.status !== AuctionStatus.ACTIVO || auction.endAt.getTime() <= now.getTime()) {
      return { ok: false, error: "El remate ya finalizó y no acepta más ofertas." };
    }

    if (auction.sellerId === bidderId) {
      return { ok: false, error: "No podés pujar en tu propia publicación." };
    }

    if (auction.leaderId === bidderId) {
      return { ok: false, error: "Ya vas ganando el remate. No podés autosuperarte." };
    }

    const minRequired = calcMinNextBid(
      auction.currentCents,
      auction.bidCount,
      auction.baseCents
    );

    if (amountCents < minRequired) {
      return {
        ok: false,
        error: `La oferta mínima permitida es de ${formatARSFromCents(minRequired)}.`,
      };
    }

    if (autoMaxCents && autoMaxCents < amountCents) {
      return {
        ok: false,
        error: "El tope de puja automática debe ser igual o mayor a la oferta inicial.",
      };
    }

    // Buscar si el líder anterior tenía puja automática activa
    let prevLeaderAutoMax: number | null = null;
    if (auction.leaderId) {
      const prevBid = await tx.bid.findFirst({
        where: {
          auctionId: auction.id,
          bidderId: auction.leaderId,
          autoMaxCents: { not: null },
        },
        orderBy: { createdAt: "desc" },
        select: { autoMaxCents: true },
      });
      if (prevBid?.autoMaxCents && prevBid.autoMaxCents > auction.currentCents) {
        prevLeaderAutoMax = prevBid.autoMaxCents;
      }
    }

    const effectiveNewMax = Math.max(amountCents, autoMaxCents ?? amountCents);

    let newCurrentCents = amountCents;
    let newLeaderId: string = bidderId;
    let newBidCount = auction.bidCount + 1;

    if (!prevLeaderAutoMax || prevLeaderAutoMax < minRequired) {
      // Caso 1: El líder anterior no tiene puja automática activa
      await tx.bid.create({
        data: {
          auctionId: auction.id,
          bidderId,
          amountCents,
          autoMaxCents: autoMaxCents ?? null,
        },
      });
      newCurrentCents = amountCents;
      newLeaderId = bidderId;
    } else if (prevLeaderAutoMax >= effectiveNewMax) {
      // Caso 2: El líder anterior tenía un tope mayor o igual. El líder anterior contraoferta y mantiene el liderazgo.
      // Se registra la puja del nuevo usuario a su máximo
      await tx.bid.create({
        data: {
          auctionId: auction.id,
          bidderId,
          amountCents: effectiveNewMax,
          autoMaxCents: autoMaxCents ?? null,
        },
      });

      // Se registra la contraoferta mínima automática a nombre del líder anterior
      const counterMin = calcMinNextBid(effectiveNewMax, 1, auction.baseCents);
      const counterAmount = Math.min(prevLeaderAutoMax, counterMin);

      await tx.bid.create({
        data: {
          auctionId: auction.id,
          bidderId: auction.leaderId!,
          amountCents: counterAmount,
          autoMaxCents: prevLeaderAutoMax,
        },
      });

      newCurrentCents = counterAmount;
      newLeaderId = auction.leaderId!;
      newBidCount = auction.bidCount + 2;
    } else {
      // Caso 3: El nuevo usuario superó el tope del líder anterior.
      // Primero el líder anterior llega hasta su tope
      await tx.bid.create({
        data: {
          auctionId: auction.id,
          bidderId: auction.leaderId!,
          amountCents: prevLeaderAutoMax,
          autoMaxCents: prevLeaderAutoMax,
        },
      });

      // El nuevo usuario toma la delantera por el mínimo necesario sobre el tope del anterior
      const stepOverPrev = calcMinNextBid(prevLeaderAutoMax, 1, auction.baseCents);
      const winningAmount = Math.min(
        effectiveNewMax,
        Math.max(amountCents, stepOverPrev)
      );

      await tx.bid.create({
        data: {
          auctionId: auction.id,
          bidderId,
          amountCents: winningAmount,
          autoMaxCents: autoMaxCents ?? null,
        },
      });

      newCurrentCents = winningAmount;
      newLeaderId = bidderId;
      newBidCount = auction.bidCount + 2;
    }

    // Regla anti-snipe: si entra en los últimos 2 minutos, extender 3 minutos (máx 12 veces)
    const remainingMs = auction.endAt.getTime() - now.getTime();
    let updatedEndAt = auction.endAt;
    let updatedExtensionCount = auction.extensionCount;
    let didExtend = false;

    if (remainingMs < 2 * 60 * 1000 && auction.extensionCount < 12) {
      updatedEndAt = new Date(auction.endAt.getTime() + 3 * 60 * 1000);
      updatedExtensionCount = auction.extensionCount + 1;
      didExtend = true;
    }

    await tx.auction.update({
      where: { id: auction.id },
      data: {
        currentCents: newCurrentCents,
        leaderId: newLeaderId,
        bidCount: newBidCount,
        endAt: updatedEndAt,
        extensionCount: updatedExtensionCount,
      },
    });

    return {
      ok: true,
      currentCents: newCurrentCents,
      bidCount: newBidCount,
      leaderId: newLeaderId,
      endAt: updatedEndAt.toISOString(),
      extended: didExtend,
    };
  });
}
