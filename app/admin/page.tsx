import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatARSFromCents, formatBpsPercent } from "@/lib/commission";
import {
  DEAL_STATUS_LABELS,
  DEAL_TYPE_LABELS,
  LISTING_STATUS_LABELS,
  PROVINCE_LABELS,
} from "@/lib/constants";
import {
  AdminCommissionForm,
  AdminListingRowActions,
} from "@/components/AdminControls";
import {
  Users,
  Package,
  Handshake,
  DollarSign,
  ShieldCheck,
  Search,
  ChevronLeft,
  ChevronRight,
  Filter,
} from "lucide-react";
import { DealStatus, DealType, ListingStatus, Prisma, Province } from "@prisma/client";

export const metadata = {
  title: "Panel de Administración",
};

interface AdminPageProps {
  searchParams: Promise<{
    tab?: string;
    q?: string;
    status?: string;
    page?: string;
    uq?: string;
  }>;
}

const PAGE_SIZE = 15;

export default async function AdminPage({ searchParams }: AdminPageProps) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    redirect("/");
  }

  const params = await searchParams;
  const currentTab = params.tab || "resumen";
  const query = (params.q || "").trim();
  const userQuery = (params.uq || "").trim();
  const filterStatus = (params.status || "TODAS").toUpperCase();
  const currentPage = Math.max(1, parseInt(params.page || "1", 10) || 1);

  // Conteos globales para métricas y badges de pestañas
  const [
    usersCount,
    activeListingsCount,
    totalListingsCount,
    dealsCount,
    approvedDealsWithPayment,
    settings,
  ] = await Promise.all([
    db.user.count(),
    db.listing.count({ where: { status: "ACTIVA" } }),
    db.listing.count({ where: { status: { not: "ELIMINADA" } } }),
    db.deal.count(),
    db.payment.findMany({
      where: { status: "APPROVED" },
      include: {
        deal: { select: { commissionCents: true } },
      },
    }),
    db.platformSetting.upsert({
      where: { id: "default" },
      update: {},
      create: {
        id: "default",
        commissionBps: 400,
        minCommissionCents: 0,
        maxCommissionCents: null,
      },
    }),
  ]);

  const totalCommissionCollectedCents = approvedDealsWithPayment.reduce(
    (acc, p) => acc + (p.deal?.commissionCents ?? 0),
    0
  );

  // Carga condicional según la pestaña activa para máxima velocidad
  let listings: Array<any> = [];
  let totalFilteredListings = 0;

  if (currentTab === "publicaciones") {
    const where: Prisma.ListingWhereInput = {};

    if (filterStatus !== "TODAS") {
      if (Object.values(ListingStatus).includes(filterStatus as ListingStatus)) {
        where.status = filterStatus as ListingStatus;
      }
    } else {
      where.status = { not: "ELIMINADA" };
    }

    if (query) {
      where.OR = [
        { title: { contains: query, mode: "insensitive" } },
        { description: { contains: query, mode: "insensitive" } },
        { owner: { email: { contains: query, mode: "insensitive" } } },
        { owner: { name: { contains: query, mode: "insensitive" } } },
      ];
    }

    [totalFilteredListings, listings] = await Promise.all([
      db.listing.count({ where }),
      db.listing.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (currentPage - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
        include: {
          owner: { select: { name: true, email: true } },
          category: { select: { name: true } },
          images: { orderBy: { position: "asc" }, take: 1 },
        },
      }),
    ]);
  }

  let deals: Array<any> = [];
  let totalFilteredDeals = 0;

  if (currentTab === "operaciones") {
    [totalFilteredDeals, deals] = await Promise.all([
      db.deal.count(),
      db.deal.findMany({
        orderBy: { createdAt: "desc" },
        skip: (currentPage - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
        include: {
          listing: { select: { id: true, title: true } },
          buyer: { select: { name: true, email: true } },
          seller: { select: { name: true, email: true } },
          payment: true,
        },
      }),
    ]);
  }

  let users: Array<any> = [];
  let totalFilteredUsers = 0;

  if (currentTab === "usuarios") {
    const userWhere: Prisma.UserWhereInput = {};
    if (userQuery) {
      userWhere.OR = [
        { name: { contains: userQuery, mode: "insensitive" } },
        { email: { contains: userQuery, mode: "insensitive" } },
        { city: { contains: userQuery, mode: "insensitive" } },
      ];
    }

    [totalFilteredUsers, users] = await Promise.all([
      db.user.count({ where: userWhere }),
      db.user.findMany({
        where: userWhere,
        orderBy: { createdAt: "desc" },
        skip: (currentPage - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
        include: {
          _count: {
            select: { listings: true },
          },
        },
      }),
    ]);
  }

  const tabs = [
    {
      id: "resumen",
      label: "Métricas y Comisión",
      badge: null,
      icon: ShieldCheck,
    },
    {
      id: "publicaciones",
      label: "Publicaciones",
      badge: totalListingsCount,
      icon: Package,
    },
    {
      id: "operaciones",
      label: "Operaciones",
      badge: dealsCount,
      icon: Handshake,
    },
    {
      id: "usuarios",
      label: "Usuarios",
      badge: usersCount,
      icon: Users,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#16324F] text-[#F6C445] shadow-sm">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black text-[#16324F]">
                Panel de Administración
              </h1>
              <span className="rounded-full bg-[#E7F1FA] px-2.5 py-0.5 text-[11px] font-bold text-[#16324F]">
                ADMIN
              </span>
            </div>
            <p className="text-xs text-[#3D5270]">
              Gestión centralizada de TruequeAR: métricas, moderación de avisos, tratos y usuarios.
            </p>
          </div>
        </div>

        <Link
          href="/"
          className="inline-flex min-h-[40px] items-center rounded-xl border border-[#C5D4E5] bg-white px-3.5 py-2 text-xs font-bold text-[#16324F] hover:bg-[#F3F8FC]"
        >
          ← Volver a la plataforma
        </Link>
      </div>

      {/* Pestañas de navegación de Admin */}
      <nav
        aria-label="Pestañas de administración"
        className="flex gap-2 overflow-x-auto border-b border-[#E2EAF2] pb-2 no-scrollbar"
      >
        {tabs.map((tab) => {
          const isActive = currentTab === tab.id;
          const Icon = tab.icon;
          return (
            <Link
              key={tab.id}
              href={`/admin?tab=${tab.id}`}
              className={`inline-flex min-h-[44px] shrink-0 items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition ${
                isActive
                  ? "bg-[#16324F] text-white shadow-sm"
                  : "bg-white text-[#243447] border border-[#E2EAF2] hover:bg-[#F3F8FC] hover:text-[#16324F]"
              }`}
            >
              <Icon className={`h-4 w-4 ${isActive ? "text-[#F6C445]" : "text-[#75AADB]"}`} />
              <span>{tab.label}</span>
              {typeof tab.badge === "number" && (
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-black ${
                    isActive
                      ? "bg-white/20 text-white"
                      : "bg-[#E7F1FA] text-[#16324F]"
                  }`}
                >
                  {tab.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* ========================================================================= */}
      {/* PESTAÑA 1: RESUMEN Y COMISION */}
      {/* ========================================================================= */}
      {currentTab === "resumen" && (
        <div className="space-y-6">
          {/* Métricas clave */}
          <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-2xl border border-[#E2EAF2] bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between text-[#243447]">
                <span className="text-xs font-bold uppercase tracking-wider">
                  Usuarios
                </span>
                <Users className="h-4 w-4 text-[#75AADB]" />
              </div>
              <p className="mt-2 text-2xl font-black text-[#16324F]">
                {usersCount}
              </p>
              <Link
                href="/admin?tab=usuarios"
                className="mt-2 inline-block text-[11px] font-bold text-[#75AADB] hover:underline"
              >
                Ver usuarios →
              </Link>
            </div>

            <div className="rounded-2xl border border-[#E2EAF2] bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between text-[#243447]">
                <span className="text-xs font-bold uppercase tracking-wider">
                  Avisos activos
                </span>
                <Package className="h-4 w-4 text-[#75AADB]" />
              </div>
              <p className="mt-2 text-2xl font-black text-[#16324F]">
                {activeListingsCount}
              </p>
              <Link
                href="/admin?tab=publicaciones"
                className="mt-2 inline-block text-[11px] font-bold text-[#75AADB] hover:underline"
              >
                Moderar avisos ({totalListingsCount}) →
              </Link>
            </div>

            <div className="rounded-2xl border border-[#E2EAF2] bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between text-[#243447]">
                <span className="text-xs font-bold uppercase tracking-wider">
                  Operaciones
                </span>
                <Handshake className="h-4 w-4 text-[#75AADB]" />
              </div>
              <p className="mt-2 text-2xl font-black text-[#16324F]">
                {dealsCount}
              </p>
              <Link
                href="/admin?tab=operaciones"
                className="mt-2 inline-block text-[11px] font-bold text-[#75AADB] hover:underline"
              >
                Ver tratos →
              </Link>
            </div>

            <div className="rounded-2xl border border-[#E2EAF2] bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between text-[#243447]">
                <span className="text-xs font-bold uppercase tracking-wider">
                  Comisión cobrada
                </span>
                <DollarSign className="h-4 w-4 text-[#75AADB]" />
              </div>
              <p className="mt-2 text-2xl font-black text-[#16324F]">
                {formatARSFromCents(totalCommissionCollectedCents)}
              </p>
              <p className="mt-2 text-[11px] text-[#5C6B82]">
                Por ventas completadas
              </p>
            </div>
          </section>

          {/* Formulario de comisión */}
          <AdminCommissionForm
            initialBps={settings.commissionBps}
            initialMinCents={settings.minCommissionCents}
            initialMaxCents={settings.maxCommissionCents}
          />

          {/* Tarjetas informativas */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-[#E2EAF2] bg-white p-5 shadow-sm space-y-2">
              <h3 className="text-sm font-bold text-[#16324F]">
                🛡️ Control y Moderación
              </h3>
              <p className="text-xs text-[#3D5270] leading-relaxed">
                Todas las publicaciones creadas en la plataforma quedan registradas en el apartado{" "}
                <Link
                  href="/admin?tab=publicaciones"
                  className="font-bold text-[#16324F] underline"
                >
                  Publicaciones
                </Link>
                . Podés pausar publicaciones que violen las normas o eliminarlas definitivamente.
              </p>
            </div>

            <div className="rounded-2xl border border-[#E2EAF2] bg-white p-5 shadow-sm space-y-2">
              <h3 className="text-sm font-bold text-[#16324F]">
                🤝 Trueque 0% vs Ventas
              </h3>
              <p className="text-xs text-[#3D5270] leading-relaxed">
                Las operaciones de trueque puro son 100% gratuitas para incentivar el volumen de usuarios. La comisión configurada aplica únicamente a tratos con pago pactado en pesos.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* PESTAÑA 2: MODERACIÓN DE PUBLICACIONES (CON BUSCADOR Y PAGINACIÓN) */}
      {/* ========================================================================= */}
      {currentTab === "publicaciones" && (
        <div className="space-y-4">
          {/* Barra de búsqueda y filtros */}
          <form
            method="GET"
            action="/admin"
            className="flex flex-wrap items-center gap-3 rounded-2xl border border-[#E2EAF2] bg-white p-4 shadow-sm"
          >
            <input type="hidden" name="tab" value="publicaciones" />

            <div className="relative flex-1 min-w-[220px]">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#75AADB]" />
              <input
                type="search"
                name="q"
                defaultValue={query}
                placeholder="Buscar por título, usuario o email..."
                className="min-h-[44px] w-full rounded-xl border border-[#C5D4E5] bg-white pl-9 pr-3 text-xs text-[#16324F] placeholder:text-[#5C6B82] focus:border-[#75AADB] focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-[#75AADB]" />
              <select
                name="status"
                defaultValue={filterStatus}
                className="min-h-[44px] rounded-xl border border-[#C5D4E5] bg-white px-3 py-2 text-xs font-semibold text-[#16324F] focus:border-[#75AADB] focus:outline-none"
              >
                <option value="TODAS">Todos los estados</option>
                <option value="ACTIVA">Solo Activas</option>
                <option value="PAUSADA">Solo Pausadas</option>
                <option value="RESERVADA">Solo Reservadas</option>
                <option value="VENDIDA">Solo Vendidas</option>
                <option value="ELIMINADA">Solo Eliminadas</option>
              </select>
            </div>

            <button
              type="submit"
              className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl bg-[#16324F] px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-[#0F243A]"
            >
              <span>Filtrar</span>
            </button>

            {(query || filterStatus !== "TODAS") && (
              <Link
                href="/admin?tab=publicaciones"
                className="text-xs font-bold text-[#75AADB] hover:underline"
              >
                Limpiar filtros
              </Link>
            )}
          </form>

          {/* Tabla de Publicaciones */}
          <div className="overflow-x-auto rounded-2xl border border-[#E2EAF2] bg-white shadow-sm">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-[#E2EAF2] bg-[#F3F8FC] text-[#16324F] uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3 font-bold">Publicación</th>
                  <th className="px-4 py-3 font-bold">Dueño</th>
                  <th className="px-4 py-3 font-bold">Trato / Precio</th>
                  <th className="px-4 py-3 font-bold">Estado</th>
                  <th className="px-4 py-3 font-bold text-right">Acciones de Moderación</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2EAF2]">
                {listings.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-4 py-8 text-center text-[#5C6B82]"
                    >
                      No se encontraron publicaciones con los filtros aplicados.
                    </td>
                  </tr>
                ) : (
                  listings.map((item) => (
                    <tr key={item.id} className="hover:bg-[#F3F8FC]/60">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {item.images?.[0]?.url ? (
                            <img
                              src={item.images[0].url}
                              alt=""
                              className="h-10 w-10 shrink-0 rounded-lg object-cover border border-[#E2EAF2]"
                            />
                          ) : (
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#E7F1FA] text-[#75AADB]">
                              <Package className="h-5 w-5" />
                            </div>
                          )}
                          <div className="min-w-0">
                            <Link
                              href={`/aviso/${item.id}`}
                              className="font-bold text-[#16324F] hover:text-[#75AADB] hover:underline line-clamp-1"
                            >
                              {item.title}
                            </Link>
                            <p className="text-[11px] text-[#5C6B82]">
                              {item.category?.name} • {item.city},{" "}
                              {PROVINCE_LABELS[item.province as Province]}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-[#243447]">
                        <p className="font-bold text-[#16324F]">
                          {item.owner.name}
                        </p>
                        <p className="text-[11px] text-[#5C6B82]">
                          {item.owner.email}
                        </p>
                      </td>
                      <td className="px-4 py-3 font-semibold text-[#16324F]">
                        {DEAL_TYPE_LABELS[item.dealType as DealType]}
                        <p className="text-[11px] text-[#243447]">
                          {item.dealType === "TRUEQUE"
                            ? "Solo trueque"
                            : formatARSFromCents(item.priceCents)}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full px-2.5 py-0.5 font-bold ${
                            item.status === "ACTIVA"
                              ? "bg-emerald-100 text-emerald-800"
                              : item.status === "PAUSADA"
                              ? "bg-amber-100 text-amber-800"
                              : item.status === "ELIMINADA"
                              ? "bg-red-100 text-red-800"
                              : "bg-[#16324F] text-white"
                          }`}
                        >
                          {LISTING_STATUS_LABELS[item.status as ListingStatus]}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="inline-flex justify-end">
                          <AdminListingRowActions
                            listingId={item.id}
                            status={item.status}
                          />
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Paginación de publicaciones */}
          {totalFilteredListings > PAGE_SIZE && (
            <div className="flex items-center justify-between rounded-2xl border border-[#E2EAF2] bg-white px-4 py-3 text-xs shadow-sm">
              <span className="text-[#5C6B82]">
                Mostrando {(currentPage - 1) * PAGE_SIZE + 1} a{" "}
                {Math.min(currentPage * PAGE_SIZE, totalFilteredListings)} de{" "}
                {totalFilteredListings} publicaciones
              </span>

              <div className="flex items-center gap-2">
                {currentPage > 1 ? (
                  <Link
                    href={`/admin?tab=publicaciones&page=${currentPage - 1}${
                      query ? `&q=${encodeURIComponent(query)}` : ""
                    }${filterStatus ? `&status=${filterStatus}` : ""}`}
                    className="inline-flex items-center gap-1 rounded-lg border border-[#C5D4E5] px-2.5 py-1.5 font-bold text-[#16324F] hover:bg-[#F3F8FC]"
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                    <span>Anterior</span>
                  </Link>
                ) : null}

                <span className="font-bold text-[#16324F]">
                  Página {currentPage} de{" "}
                  {Math.ceil(totalFilteredListings / PAGE_SIZE)}
                </span>

                {currentPage < Math.ceil(totalFilteredListings / PAGE_SIZE) ? (
                  <Link
                    href={`/admin?tab=publicaciones&page=${currentPage + 1}${
                      query ? `&q=${encodeURIComponent(query)}` : ""
                    }${filterStatus ? `&status=${filterStatus}` : ""}`}
                    className="inline-flex items-center gap-1 rounded-lg border border-[#C5D4E5] px-2.5 py-1.5 font-bold text-[#16324F] hover:bg-[#F3F8FC]"
                  >
                    <span>Siguiente</span>
                    <ChevronRight className="h-3.5 w-3.5" />
                  </Link>
                ) : null}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* PESTAÑA 3: OPERACIONES (DEALS) */}
      {/* ========================================================================= */}
      {currentTab === "operaciones" && (
        <div className="space-y-4">
          <div className="overflow-x-auto rounded-2xl border border-[#E2EAF2] bg-white shadow-sm">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-[#E2EAF2] bg-[#F3F8FC] text-[#16324F] uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3 font-bold">Publicación</th>
                  <th className="px-4 py-3 font-bold">Partes</th>
                  <th className="px-4 py-3 font-bold">Tipo y Monto</th>
                  <th className="px-4 py-3 font-bold">Comisión</th>
                  <th className="px-4 py-3 font-bold">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2EAF2]">
                {deals.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-4 py-8 text-center text-[#5C6B82]"
                    >
                      Todavía no hay operaciones registradas en la plataforma.
                    </td>
                  </tr>
                ) : (
                  deals.map((d) => (
                    <tr key={d.id} className="hover:bg-[#F3F8FC]/60">
                      <td className="px-4 py-3 font-semibold text-[#16324F]">
                        <Link
                          href={`/operaciones/${d.id}`}
                          className="hover:text-[#75AADB] hover:underline"
                        >
                          {d.listing?.title ?? "Aviso"}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-[#243447]">
                        <p>
                          <strong className="text-[#16324F]">Vende:</strong>{" "}
                          {d.seller.name} ({d.seller.email})
                        </p>
                        <p>
                          <strong className="text-[#16324F]">Compra:</strong>{" "}
                          {d.buyer.name} ({d.buyer.email})
                        </p>
                      </td>
                      <td className="px-4 py-3 font-semibold text-[#16324F]">
                        {d.kind === "TRUEQUE"
                          ? "Trueque"
                          : `Venta (${formatARSFromCents(d.agreedPriceCents)})`}
                      </td>
                      <td className="px-4 py-3 font-bold text-[#16324F]">
                        {formatARSFromCents(d.commissionCents)} (
                        {formatBpsPercent(d.commissionBps)})
                      </td>
                      <td className="px-4 py-3">
                        <span className="rounded-full border border-[#E2EAF2] bg-[#F3F8FC] px-2.5 py-0.5 font-bold text-[#16324F]">
                          {DEAL_STATUS_LABELS[d.status as DealStatus]}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* PESTAÑA 4: USUARIOS */}
      {/* ========================================================================= */}
      {currentTab === "usuarios" && (
        <div className="space-y-4">
          {/* Buscador de usuarios */}
          <form
            method="GET"
            action="/admin"
            className="flex items-center gap-3 rounded-2xl border border-[#E2EAF2] bg-white p-4 shadow-sm"
          >
            <input type="hidden" name="tab" value="usuarios" />

            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#75AADB]" />
              <input
                type="search"
                name="uq"
                defaultValue={userQuery}
                placeholder="Buscar usuario por nombre, email o ciudad..."
                className="min-h-[44px] w-full rounded-xl border border-[#C5D4E5] bg-white pl-9 pr-3 text-xs text-[#16324F] placeholder:text-[#5C6B82] focus:border-[#75AADB] focus:outline-none"
              />
            </div>

            <button
              type="submit"
              className="inline-flex min-h-[44px] items-center rounded-xl bg-[#16324F] px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-[#0F243A]"
            >
              Buscar
            </button>
          </form>

          {/* Tabla de Usuarios */}
          <div className="overflow-x-auto rounded-2xl border border-[#E2EAF2] bg-white shadow-sm">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-[#E2EAF2] bg-[#F3F8FC] text-[#16324F] uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3 font-bold">Usuario</th>
                  <th className="px-4 py-3 font-bold">Email</th>
                  <th className="px-4 py-3 font-bold">Ubicación</th>
                  <th className="px-4 py-3 font-bold">Rol</th>
                  <th className="px-4 py-3 font-bold">Reputación / Avisos</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2EAF2]">
                {users.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-4 py-8 text-center text-[#5C6B82]"
                    >
                      No se encontraron usuarios.
                    </td>
                  </tr>
                ) : (
                  users.map((u) => (
                    <tr key={u.id} className="hover:bg-[#F3F8FC]/60">
                      <td className="px-4 py-3 font-bold text-[#16324F]">
                        {u.name}
                      </td>
                      <td className="px-4 py-3 text-[#243447]">{u.email}</td>
                      <td className="px-4 py-3 text-[#243447]">
                        {u.city && u.province
                          ? `${u.city}, ${PROVINCE_LABELS[u.province as Province]}`
                          : "Sin completar"}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full px-2.5 py-0.5 font-bold ${
                            u.role === "ADMIN"
                              ? "bg-[#16324F] text-white"
                              : "border border-[#E2EAF2] bg-[#F3F8FC] text-[#243447]"
                          }`}
                        >
                          {u.role}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[#243447]">
                        <span className="text-[#F6C445]">★</span>{" "}
                        {u.ratingAvg.toFixed(1)} ({u.ratingCount}) •{" "}
                        {u._count.listings} avisos
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
