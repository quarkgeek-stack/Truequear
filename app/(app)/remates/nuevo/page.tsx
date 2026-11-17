import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { isMercadoPagoConfigured } from "@/lib/mercadopago";
import { AuctionForm } from "@/components/AuctionForm";
import { AuctionStatus } from "@prisma/client";
import { Gavel, AlertTriangle } from "lucide-react";
import Link from "next/link";

export const metadata = {
  title: "Publicar un Remate",
};

export default async function NewAuctionPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const [user, categories, settings, activeCount] = await Promise.all([
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
    db.platformSetting.findUnique({ where: { id: "default" } }),
    db.auction.count({
      where: {
        sellerId: session.user.id,
        status: AuctionStatus.ACTIVO,
      },
    }),
  ]);

  if (!user?.city || !user?.province) {
    redirect("/ajustes?completar=1");
  }

  if (activeCount >= 3) {
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="rounded-2xl border-2 border-amber-300 bg-amber-50 p-6 text-center space-y-3">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 text-amber-800">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <h1 className="text-xl font-black text-[#16324F]">
            Límite de remates activos alcanzado
          </h1>
          <p className="text-xs text-[#243447] max-w-md mx-auto leading-relaxed">
            Tenés <strong>3 remates activos</strong> en simultáneo. Para publicar uno nuevo, esperá a que finalice alguno de tus remates en curso o cancelalo desde tu panel.
          </p>
          <div className="pt-2 flex justify-center gap-3">
            <Link
              href="/remates"
              className="inline-flex min-h-[44px] items-center rounded-xl bg-[#16324F] px-4 py-2 text-xs font-bold text-white hover:bg-[#0F243A]"
            >
              Ver remates activos
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#16324F] text-[#F6C445]">
            <Gavel className="h-5 w-5" />
          </div>
          <h1 className="text-2xl font-black text-[#16324F]">
            Publicá un Remate en Vivo
          </h1>
        </div>
        <p className="text-xs text-[#5C6B82]">
          Fijá un precio de salida accesible y una duración. Los usuarios pujarán en tiempo real hasta el cierre del reloj.
        </p>
      </div>

      <AuctionForm
        categories={categories}
        commissionBps={settings?.commissionBps ?? 400}
        isMPConfigured={isMercadoPagoConfigured()}
      />
    </div>
  );
}
