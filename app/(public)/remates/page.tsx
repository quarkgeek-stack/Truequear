import Link from "next/link";
import { db } from "@/lib/db";
import { formatARSFromCents } from "@/lib/commission";
import { closeExpiredAuctions } from "@/lib/auction";
import { AuctionStatus, Prisma } from "@prisma/client";
import {
  Gavel,
  PlusCircle,
  Clock,
  Flame,
  Sparkles,
  Package,
  ArrowRight,
} from "lucide-react";

export const metadata = {
  title: "Remates en Vivo",
  description: "Pujá y encontrá remates en vivo de cosas usadas en TruequeAR.",
};

export const dynamic = "force-dynamic";

interface RematesPageProps {
  searchParams: Promise<{
    sort?: string;
  }>;
}

function formatRemainingTime(endAt: Date): { text: string; urgent: boolean } {
  const diffMs = endAt.getTime() - Date.now();
  if (diffMs <= 0) {
    return { text: "Finalizado", urgent: true };
  }

  const minutes = Math.floor(diffMs / (60 * 1000));
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    const remHours = hours % 24;
    return { text: `Termina en ${days}d ${remHours}h`, urgent: false };
  }

  if (hours > 0) {
    const remMins = minutes % 60;
    return { text: `Termina en ${hours}h ${remMins}m`, urgent: hours < 2 };
  }

  return { text: `Termina en ${minutes} min`, urgent: minutes < 10 };
}

export default async function RematesListPage({ searchParams }: RematesPageProps) {
  // Asegurar cierre de remates vencidos
  await closeExpiredAuctions();

  const { sort = "pronto" } = await searchParams;

  const where: Prisma.AuctionWhereInput = {
    status: AuctionStatus.ACTIVO,
    endAt: { gt: new Date() },
  };

  let orderBy: Prisma.AuctionOrderByWithRelationInput = { endAt: "asc" };

  if (sort === "pujados") {
    orderBy = { bidCount: "desc" };
  } else if (sort === "sin-ofertas") {
    where.bidCount = 0;
    orderBy = { createdAt: "desc" };
  }

  const auctions = await db.auction.findMany({
    where,
    orderBy,
    include: {
      category: { select: { name: true } },
      images: { orderBy: { position: "asc" }, take: 1 },
      seller: { select: { name: true, city: true, province: true } },
    },
  });

  return (
    <div className="space-y-6">
      {/* Banner / Encabezado */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-[#E2EAF2] bg-white p-5 shadow-sm sm:p-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#16324F] text-[#F6C445]">
              <Gavel className="h-5 w-5" />
            </div>
            <h1 className="text-2xl font-black text-[#16324F]">
              Remates en Vivo
            </h1>
          </div>
          <p className="text-xs text-[#5C6B82]">
            Objetos con precio de salida bajo y cierre programado. Gana la mejor oferta al terminar el tiempo.
          </p>
        </div>

        <Link
          href="/remates/nuevo"
          className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-[#16324F] px-4 py-2.5 text-xs font-black text-white shadow-sm transition hover:bg-[#0F243A]"
        >
          <PlusCircle className="h-4 w-4 text-[#F6C445]" />
          <span>Publicar remate</span>
        </Link>
      </div>

      {/* Filtros rápidos */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
        <Link
          href="/remates?sort=pronto"
          className={`inline-flex min-h-[40px] items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition ${
            sort === "pronto"
              ? "bg-[#16324F] text-white shadow-sm"
              : "bg-white text-[#16324F] border border-[#E2EAF2] hover:bg-[#F3F8FC]"
          }`}
        >
          <Clock className="h-3.5 w-3.5" />
          <span>Terminan pronto</span>
        </Link>

        <Link
          href="/remates?sort=pujados"
          className={`inline-flex min-h-[40px] items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition ${
            sort === "pujados"
              ? "bg-[#16324F] text-white shadow-sm"
              : "bg-white text-[#16324F] border border-[#E2EAF2] hover:bg-[#F3F8FC]"
          }`}
        >
          <Flame className="h-3.5 w-3.5" />
          <span>Más pujados</span>
        </Link>

        <Link
          href="/remates?sort=sin-ofertas"
          className={`inline-flex min-h-[40px] items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition ${
            sort === "sin-ofertas"
              ? "bg-[#16324F] text-white shadow-sm"
              : "bg-white text-[#16324F] border border-[#E2EAF2] hover:bg-[#F3F8FC]"
          }`}
        >
          <Sparkles className="h-3.5 w-3.5" />
          <span>Sin ofertas aún</span>
        </Link>
      </div>

      {/* Grilla de Remates */}
      {auctions.length === 0 ? (
        <div className="rounded-2xl border border-[#E2EAF2] bg-white p-12 text-center space-y-3 shadow-sm">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#E7F1FA] text-[#75AADB]">
            <Gavel className="h-7 w-7" />
          </div>
          <h2 className="text-base font-bold text-[#16324F]">
            No hay remates activos en esta sección
          </h2>
          <p className="text-xs text-[#5C6B82] max-w-sm mx-auto">
            Sé el primero en rematar un objeto con precio de salida bajo y recibí ofertas en tiempo real.
          </p>
          <div className="pt-2">
            <Link
              href="/remates/nuevo"
              className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-[#16324F] px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-[#0F243A]"
            >
              Publicar remate ahora
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {auctions.map((item) => {
            const timeInfo = formatRemainingTime(item.endAt);
            const thumb = item.images[0]?.url;

            return (
              <Link
                key={item.id}
                href={`/remates/${item.id}`}
                className="group flex flex-col overflow-hidden rounded-2xl border border-[#E2EAF2] bg-white shadow-sm transition hover:shadow-md hover:border-[#75AADB]"
              >
                {/* Foto 1:1 */}
                <div className="relative aspect-square w-full overflow-hidden bg-[#F3F8FC]">
                  {thumb ? (
                    <img
                      src={thumb}
                      alt={item.title}
                      className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-xs text-[#5C6B82]">
                      <Package className="h-10 w-10 text-[#75AADB]" />
                    </div>
                  )}

                  {/* Badge de tiempo */}
                  <div className="absolute left-2.5 top-2.5">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-black shadow-sm ${
                        timeInfo.urgent
                          ? "bg-[#9B2335] text-white"
                          : "bg-[#16324F]/90 text-white backdrop-blur-sm"
                      }`}
                    >
                      <Clock className="h-3 w-3" />
                      <span>{timeInfo.text}</span>
                    </span>
                  </div>

                  {/* Badge de estado vivo */}
                  <div className="absolute right-2.5 top-2.5">
                    <span className="flex items-center gap-1 rounded-full bg-white/90 px-2.5 py-0.5 text-[10px] font-black text-[#16324F] shadow-sm backdrop-blur-sm">
                      <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                      <span>EN VIVO</span>
                    </span>
                  </div>
                </div>

                {/* Contenido */}
                <div className="flex flex-1 flex-col justify-between p-4 space-y-3">
                  <div>
                    <span className="text-[11px] font-semibold text-[#5C6B82]">
                      {item.category.name}
                    </span>
                    <h3 className="text-sm font-extrabold text-[#16324F] line-clamp-2 leading-snug group-hover:text-[#75AADB]">
                      {item.title}
                    </h3>
                  </div>

                  <div className="pt-2 border-t border-[#F3F8FC] flex items-end justify-between">
                    <div>
                      <p className="text-[10px] uppercase font-bold tracking-wider text-[#5C6B82]">
                        {item.bidCount === 0 ? "Precio base" : "Puja actual"}
                      </p>
                      <p className="text-xl font-black text-[#16324F] tabular-nums">
                        {formatARSFromCents(item.currentCents)}
                      </p>
                      <p className="text-[11px] text-[#5C6B82]">
                        {item.bidCount === 0
                          ? "Sin ofertas aún"
                          : `${item.bidCount} ${
                              item.bidCount === 1 ? "puja" : "pujas"
                            }`}
                      </p>
                    </div>

                    <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-[#F3F8FC] text-[#16324F] transition group-hover:bg-[#16324F] group-hover:text-white">
                      <ArrowRight className="h-4 w-4" />
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
