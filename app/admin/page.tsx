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
} from "lucide-react";

export const metadata = {
  title: "Panel de Administración",
};

export default async function AdminPage() {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    redirect("/");
  }

  const [
    usersCount,
    activeListingsCount,
    dealsCount,
    approvedDealsWithPayment,
    settings,
    listings,
    users,
    deals,
  ] = await Promise.all([
    db.user.count(),
    db.listing.count({ where: { status: "ACTIVA" } }),
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
    db.listing.findMany({
      where: { status: { not: "ELIMINADA" } },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: {
        owner: { select: { name: true, email: true } },
        category: { select: { name: true } },
      },
    }),
    db.user.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        _count: {
          select: { listings: true },
        },
      },
    }),
    db.deal.findMany({
      orderBy: { createdAt: "desc" },
      take: 30,
      include: {
        listing: { select: { id: true, title: true } },
        buyer: { select: { name: true } },
        seller: { select: { name: true } },
        payment: true,
      },
    }),
  ]);

  const totalCommissionCollectedCents = approvedDealsWithPayment.reduce(
    (acc, p) => acc + (p.deal?.commissionCents ?? 0),
    0
  );

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-2.5">
        <ShieldCheck className="h-7 w-7 text-[#75AADB]" />
        <div>
          <h1 className="text-2xl font-extrabold text-[#16324F]">
            Panel de Administración
          </h1>
          <p className="text-sm text-[#243447]">
            Métricas globales, configuración de comisión, moderación de avisos, usuarios y operaciones.
          </p>
        </div>
      </div>

      {/* 4 números clave */}
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-2xl border border-[#E2EAF2] bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between text-[#243447]">
            <span className="text-xs font-bold uppercase">Usuarios</span>
            <Users className="h-4 w-4 text-[#75AADB]" />
          </div>
          <p className="mt-2 text-2xl font-black text-[#16324F]">
            {usersCount}
          </p>
        </div>

        <div className="rounded-2xl border border-[#E2EAF2] bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between text-[#243447]">
            <span className="text-xs font-bold uppercase">Avisos activos</span>
            <Package className="h-4 w-4 text-[#75AADB]" />
          </div>
          <p className="mt-2 text-2xl font-black text-[#16324F]">
            {activeListingsCount}
          </p>
        </div>

        <div className="rounded-2xl border border-[#E2EAF2] bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between text-[#243447]">
            <span className="text-xs font-bold uppercase">Operaciones</span>
            <Handshake className="h-4 w-4 text-[#75AADB]" />
          </div>
          <p className="mt-2 text-2xl font-black text-[#16324F]">
            {dealsCount}
          </p>
        </div>

        <div className="rounded-2xl border border-[#E2EAF2] bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between text-[#243447]">
            <span className="text-xs font-bold uppercase">
              Comisión cobrada
            </span>
            <DollarSign className="h-4 w-4 text-[#75AADB]" />
          </div>
          <p className="mt-2 text-2xl font-black text-[#16324F]">
            {formatARSFromCents(totalCommissionCollectedCents)}
          </p>
        </div>
      </section>

      {/* Formulario de comisión */}
      <AdminCommissionForm
        initialBps={settings.commissionBps}
        initialMinCents={settings.minCommissionCents}
        initialMaxCents={settings.maxCommissionCents}
      />

      {/* Tabla de Publicaciones */}
      <section className="space-y-3">
        <h2 className="text-lg font-extrabold text-[#16324F]">
          Publicaciones ({listings.length})
        </h2>
        <div className="overflow-x-auto rounded-2xl border border-[#E2EAF2] bg-white shadow-sm">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-[#E2EAF2] bg-[#F3F8FC] text-[#16324F] uppercase">
              <tr>
                <th className="px-4 py-3 font-bold">Aviso</th>
                <th className="px-4 py-3 font-bold">Dueño</th>
                <th className="px-4 py-3 font-bold">Trato / Precio</th>
                <th className="px-4 py-3 font-bold">Estado</th>
                <th className="px-4 py-3 font-bold">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2EAF2]">
              {listings.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-6 text-center text-[#243447]"
                  >
                    Todavía no hay publicaciones cargadas.
                  </td>
                </tr>
              ) : (
                listings.map((item) => (
                  <tr key={item.id} className="hover:bg-[#F3F8FC]">
                    <td className="px-4 py-3 font-semibold text-[#16324F]">
                      <Link
                        href={`/aviso/${item.id}`}
                        className="hover:text-[#75AADB] hover:underline"
                      >
                        {item.title}
                      </Link>
                      <p className="text-[11px] font-normal text-[#243447]">
                        {item.category.name} • {item.city},{" "}
                        {PROVINCE_LABELS[item.province]}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-[#243447]">
                      <p className="font-semibold text-[#16324F]">
                        {item.owner.name}
                      </p>
                      <p className="text-[11px]">{item.owner.email}</p>
                    </td>
                    <td className="px-4 py-3 font-semibold text-[#16324F]">
                      {DEAL_TYPE_LABELS[item.dealType]}
                      <p className="text-[11px] text-[#243447]">
                        {item.dealType === "TRUEQUE"
                          ? "Solo trueque"
                          : formatARSFromCents(item.priceCents)}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-[#16324F] px-2.5 py-0.5 font-bold text-white">
                        {LISTING_STATUS_LABELS[item.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <AdminListingRowActions
                        listingId={item.id}
                        status={item.status}
                      />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Tabla de Operaciones (Deals) */}
      <section className="space-y-3">
        <h2 className="text-lg font-extrabold text-[#16324F]">
          Operaciones ({deals.length})
        </h2>
        <div className="overflow-x-auto rounded-2xl border border-[#E2EAF2] bg-white shadow-sm">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-[#E2EAF2] bg-[#F3F8FC] text-[#16324F] uppercase">
              <tr>
                <th className="px-4 py-3 font-bold">Publicación</th>
                <th className="px-4 py-3 font-bold">Partes</th>
                <th className="px-4 py-3 font-bold">Tipo y Monto</th>
                <th className="px-4 py-3 font-bold">Comisión congelada</th>
                <th className="px-4 py-3 font-bold">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2EAF2]">
              {deals.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-6 text-center text-[#243447]"
                  >
                    Todavía no hay operaciones registradas.
                  </td>
                </tr>
              ) : (
                deals.map((d) => (
                  <tr key={d.id} className="hover:bg-[#F3F8FC]">
                    <td className="px-4 py-3 font-semibold text-[#16324F]">
                      <Link
                        href={`/operaciones/${d.id}`}
                        className="hover:text-[#75AADB] hover:underline"
                      >
                        {d.listing.title}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-[#243447]">
                      <p>
                        <strong className="text-[#16324F]">Vende:</strong>{" "}
                        {d.seller.name}
                      </p>
                      <p>
                        <strong className="text-[#16324F]">Compra:</strong>{" "}
                        {d.buyer.name}
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
                        {DEAL_STATUS_LABELS[d.status]}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Tabla de Usuarios */}
      <section className="space-y-3">
        <h2 className="text-lg font-extrabold text-[#16324F]">
          Usuarios registrados ({users.length})
        </h2>
        <div className="overflow-x-auto rounded-2xl border border-[#E2EAF2] bg-white shadow-sm">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-[#E2EAF2] bg-[#F3F8FC] text-[#16324F] uppercase">
              <tr>
                <th className="px-4 py-3 font-bold">Nombre</th>
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
                    className="px-4 py-6 text-center text-[#243447]"
                  >
                    Todavía no hay usuarios registrados.
                  </td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr key={u.id} className="hover:bg-[#F3F8FC]">
                    <td className="px-4 py-3 font-bold text-[#16324F]">
                      {u.name}
                    </td>
                    <td className="px-4 py-3 text-[#243447]">{u.email}</td>
                    <td className="px-4 py-3 text-[#243447]">
                      {u.city && u.province
                        ? `${u.city}, ${PROVINCE_LABELS[u.province]}`
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
      </section>
    </div>
  );
}
