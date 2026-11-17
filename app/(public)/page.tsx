import Link from "next/link";
import { Condition, DealType, Prisma, Province } from "@prisma/client";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { ListingCard } from "@/components/ListingCard";
import { FeedFilters } from "@/components/FeedFilters";
import { CategoryStrip } from "@/components/CategoryStrip";
import { PROVINCE_LABELS } from "@/lib/constants";
import { MapPin, Repeat, Cpu, ArrowRight, PlusCircle } from "lucide-react";

const PAGE_SIZE = 20;

const EXAMPLE_CHIPS = ["Bicicleta", "Notebook", "Sillón"] as const;

function HeroSunSvg({ className }: { className?: string }) {
  const rays = Array.from({ length: 16 }, (_, i) => {
    const angle = (i * 360) / 16;
    return (
      <line
        key={i}
        x1="100"
        y1="14"
        x2="100"
        y2="28"
        stroke="#F6C445"
        strokeWidth="6"
        strokeLinecap="round"
        transform={`rotate(${angle} 100 100)`}
      />
    );
  });

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 200 200"
      className={className}
      aria-hidden="true"
    >
      <circle cx="100" cy="100" r="56" fill="#F6C445" />
      <g>{rays}</g>
    </svg>
  );
}

interface HomeSearchParams {
  q?: string;
  category?: string;
  province?: string;
  dealType?: string;
  condition?: string;
  min?: string;
  max?: string;
  sort?: string;
  cursor?: string;
}

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<HomeSearchParams>;
}) {
  const params = await searchParams;
  const session = await auth();
  const userId = session?.user?.id;

  const [currentUser, categories, favorites] = await Promise.all([
    userId
      ? db.user.findUnique({
          where: { id: userId },
          select: { id: true, province: true, city: true, name: true },
        })
      : Promise.resolve(null),
    db.category.findMany({
      where: { parentId: null },
      orderBy: { name: "asc" },
      include: {
        children: {
          orderBy: { name: "asc" },
        },
      },
    }),
    userId
      ? db.favorite.findMany({
          where: { userId },
          select: { listingId: true },
        })
      : Promise.resolve([]),
  ]);

  const favoriteIds = new Set(favorites.map((f) => f.listingId));
  const isAuthenticated = Boolean(userId);

  const isFiltering = Boolean(
    params.q ||
      params.category ||
      params.province ||
      params.dealType ||
      params.condition ||
      params.min ||
      params.max ||
      params.cursor ||
      (params.sort && params.sort !== "recientes")
  );

  const where: Prisma.ListingWhereInput = {
    status: "ACTIVA",
  };

  if (params.q && params.q.trim()) {
    const q = params.q.trim();
    where.OR = [
      { title: { contains: q, mode: "insensitive" } },
      { description: { contains: q, mode: "insensitive" } },
    ];
  }

  if (params.category) {
    const matchedCat = await db.category.findUnique({
      where: { slug: params.category },
      include: { children: { select: { id: true } } },
    });

    if (matchedCat) {
      if (matchedCat.parentId === null) {
        where.categoryId = {
          in: matchedCat.children.map((c) => c.id),
        };
      } else {
        where.categoryId = matchedCat.id;
      }
    }
  }

  if (
    params.province &&
    Object.keys(PROVINCE_LABELS).includes(params.province)
  ) {
    where.province = params.province as Province;
  }

  if (
    params.dealType &&
    ["VENTA", "TRUEQUE", "AMBOS"].includes(params.dealType)
  ) {
    where.dealType = params.dealType as DealType;
  }

  if (
    params.condition &&
    ["NUEVO", "COMO_NUEVO", "USADO", "PARA_REPARAR"].includes(params.condition)
  ) {
    where.condition = params.condition as Condition;
  }

  const minPesos = params.min ? Number(params.min) : null;
  const maxPesos = params.max ? Number(params.max) : null;
  if (
    (minPesos !== null && !Number.isNaN(minPesos) && minPesos > 0) ||
    (maxPesos !== null && !Number.isNaN(maxPesos) && maxPesos > 0)
  ) {
    where.priceCents = {
      ...(minPesos && minPesos > 0 ? { gte: Math.round(minPesos * 100) } : {}),
      ...(maxPesos && maxPesos > 0 ? { lte: Math.round(maxPesos * 100) } : {}),
    };
  }

  let orderBy: Prisma.ListingOrderByWithRelationInput[] = [
    { createdAt: "desc" },
    { id: "desc" },
  ];
  if (params.sort === "precio_asc") {
    orderBy = [{ priceCents: "asc" }, { createdAt: "desc" }, { id: "desc" }];
  } else if (params.sort === "precio_desc") {
    orderBy = [{ priceCents: "desc" }, { createdAt: "desc" }, { id: "desc" }];
  }

  const feedListingsRaw = await db.listing.findMany({
    where,
    orderBy,
    take: PAGE_SIZE + 1,
    ...(params.cursor
      ? {
          cursor: { id: params.cursor },
          skip: 1,
        }
      : {}),
    include: {
      images: { orderBy: { position: "asc" }, take: 1 },
      category: { select: { name: true } },
    },
  });

  const hasNextPage = feedListingsRaw.length > PAGE_SIZE;
  const feedListings = hasNextPage
    ? feedListingsRaw.slice(0, PAGE_SIZE)
    : feedListingsRaw;
  const nextCursor = hasNextPage
    ? feedListings[feedListings.length - 1]?.id
    : null;

  const hardwareParent = categories.find((c) => c.slug === "hardware");
  const hardwareSubIds = hardwareParent
    ? hardwareParent.children.map((c) => c.id)
    : [];

  const [nearYouListings, tradeListings, hardwareListings] = !isFiltering
    ? await Promise.all([
        currentUser?.province
          ? db.listing.findMany({
              where: {
                status: "ACTIVA",
                province: currentUser.province,
              },
              orderBy: { createdAt: "desc" },
              take: 4,
              include: {
                images: { orderBy: { position: "asc" }, take: 1 },
                category: { select: { name: true } },
              },
            })
          : Promise.resolve([]),
        db.listing.findMany({
          where: {
            status: "ACTIVA",
            dealType: { in: ["TRUEQUE", "AMBOS"] },
          },
          orderBy: { createdAt: "desc" },
          take: 8,
          include: {
            images: { orderBy: { position: "asc" }, take: 1 },
            category: { select: { name: true } },
          },
        }),
        hardwareSubIds.length > 0
          ? db.listing.findMany({
              where: {
                status: "ACTIVA",
                categoryId: { in: hardwareSubIds },
              },
              orderBy: { createdAt: "desc" },
              take: 8,
              include: {
                images: { orderBy: { position: "asc" }, take: 1 },
                category: { select: { name: true } },
              },
            })
          : Promise.resolve([]),
      ])
    : [[], [], []];

  function buildNextPageHref(cursorId: string) {
    const sp = new URLSearchParams();
    if (params.q) sp.set("q", params.q);
    if (params.category) sp.set("category", params.category);
    if (params.province) sp.set("province", params.province);
    if (params.dealType) sp.set("dealType", params.dealType);
    if (params.condition) sp.set("condition", params.condition);
    if (params.min) sp.set("min", params.min);
    if (params.max) sp.set("max", params.max);
    if (params.sort) sp.set("sort", params.sort);
    sp.set("cursor", cursorId);
    return `/?${sp.toString()}`;
  }

  return (
    <div className="space-y-6">
      {/* Hero: bloque ancho #16324F, radio 20px, sol dorado 90% opacidad */}
      <section className="relative overflow-hidden rounded-[20px] bg-[#16324F] p-6 text-white shadow-[0_12px_32px_rgba(16,40,63,0.16)] sm:p-8 lg:p-10">
        {/* Sol grande en desktop a la derecha al 90% de opacidad detrás del contenido */}
        <HeroSunSvg className="pointer-events-none absolute -right-12 top-1/2 hidden h-64 w-64 -translate-y-1/2 opacity-90 md:block" />
        {/* Sol chico arriba a la derecha en mobile */}
        <HeroSunSvg className="pointer-events-none absolute -right-5 -top-5 h-24 w-24 opacity-90 md:hidden" />

        <div className="relative z-10 flex flex-col justify-between gap-6 md:flex-row md:items-center">
          <div className="max-w-2xl space-y-3">
            <span className="inline-flex items-center gap-2 rounded-full bg-[#F6C445]/[0.18] px-3.5 py-1 text-xs font-bold text-[#F6C445]">
              <span className="h-2 w-2 rounded-full bg-[#F6C445]" />
              Venta, trueque o ambos • Sin intermediarios
            </span>

            <h1 className="text-[32px] font-bold leading-[1.15] tracking-tight text-white md:text-[44px] md:leading-[1.1]">
              Publicá lo que no usás. Cambialo o vendelo cerca tuyo.
            </h1>

            <p className="text-base text-[#D6E8F7] sm:text-lg">
              Hablás por chat directo con el dueño y arreglás la entrega. Si es trueque mano a mano, no pagás comisión.
            </p>
          </div>

          <div className="flex w-full shrink-0 flex-col gap-3 sm:w-auto sm:flex-row">
            <Link
              href="/publicar"
              className="flex min-h-[48px] w-full sm:w-auto items-center justify-center gap-2 rounded-[12px] bg-[#F6C445] px-6 py-3 text-sm font-bold text-[#16324F] transition hover:bg-[#eab836]"
            >
              <PlusCircle className="h-4 w-4 text-[#16324F]" />
              <span>Publicá ahora</span>
            </Link>
            {!isAuthenticated && (
              <Link
                href="/registro"
                className="flex min-h-[48px] w-full sm:w-auto items-center justify-center rounded-[12px] border-[1.5px] border-white bg-transparent px-5 py-3 text-sm font-bold text-white transition hover:bg-white/10"
              >
                Creá tu cuenta
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* Filtros y buscador */}
      <FeedFilters categories={categories} currentParams={params} />

      {/* Fila horizontal de 8 categorías */}
      <CategoryStrip activeCategorySlug={params.category} />

      {/* Cerca tuyo */}
      {!isFiltering && currentUser?.province && nearYouListings.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-lg font-bold tracking-tight text-[#10283F]">
              <MapPin className="h-5 w-5 text-[#16324F]" />
              <span>
                Cerca tuyo en {PROVINCE_LABELS[currentUser.province]}
              </span>
            </h2>
            <Link
              href={`/?province=${currentUser.province}`}
              className="flex items-center gap-1 text-xs font-bold text-[#16324F] hover:underline"
            >
              <span>Ver todas</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {nearYouListings.map((item) => (
              <ListingCard
                key={item.id}
                listing={item}
                isAuthenticated={isAuthenticated}
                isFavorited={favoriteIds.has(item.id)}
              />
            ))}
          </div>
        </section>
      )}

      {/* Feed principal (o empty state con borde izquierdo dorado) */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold tracking-tight text-[#10283F]">
            {isFiltering ? "Resultados de tu búsqueda" : "Recién publicadas"}
          </h2>
          {feedListings.length > 0 && (
            <span className="text-xs font-semibold text-[#2C4260]">
              {feedListings.length}{" "}
              {feedListings.length === 1 ? "aviso" : "avisos"} en esta página
            </span>
          )}
        </div>

        {feedListings.length === 0 ? (
          <div className="rounded-[16px] border border-[#C5D7E8] border-l-4 border-l-[#F6C445] bg-white p-6 shadow-[0_8px_24px_rgba(16,40,63,0.06)] sm:p-8">
            {isFiltering ? (
              <div className="space-y-4">
                <div>
                  <p className="text-[22px] font-bold leading-snug text-[#10283F]">
                    No encontramos publicaciones con esos filtros
                  </p>
                  <p className="mt-1 text-sm text-[#2C4260]">
                    Probá cambiando las palabras, tocá un ejemplo o limpiá los filtros de búsqueda.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {EXAMPLE_CHIPS.map((chip) => (
                    <Link
                      key={chip}
                      href={`/?q=${encodeURIComponent(chip)}`}
                      className="inline-flex min-h-[44px] items-center rounded-full bg-[#16324F] px-4 py-2 text-xs font-bold text-white transition hover:bg-[#10283F]"
                    >
                      {chip}
                    </Link>
                  ))}
                  <Link
                    href="/"
                    className="inline-flex min-h-[44px] items-center justify-center rounded-[12px] border-[1.5px] border-[#16324F] bg-white px-4 py-2 text-xs font-bold text-[#16324F] hover:bg-[#F4F8FC]"
                  >
                    Ver todos los avisos
                  </Link>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <p className="text-[22px] font-bold leading-snug text-[#10283F]">
                    Todavía no hay avisos. Sé el primero en publicar.
                  </p>
                  <p className="mt-1 text-sm text-[#2C4260]">
                    Subí una foto real de lo que quieras vender o permutar, o probá buscar con estos ejemplos:
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {EXAMPLE_CHIPS.map((chip) => (
                    <Link
                      key={chip}
                      href={`/?q=${encodeURIComponent(chip)}`}
                      className="inline-flex min-h-[44px] items-center rounded-full bg-[#16324F] px-4 py-2 text-xs font-bold text-white transition hover:bg-[#10283F]"
                    >
                      {chip}
                    </Link>
                  ))}
                </div>
                <div className="pt-1">
                  <Link
                    href="/publicar"
                    className="inline-flex min-h-[48px] w-full sm:w-auto items-center justify-center gap-2 rounded-[12px] bg-[#F6C445] px-6 py-2.5 text-sm font-bold text-[#16324F] shadow-sm transition hover:bg-[#eab836]"
                  >
                    <PlusCircle className="h-4 w-4 text-[#16324F]" />
                    <span>Publicar</span>
                  </Link>
                </div>
              </div>
            )}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {feedListings.map((item) => (
                <ListingCard
                  key={item.id}
                  listing={item}
                  isAuthenticated={isAuthenticated}
                  isFavorited={favoriteIds.has(item.id)}
                />
              ))}
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
              {params.cursor && (
                <Link
                  href="/"
                  className="flex min-h-[48px] w-full sm:w-auto items-center justify-center rounded-[12px] border-[1.5px] border-[#16324F] bg-white px-5 py-2.5 text-sm font-bold text-[#16324F] hover:bg-[#F4F8FC]"
                >
                  Volver al inicio
                </Link>
              )}
              {nextCursor && (
                <Link
                  href={buildNextPageHref(nextCursor)}
                  className="flex min-h-[48px] w-full sm:w-auto items-center justify-center gap-2 rounded-[12px] bg-[#16324F] px-6 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-[#10283F]"
                >
                  <span>Cargar siguientes 20 avisos</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>
              )}
            </div>
          </>
        )}
      </section>

      {/* Bloque Solo Trueque */}
      {!isFiltering && tradeListings.length > 0 && (
        <section className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-lg font-bold tracking-tight text-[#10283F]">
              <Repeat className="h-5 w-5 text-[#16324F]" />
              <span>Para truequear (Trueque o Ambos)</span>
            </h2>
            <Link
              href="/?dealType=TRUEQUE"
              className="flex items-center gap-1 text-xs font-bold text-[#16324F] hover:underline"
            >
              <span>Ver solo trueque</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {tradeListings.map((item) => (
              <ListingCard
                key={item.id}
                listing={item}
                isAuthenticated={isAuthenticated}
                isFavorited={favoriteIds.has(item.id)}
              />
            ))}
          </div>
        </section>
      )}

      {/* Bloque Hardware */}
      {!isFiltering && hardwareListings.length > 0 && (
        <section className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-lg font-bold tracking-tight text-[#10283F]">
              <Cpu className="h-5 w-5 text-[#16324F]" />
              <span>Hardware y Tecnología</span>
            </h2>
            <Link
              href="/?category=hardware"
              className="flex items-center gap-1 text-xs font-bold text-[#16324F] hover:underline"
            >
              <span>Ver todo Hardware</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {hardwareListings.map((item) => (
              <ListingCard
                key={item.id}
                listing={item}
                isAuthenticated={isAuthenticated}
                isFavorited={favoriteIds.has(item.id)}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
