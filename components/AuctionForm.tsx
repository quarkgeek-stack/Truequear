"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Condition, AuctionShipping } from "@prisma/client";
import { createAuctionAction } from "@/lib/auction-actions";
import { uploadCompressedImages } from "@/lib/client-image";
import { formatBpsPercent } from "@/lib/commission";
import {
  Camera,
  Trash2,
  Loader2,
  AlertCircle,
  Gavel,
  ShieldAlert,
  Clock,
  CheckCircle2,
} from "lucide-react";

interface CategoryOption {
  id: string;
  name: string;
  children: Array<{ id: string; name: string }>;
}

interface AuctionFormProps {
  categories: CategoryOption[];
  commissionBps: number;
  isMPConfigured: boolean;
}

const auctionFormSchema = z.object({
  title: z
    .string()
    .min(5, "El título debe tener al menos 5 caracteres.")
    .max(80, "Máximo 80 caracteres."),
  description: z
    .string()
    .min(10, "La descripción debe tener al menos 10 caracteres.")
    .max(4000, "Máximo 4000 caracteres."),
  condition: z.nativeEnum(Condition, {
    errorMap: () => ({ message: "Seleccioná el estado del producto." }),
  }),
  categoryId: z.string().min(1, "Seleccioná una categoría."),
  shipping: z.nativeEnum(AuctionShipping, {
    errorMap: () => ({ message: "Seleccioná quién asume el envío." }),
  }),
  basePesos: z
    .number({ invalid_type_error: "Ingresá un precio base válido." })
    .min(100, "El precio base mínimo es de $100 pesos."),
  reservePesos: z.number().nullable().optional(),
  duration: z.enum(["12h", "24h", "3d", "5d", "7d"], {
    errorMap: () => ({ message: "Seleccioná la duración del remate." }),
  }),
  commitment: z.literal(true, {
    errorMap: () => ({
      message: "Tenés que tildar el compromiso de entrega para publicar.",
    }),
  }),
  images: z
    .array(z.string().min(1))
    .min(1, "Subí al menos una foto del objeto.")
    .max(4, "Máximo 4 fotos."),
});

type AuctionFormValues = z.infer<typeof auctionFormSchema>;

export function AuctionForm({
  categories,
  commissionBps,
  isMPConfigured,
}: AuctionFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);

  const initialParent = categories[0];
  const [selectedParentId, setSelectedParentId] = useState<string>(
    initialParent?.id ?? ""
  );

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<AuctionFormValues>({
    resolver: zodResolver(auctionFormSchema),
    defaultValues: {
      title: "",
      description: "",
      condition: Condition.USADO,
      categoryId: initialParent?.children[0]?.id ?? "",
      shipping: AuctionShipping.A_CONVENIR,
      basePesos: 1000,
      reservePesos: null,
      duration: "24h",
      commitment: undefined,
      images: [],
    },
  });

  const currentImages = watch("images");
  const selectedDuration = watch("duration");
  const activeParent = categories.find((c) => c.id === selectedParentId);
  const subcategories = activeParent?.children ?? [];

  function handleParentChange(parentId: string) {
    setSelectedParentId(parentId);
    const parent = categories.find((c) => c.id === parentId);
    const firstChildId = parent?.children[0]?.id ?? "";
    setValue("categoryId", firstChildId, { shouldValidate: true });
  }

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files ? Array.from(e.target.files) : [];
    if (!files.length) return;

    const availableSlots = 4 - currentImages.length;
    if (availableSlots <= 0) {
      setUploadError("Ya subiste el máximo de 4 fotos.");
      return;
    }

    setUploadError(null);
    setIsUploading(true);

    try {
      const urls = await uploadCompressedImages(files.slice(0, availableSlots));
      setValue("images", [...currentImages, ...urls], { shouldValidate: true });
    } catch (err) {
      setUploadError(
        err instanceof Error ? err.message : "Error al procesar las fotos."
      );
    } finally {
      setIsUploading(false);
      e.target.value = "";
    }
  }

  function removeImage(idx: number) {
    const next = currentImages.filter((_, i) => i !== idx);
    setValue("images", next, { shouldValidate: true });
  }

  function onSubmit(values: AuctionFormValues) {
    setServerError(null);
    startTransition(async () => {
      const res = await createAuctionAction(values);
      if (!res.ok || !res.data) {
        setServerError(res.error ?? "Error al publicar el remate.");
        return;
      }
      router.push(`/remates/${res.data.auctionId}`);
    });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* 1. Fotos */}
      <section className="rounded-2xl border border-[#E2EAF2] bg-white p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-black text-[#16324F]">
              1. Fotos del objeto (1 a 4)
            </h2>
            <p className="text-xs text-[#5C6B82]">
              Subí fotos reales con buena luz. La primera foto será la portada 1:1.
            </p>
          </div>
          <span className="rounded-full bg-[#E7F1FA] px-2.5 py-1 text-xs font-bold text-[#16324F]">
            {currentImages.length} / 4
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {currentImages.map((url, idx) => (
            <div
              key={`${idx}-${url.slice(0, 32)}`}
              className="group relative aspect-square overflow-hidden rounded-xl border border-[#E2EAF2] bg-[#F3F8FC]"
            >
              <img
                src={url}
                alt=""
                className="h-full w-full object-cover"
              />
              {idx === 0 && (
                <span className="absolute left-2 top-2 rounded-md bg-[#16324F] px-2 py-0.5 text-[10px] font-bold text-white shadow-sm">
                  Portada
                </span>
              )}
              <button
                type="button"
                onClick={() => removeImage(idx)}
                className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-[#16324F]/85 text-white hover:bg-red-600 transition"
                title="Quitar foto"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}

          {currentImages.length < 4 && (
            <label className="flex aspect-square cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-[#75AADB] bg-[#F3F8FC] p-3 text-center text-xs font-bold text-[#16324F] transition hover:bg-[#E2EAF2]/50">
              {isUploading ? (
                <>
                  <Loader2 className="h-6 w-6 animate-spin text-[#75AADB]" />
                  <span>Comprimiendo...</span>
                </>
              ) : (
                <>
                  <Camera className="h-6 w-6 text-[#75AADB]" />
                  <span>Agregar foto</span>
                </>
              )}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                onChange={handleFileSelect}
                disabled={isUploading}
                className="hidden"
              />
            </label>
          )}
        </div>

        {uploadError && (
          <p className="text-xs font-semibold text-red-600">{uploadError}</p>
        )}
        {errors.images && (
          <p className="text-xs font-semibold text-red-600">
            {errors.images.message}
          </p>
        )}
      </section>

      {/* 2. Información del objeto */}
      <section className="rounded-2xl border border-[#E2EAF2] bg-white p-5 shadow-sm space-y-4">
        <h2 className="text-base font-black text-[#16324F]">
          2. ¿Qué estás rematando?
        </h2>

        <div>
          <label
            htmlFor="title"
            className="mb-1 block text-xs font-semibold text-[#16324F]"
          >
            Título claro del remate (máx. 80 caracteres)
          </label>
          <input
            id="title"
            type="text"
            maxLength={80}
            placeholder="Ej: Taladro percutor DeWalt 20V con 2 baterías impecable"
            {...register("title")}
            className="min-h-[48px] w-full rounded-xl border border-[#C5D4E5] bg-white px-3.5 py-2 text-sm text-[#16324F] placeholder:text-[#5C6B82] focus:border-[#75AADB] focus:outline-none"
          />
          {errors.title && (
            <p className="mt-1 text-xs font-semibold text-red-600">
              {errors.title.message}
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label
              htmlFor="parentCategory"
              className="mb-1 block text-xs font-semibold text-[#16324F]"
            >
              Rubro principal
            </label>
            <select
              id="parentCategory"
              value={selectedParentId}
              onChange={(e) => handleParentChange(e.target.value)}
              className="min-h-[48px] w-full rounded-xl border border-[#C5D4E5] bg-white px-3 py-2 text-sm font-semibold text-[#16324F] focus:border-[#75AADB] focus:outline-none"
            >
              {categories.map((parent) => (
                <option key={parent.id} value={parent.id}>
                  {parent.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="categoryId"
              className="mb-1 block text-xs font-semibold text-[#16324F]"
            >
              Subcategoría específica
            </label>
            <select
              id="categoryId"
              {...register("categoryId")}
              className="min-h-[48px] w-full rounded-xl border border-[#C5D4E5] bg-white px-3 py-2 text-sm font-semibold text-[#16324F] focus:border-[#75AADB] focus:outline-none"
            >
              {subcategories.map((sub) => (
                <option key={sub.id} value={sub.id}>
                  {sub.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label
              htmlFor="condition"
              className="mb-1 block text-xs font-semibold text-[#16324F]"
            >
              Estado físico y funcional
            </label>
            <select
              id="condition"
              {...register("condition")}
              className="min-h-[48px] w-full rounded-xl border border-[#C5D4E5] bg-white px-3 py-2 text-sm font-semibold text-[#16324F] focus:border-[#75AADB] focus:outline-none"
            >
              <option value={Condition.USADO}>Usado (buen estado)</option>
              <option value={Condition.COMO_NUEVO}>Como nuevo (impecable)</option>
              <option value={Condition.NUEVO}>Nuevo en caja cerrada</option>
              <option value={Condition.PARA_REPARAR}>Para reparar / repuestos</option>
            </select>
          </div>

          <div>
            <label
              htmlFor="shipping"
              className="mb-1 block text-xs font-semibold text-[#16324F]"
            >
              Modalidad de entrega / envío
            </label>
            <select
              id="shipping"
              {...register("shipping")}
              className="min-h-[48px] w-full rounded-xl border border-[#C5D4E5] bg-white px-3 py-2 text-sm font-semibold text-[#16324F] focus:border-[#75AADB] focus:outline-none"
            >
              <option value={AuctionShipping.A_CONVENIR}>
                A convenir (punto de encuentro o retiro)
              </option>
              <option value={AuctionShipping.COMPRADOR}>
                Envío a cargo del comprador
              </option>
              <option value={AuctionShipping.VENDEDOR}>
                Envío gratis a cargo del vendedor
              </option>
            </select>
          </div>
        </div>

        <div>
          <label
            htmlFor="description"
            className="mb-1 block text-xs font-semibold text-[#16324F]"
          >
            Descripción detallada
          </label>
          <textarea
            id="description"
            rows={4}
            placeholder="Contá el estado real del objeto, qué accesorios incluye, si tiene detalles estéticos y la zona de retiro aproximada..."
            {...register("description")}
            className="w-full rounded-xl border border-[#C5D4E5] bg-white p-3.5 text-sm text-[#16324F] placeholder:text-[#5C6B82] focus:border-[#75AADB] focus:outline-none"
          />
          {errors.description && (
            <p className="mt-1 text-xs font-semibold text-red-600">
              {errors.description.message}
            </p>
          )}
        </div>
      </section>

      {/* 3. Condiciones del remate */}
      <section className="rounded-2xl border border-[#E2EAF2] bg-white p-5 shadow-sm space-y-4">
        <h2 className="text-base font-black text-[#16324F]">
          3. Precios y Duración
        </h2>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label
              htmlFor="basePesos"
              className="mb-1 block text-xs font-semibold text-[#16324F]"
            >
              Precio de salida / base ($ ARS, mín. $100)
            </label>
            <div className="relative">
              <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-[#5C6B82]">
                $
              </span>
              <input
                id="basePesos"
                type="number"
                min={100}
                step={50}
                placeholder="1000"
                {...register("basePesos", { valueAsNumber: true })}
                className="min-h-[48px] w-full rounded-xl border border-[#C5D4E5] bg-white pl-8 pr-3 text-sm font-extrabold text-[#16324F] focus:border-[#75AADB] focus:outline-none"
              />
            </div>
            <p className="mt-1 text-[11px] text-[#5C6B82]">
              La primera oferta puede entrar exactamente por este valor.
            </p>
            {errors.basePesos && (
              <p className="mt-1 text-xs font-semibold text-red-600">
                {errors.basePesos.message}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="reservePesos"
              className="mb-1 block text-xs font-semibold text-[#16324F]"
            >
              Precio de reserva confidencial (opcional)
            </label>
            <div className="relative">
              <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-[#5C6B82]">
                $
              </span>
              <input
                id="reservePesos"
                type="number"
                min={100}
                step={100}
                placeholder="Ej: 15000 (Dejá vacío si no tenés mínimo)"
                {...register("reservePesos", {
                  setValueAs: (v) => (v === "" || v == null ? null : Number(v)),
                })}
                className="min-h-[48px] w-full rounded-xl border border-[#C5D4E5] bg-white pl-8 pr-3 text-sm text-[#16324F] focus:border-[#75AADB] focus:outline-none"
              />
            </div>
            <p className="mt-1 text-[11px] text-[#5C6B82]">
              Oculto para todos menos para vos. Si la mejor puja no llega a este valor, el remate cierra sin venta.
            </p>
          </div>
        </div>

        {/* Duración (sin date picker libre) */}
        <div>
          <label className="mb-2 block text-xs font-semibold text-[#16324F]">
            Duración del remate
          </label>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
            {[
              { id: "12h", label: "12 horas" },
              { id: "24h", label: "24 horas" },
              { id: "3d", label: "3 días" },
              { id: "5d", label: "5 días" },
              { id: "7d", label: "7 días" },
            ].map((d) => (
              <label
                key={d.id}
                className={`flex min-h-[48px] cursor-pointer items-center justify-center rounded-xl border px-3 text-xs font-black transition ${
                  selectedDuration === d.id
                    ? "border-[#16324F] bg-[#16324F] text-white shadow-sm"
                    : "border-[#C5D4E5] bg-white text-[#16324F] hover:bg-[#F3F8FC]"
                }`}
              >
                <input
                  type="radio"
                  value={d.id}
                  {...register("duration")}
                  className="sr-only"
                />
                <span>{d.label}</span>
              </label>
            ))}
          </div>
          {errors.duration && (
            <p className="mt-1 text-xs font-semibold text-red-600">
              {errors.duration.message}
            </p>
          )}
        </div>
      </section>

      {/* 4. Comisión y Compromiso de entrega */}
      <section className="rounded-2xl border-2 border-[#16324F] bg-[#FFF8E7] p-5 shadow-sm space-y-4">
        <div className="flex items-start gap-3">
          <Gavel className="h-6 w-6 shrink-0 text-[#16324F] mt-0.5" />
          <div className="space-y-1">
            <h3 className="text-sm font-black text-[#16324F]">
              Comisión de plataforma por remate exitoso
            </h3>
            <p className="text-xs text-[#243447] leading-relaxed">
              Si se vende, la comisión de TruequeAR es de{" "}
              <strong>{formatBpsPercent(commissionBps)}</strong> y la paga el
              vendedor por fuera del precio. Si no se vende, no se cobra.
            </p>
            {!isMPConfigured && (
              <p className="text-[11px] text-[#5C6B82] pt-1">
                Mercado Pago en configuración. El cobro de comisión de la plataforma se coordinará por email una vez completada la entrega.
              </p>
            )}
          </div>
        </div>

        <div className="pt-2 border-t border-[#16324F]/15">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              {...register("commitment")}
              className="mt-0.5 h-5 w-5 rounded border-[#16324F] text-[#16324F] focus:ring-[#75AADB]"
            />
            <span className="text-xs font-bold text-[#16324F] leading-snug">
              Si hay una puja ganadora, me comprometo a entregar el objeto. TruequeAR no obliga el pago ni intermedia la entrega.
            </span>
          </label>
          {errors.commitment && (
            <p className="mt-2 text-xs font-extrabold text-red-600">
              {errors.commitment.message}
            </p>
          )}
        </div>
      </section>

      {serverError && (
        <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-xs font-bold text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{serverError}</span>
        </div>
      )}

      {/* Botón de publicar */}
      <button
        type="submit"
        disabled={isPending || isUploading}
        className="flex min-h-[52px] w-full items-center justify-center gap-2 rounded-2xl bg-[#16324F] px-6 text-sm font-black text-white shadow-md transition hover:bg-[#0F243A] disabled:opacity-60"
      >
        {isPending ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin text-[#F6C445]" />
            <span>Publicando remate en vivo...</span>
          </>
        ) : (
          <>
            <Gavel className="h-5 w-5 text-[#F6C445]" />
            <span>Publicar remate ahora</span>
          </>
        )}
      </button>
    </form>
  );
}
