import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { PROVINCE_LABELS } from "@/lib/constants";
import { ListingCard } from "@/components/ListingCard";
import { MapPin, Star, Settings, Package, Handshake } from "lucide-react";

export const metadata = {
  title: "Mi perfil",
};

export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    include: {
      listings: {
        where: { status: "ACTIVA" },
        orderBy: { createdAt: "desc" },
        include: {
          images: { orderBy: { position: "asc" }, take: 1 },
          category: { select: { name: true } },
        },
      },
      receivedReviews: {
        orderBy: { id: "desc" },
        include: {
          author: { select: { name: true, imageUrl: true } },
        },
      },
    },
  });

  if (!user) {
    redirect("/login");
  }

  const initials = user.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="space-y-8">
      {/* Tarjeta principal del usuario */}
      <section className="rounded-2xl border border-[#E2EAF2] bg-white p-6 shadow-sm">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div className="flex items-center gap-4">
            <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-[#75AADB] bg-[#16324F] text-xl font-extrabold text-white">
              {user.imageUrl ? (
                <img
                  src={user.imageUrl}
                  alt={user.name}
                  className="h-full w-full object-cover"
                />
              ) : (
                <span>{initials || "U"}</span>
              )}
            </div>
            <div className="space-y-1">
              <h1 className="text-2xl font-extrabold text-[#16324F]">
                {user.name}
              </h1>
              <p className="text-xs text-[#243447]">{user.email}</p>

              <div className="flex flex-wrap items-center gap-3 pt-1 text-xs text-[#243447]">
                {user.city && user.province ? (
                  <span className="inline-flex items-center gap-1 font-medium">
                    <MapPin className="h-3.5 w-3.5 text-[#75AADB]" />
                    {user.city}, {PROVINCE_LABELS[user.province]}
                  </span>
                ) : (
                  <span className="font-semibold text-[#75AADB]">
                    Falta completar ciudad y provincia
                  </span>
                )}

                <span className="inline-flex items-center gap-1 font-bold text-[#16324F]">
                  <Star className="h-3.5 w-3.5 fill-[#F6C445] text-[#F6C445]" />
                  {user.ratingCount > 0
                    ? `${user.ratingAvg.toFixed(1)} (${user.ratingCount} ${
                        user.ratingCount === 1
                          ? "calificación"
                          : "calificaciones"
                      })`
                    : "Sin calificaciones aún"}
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href="/ajustes"
              className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-[#75AADB] bg-white px-4 py-2 text-xs font-bold text-[#16324F] hover:bg-[#F3F8FC]"
            >
              <Settings className="h-4 w-4 text-[#75AADB]" />
              <span>Editar perfil</span>
            </Link>
            <Link
              href="/mis-publicaciones"
              className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-[#16324F] px-4 py-2 text-xs font-bold text-white hover:bg-[#0F243A]"
            >
              <Package className="h-4 w-4 text-[#F6C445]" />
              <span>Mis publicaciones</span>
            </Link>
            <Link
              href="/operaciones"
              className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-[#75AADB] bg-white px-4 py-2 text-xs font-bold text-[#16324F] hover:bg-[#F3F8FC]"
            >
              <Handshake className="h-4 w-4 text-[#75AADB]" />
              <span>Operaciones</span>
            </Link>
          </div>
        </div>

        {user.bio && (
          <p className="mt-4 border-t border-[#E2EAF2] pt-3 text-sm text-[#243447]">
            {user.bio}
          </p>
        )}
      </section>

      {/* Calificaciones recibidas */}
      <section className="space-y-3">
        <h2 className="text-lg font-bold text-[#16324F]">
          Calificaciones recibidas ({user.receivedReviews.length})
        </h2>

        {user.receivedReviews.length === 0 ? (
          <div className="rounded-2xl border border-[#E2EAF2] bg-white p-6 text-center text-sm text-[#243447]">
            Todavía no recibiste calificaciones. Se habilitan al concretar tus primeras ventas o trueques.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {user.receivedReviews.map((rev) => (
              <div
                key={rev.id}
                className="rounded-2xl border border-[#E2EAF2] bg-white p-4 shadow-sm space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-[#16324F]">
                    {rev.author.name}
                  </span>
                  <span className="text-sm font-bold text-[#F6C445]">
                    {"★".repeat(rev.stars)}
                  </span>
                </div>
                <p className="text-xs text-[#243447]">{rev.comment}</p>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Avisos activos */}
      <section className="space-y-3">
        <h2 className="text-lg font-bold text-[#16324F]">
          Tus avisos activos ({user.listings.length})
        </h2>

        {user.listings.length === 0 ? (
          <div className="rounded-2xl border border-[#E2EAF2] bg-white p-6 text-center text-sm text-[#243447]">
            Todavía no tenés avisos activos.
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {user.listings.map((item) => (
              <ListingCard
                key={item.id}
                listing={item}
                isAuthenticated={true}
                isFavorited={false}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
