import Link from "next/link";
import { Condition, DealType, ListingStatus, Province } from "@prisma/client";
import { formatARSFromCents } from "@/lib/commission";
import {
  CONDITION_LABELS,
  DEAL_TYPE_LABELS,
  PROVINCE_LABELS,
} from "@/lib/constants";
import { FavoriteButton } from "@/components/FavoriteButton";
import { MapPin, Repeat } from "lucide-react";

export interface ListingCardItem {
  id: string;
  title: string;
  priceCents: number | null;
  dealType: DealType;
  condition: Condition;
  province: Province;
  city: string;
  status?: ListingStatus;
  images: Array<{ url: string }>;
  category?: { name: string };
}

interface ListingCardProps {
  listing: ListingCardItem;
  isAuthenticated: boolean;
  isFavorited: boolean;
}

export function ListingCard({
  listing,
  isAuthenticated,
  isFavorited,
}: ListingCardProps) {
  const mainImage = listing.images[0]?.url;

  return (
    <div className="group relative flex flex-col overflow-hidden rounded-[16px] border border-[#C5D7E8] bg-white shadow-[0_6px_18px_rgba(16,40,63,0.06)] transition duration-150 hover:-translate-y-0.5 hover:shadow-[0_12px_28px_rgba(16,40,63,0.14)]">
      <div className="relative aspect-square w-full overflow-hidden bg-[#F4F8FC]">
        <Link href={`/aviso/${listing.id}`} className="block h-full w-full">
          {mainImage ? (
            <img
              src={mainImage}
              alt={listing.title}
              loading="lazy"
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-[#F4F8FC] text-xs font-semibold text-[#2C4260]">
              Sin foto
            </div>
          )}
        </Link>

        <div className="pointer-events-none absolute left-2.5 top-2.5 flex flex-wrap gap-1.5">
          <span className="inline-flex items-center gap-1 rounded-full bg-[#16324F] px-2.5 py-1 text-xs font-semibold text-white">
            {listing.dealType !== "VENTA" && (
              <Repeat className="h-3 w-3 text-[#F6C445]" />
            )}
            {DEAL_TYPE_LABELS[listing.dealType]}
          </span>
        </div>

        <div className="absolute right-2 top-2 z-10">
          <FavoriteButton
            listingId={listing.id}
            initialFavorited={isFavorited}
            isAuthenticated={isAuthenticated}
          />
        </div>
      </div>

      <Link
        href={`/aviso/${listing.id}`}
        className="flex flex-1 flex-col justify-between p-3.5"
      >
        <div>
          <div className="mb-1 flex items-center justify-between gap-2 text-xs text-[#2C4260]">
            <span>{CONDITION_LABELS[listing.condition]}</span>
            {listing.category && (
              <span className="truncate font-semibold text-[#2C4260]">
                {listing.category.name}
              </span>
            )}
          </div>

          <h3 className="line-clamp-2 min-h-[2.5rem] text-sm font-bold leading-5 text-[#10283F] group-hover:text-[#16324F]">
            {listing.title}
          </h3>
        </div>

        <div className="mt-3 border-t border-[#D6E8F7] pt-2">
          <p className="text-[20px] font-bold leading-tight tracking-tight text-[#10283F]">
            {listing.dealType === "TRUEQUE"
              ? "Solo trueque"
              : formatARSFromCents(listing.priceCents)}
          </p>

          <p className="mt-1 flex items-center gap-1 truncate text-xs text-[#2C4260]">
            <MapPin className="h-3.5 w-3.5 shrink-0 text-[#16324F]" />
            <span className="truncate">
              {listing.city}, {PROVINCE_LABELS[listing.province]}
            </span>
          </p>
        </div>
      </Link>
    </div>
  );
}
