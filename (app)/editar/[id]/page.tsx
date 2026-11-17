import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { ListingForm } from "@/components/ListingForm";

export const metadata = {
  title: "Editar publicación",
};

export default async function EditListingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const { id } = await params;

  const [listing, categories] = await Promise.all([
    db.listing.findUnique({
      where: { id },
      include: {
        images: { orderBy: { position: "asc" } },
        category: true,
      },
    }),
    db.category.findMany({
      where: { parentId: null },
      orderBy: { name: "asc" },
      include: {
        children: {
          orderBy: { name: "asc" },
        },
      },
    }),
  ]);

  if (!listing || listing.status === "ELIMINADA") {
    notFound();
  }

  if (listing.ownerId !== session.user.id) {
    redirect("/mis-publicaciones");
  }

  return (
    <div className="space-y-6">
      <div className="mx-auto max-w-2xl">
        <h1 className="text-2xl font-extrabold text-[#16324F]">
          Editá tu publicación
        </h1>
        <p className="mt-1 text-sm text-[#243447]">
          Actualizá las fotos, el precio o las condiciones de tu aviso.
        </p>
      </div>

      <ListingForm
        categories={categories}
        initialListing={{
          id: listing.id,
          title: listing.title,
          description: listing.description,
          categoryId: listing.categoryId,
          parentCategoryId:
            listing.category.parentId ?? categories[0]?.id ?? "",
          condition: listing.condition,
          dealType: listing.dealType,
          priceCents: listing.priceCents,
          tradeNotes: listing.tradeNotes,
          province: listing.province,
          city: listing.city,
          images: listing.images.map((img) => img.url),
        }}
      />
    </div>
  );
}
