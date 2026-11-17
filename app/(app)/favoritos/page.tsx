import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { ListingCard } from "@/components/ListingCard";
import { Heart } from "lucide-react";

export const metadata = {
  title: "Tus favoritos",
};

export default async function FavoritesPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const favorites = await db.favorite.findMany({
    where: {
      userId: session.user.id,
      listing: {
        status: { not: "ELIMINADA" },
      },
    },
    include: {
      listing: {
        include: {
          images: { orderBy: { position: "asc" }, take: 1 },
          category: { select: { name: true } },
        },
      },
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-[#16324F]">
          Tus favoritos
        </h1>
        <p className="text-sm text-[#243447]">
          Avisos que guardaste para seguir de cerca o proponer un trato.
        </p>
      </div>

      {favorites.length === 0 ? (
        <div className="rounded-2xl border border-[#E2EAF2] bg-white p-10 text-center space-y-3 shadow-sm">
          <Heart className="mx-auto h-10 w-10 text-[#75AADB]" />
          <p className="text-base font-bold text-[#16324F]">
            Todavía no guardaste favoritos
          </p>
          <p className="text-sm text-[#243447]">
            Tocá el corazón en las publicaciones que te gusten para tenerlas a mano acá.
          </p>
          <div className="pt-2">
            <Link
              href="/"
              className="inline-flex min-h-[44px] items-center justify-center rounded-xl bg-[#16324F] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#0F243A]"
            >
              Explorar publicaciones
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {favorites.map((fav) => (
            <ListingCard
              key={fav.listingId}
              listing={fav.listing}
              isAuthenticated={true}
              isFavorited={true}
            />
          ))}
        </div>
      )}
    </div>
  );
}
