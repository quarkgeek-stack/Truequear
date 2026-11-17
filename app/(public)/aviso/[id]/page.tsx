import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatARSFromCents } from "@/lib/commission";
import {
  CONDITION_LABELS,
  DEAL_TYPE_LABELS,
  LISTING_STATUS_LABELS,
  PROVINCE_LABELS,
} from "@/lib/constants";
import { ListingGallery } from "@/components/ListingGallery";
import { FavoriteButton } from "@/components/FavoriteButton";
import { ContactSellerButton } from "@/components/ContactSellerButton";
import {
  MapPin,
  Star,
  ShieldAlert,
  Repeat,
  CheckCircle2,
  Edit3,
  ArrowLeft,
} from "lucide-react";

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { id } = await params;
  const listing = await db.listing.findUnique({
    where: { id },
    select: {
      title: true,
      description: true,
      status: true,
      priceCents: true,
      dealType: true,
    },
  });

  if (!listing || listing.status === "ELIMINADA") {
    return {
      title: "Publicación no encontrada",
    };
  }

  const priceLabel =
    listing.dealType === "TRUEQUE"
      ? "Solo trueque"
      : formatARSFromCents(listing.priceCents);

  return {
    title: `${listing.title} (${priceLabel})`,
    description: listing.description.slice(0, 160),
  };
}

export default async function ListingDetailPage({ params }: PageProps) {
  const { id } = await params;
  const session = await auth();
  const userId = session?.user?.id;

  const listing = await db.listing.findUnique({
    where: { id },
    include: {
      images: { orderBy: { position: "asc" } },
      category: {
        include: {
          parent: true,
        },
      },
      owner: {
        select: {
          id: true,
          name: true,
          imageUrl: true,
          city: true,
          province: true,
          ratingAvg: true,
          ratingCount: true,
          createdAt: true,
        },
      },
    },
  });

  if (!listing || listing.status === "ELIMINADA") {
    notFound();
  }

  const [closedDealsCount, favoriteRecord, existingConversation] =
    await Promise.all([
      db.deal.count({
        where: {
          OR: [{ buyerId: listing.ownerId }, { sellerId: listing.ownerId }],
          status: { in: ["COMISION_PAGADA", "CERRADA"] },
        },
      }),
      userId
        ? db.favorite.findUnique({
            where: {
              userId_listingId: {
                userId,
                listingId: listing.id,
              },
            },
          })
        : Promise.resolve(null),
      userId && userId !== listing.ownerId
        ? db.conversation.findUnique({
            where: {
              listingId_buyerId: {
                listingId: listing.id,
                buyerId: userId,
              },
            },
            select: { id: true },
          })
        : Promise.resolve(null),
    ]);

  const isOwner = userId === listing.ownerId;
  const isAvailable = listing.status === "ACTIVA";
  const ownerInitials = listing.owner.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-2 text-xs text-[#243447]">
        <Link
          href="/"
          className="inline-flex min-h-[44px] items-center gap-1.5 font-bold text-[#16324F] hover:text-[#75AADB]"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Volver al listado</span>
        </Link>

        <div className="flex items-center gap-1.5 truncate">
          {listing.category.parent && (
            <>
              <Link
                href={`/?category=${listing.category.parent.slug}`}
                className="text-[#75AADB] hover:underline"
              >
                {listing.category.parent.name}
              </Link>
              <span>/</span>
            </>
          )}
          <Link
            href={`/?category=${listing.category.slug}`}
            className="font-semibold text-[#16324F] hover:underline"
          >
            {listing.category.name}
          </Link>
        </div>
      </div>

      {listing.status !== "ACTIVA" && (
        <div className="rounded-xl border border-[#75AADB] bg-white px-4 py-3 text-sm font-medium text-[#16324F]">
          Esta publicación está actualmente marcada como{" "}
          <span className="font-bold">
            {LISTING_STATUS_LABELS[listing.status]}
          </span>
          .
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Columna izquierda: Galería */}
        <div className="lg:col-span-7">
          <ListingGallery images={listing.images} title={listing.title} />
        </div>

        {/* Columna derecha: Precio, CTA y Vendedor */}
        <div className="space-y-5 lg:col-span-5">
          <div className="rounded-2xl border border-[#E2EAF2] bg-white p-5 shadow-sm space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-[#16324F] px-3 py-1 text-xs font-bold text-white">
                {DEAL_TYPE_LABELS[listing.dealType]}
              </span>
              <span className="rounded-full border border-[#E2EAF2] bg-[#F3F8FC] px-3 py-1 text-xs font-semibold text-[#243447]">
                {CONDITION_LABELS[listing.condition]}
              </span>
            </div>

            <h1 className="text-xl font-extrabold leading-snug text-[#16324F] sm:text-2xl">
              {listing.title}
            </h1>

            <div className="border-y border-[#E2EAF2] py-3">
              <p className="text-3xl font-black tracking-tight text-[#16324F]">
                {listing.dealType === "TRUEQUE"
                  ? "Solo trueque"
                  : formatARSFromCents(listing.priceCents)}
              </p>
              <p className="mt-1.5 flex items-center gap-1.5 text-sm text-[#243447]">
                <MapPin className="h-4 w-4 text-[#75AADB] shrink-0" />
                <span>
                  {listing.city}, {PROVINCE_LABELS[listing.province]}
                </span>
              </p>
            </div>

            {listing.tradeNotes && (
              <div className="rounded-xl border border-[#75AADB] bg-[#F3F8FC] p-3.5 text-sm">
                <p className="flex items-center gap-1.5 font-bold text-[#16324F]">
                  <Repeat className="h-4 w-4 text-[#75AADB]" />
                  <span>¿Qué acepta a cambio?</span>
                </p>
                <p className="mt-1 text-[#243447] whitespace-pre-line">
                  {listing.tradeNotes}
                </p>
              </div>
            )}

            {/* Botones de acción */}
            <div className="space-y-2.5 pt-1">
              {isOwner ? (
                <div className="space-y-2">
                  <div className="rounded-xl border border-[#E2EAF2] bg-[#F3F8FC] p-3 text-center text-xs font-semibold text-[#16324F]">
                    Esta publicación es tuya
                  </div>
                  <Link
                    href={`/editar/${listing.id}`}
                    className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl border border-[#75AADB] bg-white px-4 py-2.5 text-sm font-bold text-[#16324F] hover:bg-[#F3F8FC]"
                  >
                    <Edit3 className="h-4 w-4 text-[#75AADB]" />
                    <span>Editar aviso</span>
                  </Link>
                  <Link
                    href="/mis-publicaciones"
                    className="flex min-h-[44px] w-full items-center justify-center rounded-xl bg-[#16324F] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#0F243A]"
                  >
                    Gestionar estado en Mis cosas
                  </Link>
                </div>
              ) : (
                <>
                  <ContactSellerButton
                    listingId={listing.id}
                    existingConversationId={existingConversation?.id ?? null}
                    isAuthenticated={Boolean(userId)}
                    disabled={!isAvailable && !existingConversation}
                  />
                  <FavoriteButton
                    listingId={listing.id}
                    initialFavorited={Boolean(favoriteRecord)}
                    isAuthenticated={Boolean(userId)}
                    variant="full"
                  />
                </>
              )}
            </div>
          </div>

          {/* Tarjeta del Vendedor */}
          <div className="rounded-2xl border border-[#E2EAF2] bg-white p-5 shadow-sm space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-[#75AADB]">
              Quién publica
            </h2>
            <div className="flex items-center gap-3.5">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full border border-[#75AADB] bg-[#16324F] text-sm font-bold text-white">
                {listing.owner.imageUrl ? (
                  <img
                    src={listing.owner.imageUrl}
                    alt={listing.owner.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span>{ownerInitials || "U"}</span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-base font-bold text-[#16324F]">
                  {listing.owner.name}
                </p>
                <div className="mt-0.5 flex flex-wrap items-center gap-3 text-xs text-[#243447]">
                  <span className="inline-flex items-center gap-1 font-bold text-[#16324F]">
                    <Star className="h-3.5 w-3.5 fill-[#F6C445] text-[#F6C445]" />
                    {listing.owner.ratingCount > 0
                      ? `${listing.owner.ratingAvg.toFixed(1)} (${listing.owner.ratingCount})`
                      : "Sin calificaciones aún"}
                  </span>
                  <span className="inline-flex items-center gap-1 text-[#243447]">
                    <CheckCircle2 className="h-3.5 w-3.5 text-[#75AADB]" />
                    {closedDealsCount}{" "}
                    {closedDealsCount === 1
                      ? "operación cerrada"
                      : "operaciones cerradas"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Aviso de seguridad */}
          <div className="rounded-2xl border border-[#E2EAF2] bg-white p-4 text-xs text-[#243447] space-y-1">
            <p className="flex items-center gap-1.5 font-bold text-[#16324F]">
              <ShieldAlert className="h-4 w-4 text-[#75AADB] shrink-0" />
              <span>Trato directo entre personas</span>
            </p>
            <p>
              Encontrarse en un lugar público y revisar el producto antes de pagar o permutar. TruequeAR no interviene en el envío ni retiene el dinero del producto.
            </p>
          </div>
        </div>
      </div>

      {/* Descripción completa */}
      <section className="rounded-2xl border border-[#E2EAF2] bg-white p-5 shadow-sm">
        <h2 className="mb-3 text-base font-bold text-[#16324F]">
          Descripción del producto
        </h2>
        <p className="whitespace-pre-line text-sm leading-relaxed text-[#243447]">
          {listing.description}
        </p>
      </section>
    </div>
  );
}
