import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { SettingsForms } from "@/components/SettingsForms";

export const metadata = {
  title: "Ajustes de cuenta",
};

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ completar?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const [user, sp] = await Promise.all([
    db.user.findUnique({
      where: { id: session.user.id },
    }),
    searchParams,
  ]);

  if (!user) {
    redirect("/login");
  }

  const mustCompleteLocation =
    sp.completar === "1" || !user.city || !user.province;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-[#16324F]">
          Ajustes de tu perfil
        </h1>
        <p className="text-sm text-[#243447]">
          Completá tu nombre, ciudad, provincia, bio y foto para operar en TruequeAR.
        </p>
      </div>

      <SettingsForms
        user={{
          name: user.name,
          email: user.email,
          city: user.city,
          province: user.province,
          bio: user.bio,
          imageUrl: user.imageUrl,
          hasPassword: Boolean(user.passwordHash),
        }}
        mustCompleteLocation={mustCompleteLocation}
      />
    </div>
  );
}
