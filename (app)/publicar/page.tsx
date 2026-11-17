import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { ListingForm } from "@/components/ListingForm";

export const metadata = {
  title: "Publicá tu usado",
};

export default async function PublishPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const [user, categories] = await Promise.all([
    db.user.findUnique({
      where: { id: session.user.id },
      select: { city: true, province: true },
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

  // Si faltan ciudad y provincia en el perfil (ej: primer ingreso), redirigir a /ajustes antes de dejar publicar
  if (!user?.city || !user?.province) {
    redirect("/ajustes?completar=1");
  }

  return (
    <div className="space-y-6">
      <div className="mx-auto max-w-2xl">
        <h1 className="text-2xl font-extrabold text-[#16324F]">
          Publicá lo que querés vender o truequear
        </h1>
        <p className="mt-1 text-sm text-[#243447]">
          Completá los datos de tu publicación. Empezá subiendo al menos una foto real.
        </p>
      </div>

      <ListingForm
        categories={categories}
        defaultProvince={user.province}
        defaultCity={user.city}
      />
    </div>
  );
}
