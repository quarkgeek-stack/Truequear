import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { isMercadoPagoConfigured } from "@/lib/mercadopago";
import { AuctionDetailClient } from "@/components/AuctionDetailClient";
import { PROVINCE_LABELS } from "@/lib/constants";
import { AuctionStatus, Province } from "@prisma/client";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

interface AuctionDetailPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({
  params,
}: AuctionDetailPageProps): Promise<Metadata> {
  const { id } = await params;
  const auction = await db.auction.findUnique({
    where: { id },
    select: {
      title: true,
      description: true,
      images: { orderBy: { position: "asc" }, take: 1 },
    },
  });

  if (!auction) {
    return { title: "Remate no encontrado" };
  }

  return {
    title: `Remate en vivo: ${auction.title}`,
    description: auction.description.slice(0, 150),
    openGraph: {
      title: `Remate en vivo: ${auction.title}`,
      description: "Pujá en tiempo real en TruequeAR sin custodia ni intermediarios.",
      images: auction.images[0]?.url ? [auction.images[0].url] : [],
    },
  };
}

export default async function AuctionDetailPage({
  params,
}: AuctionDetailPageProps) {
  const { id } = await params;
  const session = await auth();
  const currentUserId = session?.user?.id ?? null;

  const [auction, settings] = await Promise.all([
    db.auction.findUnique({
      where: { id },
      include: {
        category: { select: { name: true } },
        images: { orderBy: { position: "asc" } },
        seller: {
          select: { id: true, name: true, city: true, province: true },
        },
        leader: { select: { id: true, name: true } },
      },
    }),
    db.platformSetting.findUnique({ where: { id: "default" } }),
  ]);

  if (!auction) {
    notFound();
  }

  // Si venció pero sigue ACTIVO en DB, actualizarlo
  let currentStatus = auction.status;
  if (
    currentStatus === AuctionStatus.ACTIVO &&
    auction.endAt.getTime() <= Date.now()
  ) {
    if (auction.bidCount === 0 || !auction.leaderId) {
      currentStatus = AuctionStatus.CERRADO_SIN_PUJAS;
    } else if (
      auction.reserveCents &&
      auction.currentCents < auction.reserveCents
    ) {
      currentStatus = AuctionStatus.CERRADO_SIN_RESERVA;
    } else {
      currentStatus = AuctionStatus.CERRADO_VENDIDO;
    }

    await db.auction.update({
      where: { id: auction.id },
      data: { status: currentStatus },
    });
  }

  const sellerLocation =
    auction.seller.city && auction.seller.province
      ? `${auction.seller.city}, ${PROVINCE_LABELS[auction.seller.province as Province]}`
      : "Argentina";

  return (
    <AuctionDetailClient
      initialAuction={{
        id: auction.id,
        title: auction.title,
        description: auction.description,
        condition: auction.condition,
        categoryName: auction.category.name,
        shipping: auction.shipping,
        baseCents: auction.baseCents,
        reserveCents: currentUserId === auction.sellerId ? auction.reserveCents : null,
        currentCents: auction.currentCents,
        bidCount: auction.bidCount,
        startAt: auction.startAt.toISOString(),
        endAt: auction.endAt.toISOString(),
        status: currentStatus,
        sellerId: auction.seller.id,
        sellerName: auction.seller.name,
        sellerLocation,
        leaderId: auction.leaderId,
        leaderName: auction.leader?.name ?? null,
        images: auction.images.map((img) => ({
          url: img.url,
          position: img.position,
        })),
      }}
      currentUserId={currentUserId}
      commissionBps={settings?.commissionBps ?? 400}
      isMPConfigured={isMercadoPagoConfigured()}
    />
  );
}
