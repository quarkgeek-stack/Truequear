import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatARSFromCents } from "@/lib/commission";
import {
  DEAL_TYPE_LABELS,
  LISTING_STATUS_LABELS,
  PROVINCE_LABELS,
} from "@/lib/constants";
import { MyListingActions } from "@/components/MyListingActions";
import { PlusCircle, Package } from "lucide-react";

export const metadata = {
  title: "Tus publicaciones",
};

export default async function MyListingsPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const listings = await db.listing.findMany({
    where: {
      ownerId: session.user.id,
      status: { not: "ELIMINADA" },
    },
    orderBy: { createdAt: "desc" },
    include: {
      images: { orderBy: { position: "asc" }, take: 1 },
      category: { select: { name: true } },
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-[#16324F]">
            Tus publicaciones
          </h1>
          <p className="text-sm text-[#243447]">
            Administrá tus avisos activos, pausados, reservados o vendidos.
          </p>
        </div>

        <Link
          href="/publicar"
          className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-[#16324F] px-4 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-[#0F243A]"
        >
          <PlusCircle className="h-4 w-4 text-[#F6C445]" />
          <span>Nueva publicación</span>
        </Link>
      </div>

      {listings.length === 0 ? (
        <div className="rounded-2xl border border-[#E2EAF2] bg-white p-10 text-center space-y-3 shadow-sm">
          <Package className="mx-auto h-10 w-10 text-[#75AADB]" />
          <p className="text-base font-bold text-[#16324F]">
            Todavía no publicaste nada
          </p>
          <p className="text-sm text-[#243447]">
            Subí eso que tenés guardado en casa y empezá a recibir ofertas de compra o trueque.
          </p>
          <div className="pt-2">
            <Link
              href="/publicar"
              className="inline-flex min-h-[44px] items-center justify-center rounded-xl bg-[#16324F] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#0F243A]"
            >
              Publicá tu primer aviso
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {listings.map((item) => {
            const thumb = item.images[0]?.url;

            return (
              <div
                key={item.id}
                className="flex flex-col justify-between gap-4 rounded-2xl border border-[#E2EAF2] bg-white p-4 shadow-sm sm:flex-row sm:items-center"
              >
                <div className="flex items-start gap-3.5">
                  <Link
                    href={`/aviso/${item.id}`}
                    className="h-20 w-20 shrink-0 overflow-hidden rounded-xl border border-[#E2EAF2] bg-[#F3F8FC]"
                  >
                    {thumb ? (
                      <img
                        src={thumb}
                        alt={item.title}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-xs font-bold text-[#16324F]">
                        Sin foto
                      </div>
                    )}
                  </Link>

                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-[#16324F] px-2.5 py-0.5 text-xs font-bold text-white">
                        {LISTING_STATUS_LABELS[item.status]}
                      </span>
                      <span className="text-xs font-medium text-[#243447]">
                        {DEAL_TYPE_LABELS[item.dealType]} • {item.category.name}
                      </span>
                    </div>

                    <Link
                      href={`/aviso/${item.id}`}
                      className="block text-base font-bold text-[#16324F] hover:text-[#75AADB]"
                    >
                      {item.title}
                    </Link>

                    <p className="text-sm font-extrabold text-[#16324F]">
                      {item.dealType === "TRUEQUE"
                        ? "Solo trueque"
                        : formatARSFromCents(item.priceCents)}{" "}
                      <span className="font-normal text-xs text-[#243447]">
                        • {item.city}, {PROVINCE_LABELS[item.province]}
                      </span>
                    </p>
                  </div>
                </div>

                <div className="border-t border-[#E2EAF2] pt-3 sm:border-t-0 sm:pt-0">
                  <MyListingActions
                    listingId={item.id}
                    currentStatus={item.status}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
