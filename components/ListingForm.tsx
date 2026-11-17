"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Condition, DealType, Province } from "@prisma/client";
import { listingSchema } from "@/lib/validators";
import { createListingAction, updateListingAction } from "@/lib/actions";
import { uploadCompressedImages } from "@/lib/client-image";
import {
  CONDITION_LABELS,
  DEAL_TYPE_LABELS,
  PROVINCE_LIST,
} from "@/lib/constants";
import { formatNumberARS } from "@/lib/commission";
import { Camera, Loader2, Trash2, UploadCloud } from "lucide-react";

type ListingFormValues = z.infer<typeof listingSchema>;

export interface ParentCategoryOption {
  id: string;
  slug: string;
  name: string;
  children: Array<{ id: string; slug: string; name: string }>;
}

interface ListingFormProps {
  categories: ParentCategoryOption[];
  defaultProvince?: Province | null;
  defaultCity?: string | null;
  initialListing?: {
    id: string;
    title: string;
    description: string;
    categoryId: string;
    parentCategoryId: string;
    condition: Condition;
    dealType: DealType;
    priceCents: number | null;
    tradeNotes: string | null;
    province: Province;
    city: string;
    images: string[];
  };
}

export function ListingForm({
  categories,
  defaultProvince,
  defaultCity,
  initialListing,
}: ListingFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);

  const initialParentId =
    initialListing?.parentCategoryId || categories[0]?.id || "";
  const [selectedParentId, setSelectedParentId] =
    useState<string>(initialParentId);

  const initialPesos =
    initialListing?.priceCents && initialListing.priceCents > 0
      ? Math.round(initialListing.priceCents / 100)
      : null;

  const [priceDisplay, setPriceDisplay] = useState<string>(
    initialPesos ? formatNumberARS(initialPesos) : ""
  );

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<ListingFormValues>({
    resolver: zodResolver(listingSchema),
    defaultValues: {
      title: initialListing?.title ?? "",
      description: initialListing?.description ?? "",
      categoryId:
        initialListing?.categoryId ??
        categories.find((c) => c.id === initialParentId)?.children[0]?.id ??
        "",
      condition: initialListing?.condition ?? Condition.USADO,
      dealType: initialListing?.dealType ?? DealType.AMBOS,
      pricePesos: initialPesos,
      tradeNotes: initialListing?.tradeNotes ?? "",
      province:
        initialListing?.province ?? defaultProvince ?? Province.BUENOS_AIRES,
      city: initialListing?.city ?? defaultCity ?? "",
      images: initialListing?.images ?? [],
    },
  });

  const currentImages = watch("images");
  const currentDealType = watch("dealType");

  const activeParent = categories.find((c) => c.id === selectedParentId);
  const subcategories = activeParent?.children ?? [];

  function handleParentChange(newParentId: string) {
    setSelectedParentId(newParentId);
    const parent = categories.find((c) => c.id === newParentId);
    const firstChildId = parent?.children[0]?.id ?? "";
    setValue("categoryId", firstChildId, { shouldValidate: true });
  }

  function handlePriceInput(raw: string) {
    const digitsOnly = raw.replace(/\D/g, "");
    if (!digitsOnly) {
      setPriceDisplay("");
      setValue("pricePesos", null, { shouldValidate: true });
      return;
    }
    const numeric = parseInt(digitsOnly, 10);
    setPriceDisplay(formatNumberARS(numeric));
    setValue("pricePesos", numeric, { shouldValidate: true });
  }

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;

    setUploadError(null);
    const remainingSlots = 4 - currentImages.length;
    if (remainingSlots <= 0) {
      setUploadError("Ya alcanzaste el máximo de 4 fotos.");
      return;
    }

    const selectedFiles = Array.from(fileList).slice(0, remainingSlots);

    setIsUploading(true);
    try {
      const urls = await uploadCompressedImages(selectedFiles);
      const nextImgs = [...currentImages, ...urls].slice(0, 4);
      setValue("images", nextImgs, { shouldValidate: true });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "No se pudieron subir las fotos.";
      setUploadError(message);
    } finally {
      setIsUploading(false);
      e.target.value = "";
    }
  }

  function removeImage(indexToRemove: number) {
    const nextImgs = currentImages.filter((_, idx) => idx !== indexToRemove);
    setValue("images", nextImgs, { shouldValidate: true });
  }

  function onSubmit(values: ListingFormValues) {
    setServerError(null);
    startTransition(async () => {
      const res = initialListing
        ? await updateListingAction(initialListing.id, values)
        : await createListingAction(values);

      if (!res.ok) {
        setServerError(res.error);
        return;
      }

      if (res.data?.id) {
        router.push(`/aviso/${res.data.id}`);
        router.refresh();
      }
    });
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      noValidate
      className="mx-auto max-w-2xl space-y-6"
    >
      {/* 1. Fotos primero */}
      <section className="rounded-2xl border border-[#D5E4F2] bg-white p-5 shadow-[0_8px_24px_rgba(22,50,79,0.06)] space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-[#16324F]">
              1. Fotos reales del producto
            </h2>
            <p className="text-xs text-[#3D5270]">
              Subí de 1 a 4 fotos reales (se comprimen automáticamente a máx. 1200px y hasta 500 KB cada una).
            </p>
          </div>
          <span className="rounded-full border border-[#D5E4F2] bg-[#E7F1FA] px-2.5 py-1 text-xs font-bold text-[#16324F]">
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
                alt={`Foto ${idx + 1}`}
                className="h-full w-full object-cover"
              />
              {idx === 0 && (
                <span className="absolute left-2 top-2 rounded-md bg-[#16324F] px-2 py-0.5 text-[10px] font-bold text-white">
                  Portada
                </span>
              )}
              <button
                type="button"
                onClick={() => removeImage(idx)}
                className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-[#16324F]/85 text-white hover:bg-red-600"
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
                  <span>Agregar fotos</span>
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
          <p className="text-xs font-medium text-red-600">{uploadError}</p>
        )}
        {errors.images && (
          <p className="text-xs font-medium text-red-600">
            {errors.images.message}
          </p>
        )}
      </section>

      {/* 2. Qué publicás y Categoría en 2 pasos */}
      <section className="rounded-2xl border border-[#E2EAF2] bg-white p-5 shadow-sm space-y-4">
        <h2 className="text-base font-bold text-[#16324F]">
          2. Qué estás publicando
        </h2>

        <div>
          <label
            htmlFor="title"
            className="mb-1 block text-xs font-semibold text-[#16324F]"
          >
            Título del aviso (máx. 80 caracteres)
          </label>
          <input
            id="title"
            type="text"
            maxLength={80}
            placeholder="Ej: Bicicleta MTB Venzo Rodado 29 talle M impecable"
            {...register("title")}
            className="min-h-[48px] w-full rounded-[12px] border border-[#C5D4E5] bg-white px-3.5 py-2 text-sm text-[#16324F] placeholder:text-[#5C6B82] focus:border-[#75AADB] focus:outline-none focus:ring-[3px] focus:ring-[#75AADB]/50"
          />
          {errors.title && (
            <p className="mt-1 text-xs font-medium text-red-600">
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
              1. Rubro o Categoría Principal
            </label>
            <select
              id="parentCategory"
              value={selectedParentId}
              onChange={(e) => handleParentChange(e.target.value)}
              className="min-h-[48px] w-full rounded-[12px] border border-[#C5D4E5] bg-white px-3 py-2 text-sm font-semibold text-[#16324F] focus:border-[#75AADB] focus:outline-none focus:ring-[3px] focus:ring-[#75AADB]/50"
            >
              {categories.map((parent) => (
                <option key={parent.id} value={parent.id}>
                  {parent.name}
                </option>
              ))}
            </select>
            <p className="mt-1 text-[11px] text-[#5C6B82]">
              Elegí el rubro general (Tecnología, Hogar, Herramientas, etc.)
            </p>
          </div>

          <div>
            <label
              htmlFor="categoryId"
              className="mb-1 block text-xs font-semibold text-[#16324F]"
            >
              2. Subcategoría específica
            </label>
            <select
              id="categoryId"
              {...register("categoryId")}
              className="min-h-[48px] w-full rounded-[12px] border border-[#C5D4E5] bg-white px-3 py-2 text-sm font-semibold text-[#16324F] focus:border-[#75AADB] focus:outline-none focus:ring-[3px] focus:ring-[#75AADB]/50"
            >
              {subcategories.map((sub) => (
                <option key={sub.id} value={sub.id}>
                  {sub.name}
                </option>
              ))}
            </select>
            <p className="mt-1 text-[11px] text-[#5C6B82]">
              Tipo específico de artículo que estás ofreciendo
            </p>
            {errors.categoryId && (
              <p className="mt-1 text-xs font-medium text-red-600">
                {errors.categoryId.message}
              </p>
            )}
          </div>
        </div>

        {activeParent && (
          <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-[#D5E4F2] bg-[#F3F8FC] px-3.5 py-2.5 text-xs text-[#16324F]">
            <span className="font-bold text-[#75AADB]">📍 Tu publicación se verá en:</span>
            <span className="font-extrabold text-[#16324F]">{activeParent.name}</span>
            <span className="text-[#75AADB]">›</span>
            <span className="font-bold text-[#1F497D]">
              {subcategories.find((s) => s.id === watch("categoryId"))?.name ?? "Seleccioná subcategoría"}
            </span>
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label
              htmlFor="condition"
              className="mb-1 block text-xs font-semibold text-[#16324F]"
            >
              Estado del producto
            </label>
            <select
              id="condition"
              {...register("condition")}
              className="min-h-[48px] w-full rounded-[12px] border border-[#C5D4E5] bg-white px-3 py-2 text-sm text-[#16324F] focus:border-[#75AADB] focus:outline-none focus:ring-[3px] focus:ring-[#75AADB]/50"
            >
              {Object.entries(CONDITION_LABELS).map(([val, label]) => (
                <option key={val} value={val}>
                  {label}
                </option>
              ))}
            </select>
            {errors.condition && (
              <p className="mt-1 text-xs font-medium text-red-600">
                {errors.condition.message}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="dealType"
              className="mb-1 block text-xs font-semibold text-[#16324F]"
            >
              Tipo de trato
            </label>
            <select
              id="dealType"
              {...register("dealType")}
              className="min-h-[48px] w-full rounded-[12px] border border-[#C5D4E5] bg-white px-3 py-2 text-sm text-[#16324F] focus:border-[#75AADB] focus:outline-none focus:ring-[3px] focus:ring-[#75AADB]/50"
            >
              {Object.entries(DEAL_TYPE_LABELS).map(([val, label]) => (
                <option key={val} value={val}>
                  {label}
                </option>
              ))}
            </select>
            {errors.dealType && (
              <p className="mt-1 text-xs font-medium text-red-600">
                {errors.dealType.message}
              </p>
            )}
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
            rows={5}
            maxLength={4000}
            placeholder="Contá el estado real, tiempo de uso, accesorios incluidos y por qué zona se retira..."
            {...register("description")}
            className="w-full rounded-xl border border-[#E2EAF2] p-3.5 text-sm text-[#243447] focus:border-[#75AADB] focus:outline-none"
          />
          {errors.description && (
            <p className="mt-1 text-xs font-medium text-red-600">
              {errors.description.message}
            </p>
          )}
        </div>
      </section>

      {/* 3 y 4. Precio y Condiciones de Trueque */}
      <section className="rounded-2xl border border-[#E2EAF2] bg-white p-5 shadow-sm space-y-4">
        <h2 className="text-base font-bold text-[#16324F]">
          3. Valor y condiciones del trato
        </h2>

        {currentDealType !== "TRUEQUE" && (
          <div>
            <label
              htmlFor="priceDisplay"
              className="mb-1 block text-xs font-semibold text-[#16324F]"
            >
              Precio en pesos argentinos ($ ARS)
            </label>
            <div className="relative">
              <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-[#243447]/60">
                $
              </span>
              <input
                id="priceDisplay"
                type="text"
                inputMode="numeric"
                value={priceDisplay}
                onChange={(e) => handlePriceInput(e.target.value)}
                placeholder="165.000"
                className="min-h-[44px] w-full rounded-xl border border-[#E2EAF2] pl-8 pr-4 py-2 text-base font-bold text-[#16324F] focus:border-[#75AADB] focus:outline-none"
              />
            </div>
            {errors.pricePesos && (
              <p className="mt-1 text-xs font-medium text-red-600">
                {errors.pricePesos.message}
              </p>
            )}
          </div>
        )}

        {currentDealType !== "VENTA" && (
          <div>
            <label
              htmlFor="tradeNotes"
              className="mb-1 block text-xs font-semibold text-[#16324F]"
            >
              ¿Qué aceptás a cambio?
            </label>
            <textarea
              id="tradeNotes"
              rows={2}
              maxLength={500}
              placeholder="Ej: Permuto por monitor 24 pulgadas, herramientas eléctricas o bici..."
              {...register("tradeNotes")}
              className="w-full rounded-xl border border-[#E2EAF2] p-3 text-sm text-[#243447] focus:border-[#75AADB] focus:outline-none"
            />
            {errors.tradeNotes && (
              <p className="mt-1 text-xs font-medium text-red-600">
                {errors.tradeNotes.message}
              </p>
            )}
          </div>
        )}
      </section>

      {/* 4. Ubicación */}
      <section className="rounded-2xl border border-[#E2EAF2] bg-white p-5 shadow-sm space-y-4">
        <h2 className="text-base font-bold text-[#16324F]">
          4. Dónde se encuentra
        </h2>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label
              htmlFor="province"
              className="mb-1 block text-xs font-semibold text-[#16324F]"
            >
              Provincia
            </label>
            <select
              id="province"
              {...register("province")}
              className="min-h-[48px] w-full rounded-[12px] border border-[#C5D4E5] bg-white px-3 py-2 text-sm text-[#16324F] focus:border-[#75AADB] focus:outline-none focus:ring-[3px] focus:ring-[#75AADB]/50"
            >
              {PROVINCE_LIST.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
            {errors.province && (
              <p className="mt-1 text-xs font-medium text-red-600">
                {errors.province.message}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="city"
              className="mb-1 block text-xs font-semibold text-[#16324F]"
            >
              Ciudad / Localidad / Barrio
            </label>
            <input
              id="city"
              type="text"
              placeholder="Ej: Lanús, Nueva Córdoba, Caballito..."
              {...register("city")}
              className="min-h-[48px] w-full rounded-[12px] border border-[#C5D4E5] bg-white px-3.5 py-2 text-sm text-[#16324F] placeholder:text-[#5C6B82] focus:border-[#75AADB] focus:outline-none focus:ring-[3px] focus:ring-[#75AADB]/50"
            />
            {errors.city && (
              <p className="mt-1 text-xs font-medium text-red-600">
                {errors.city.message}
              </p>
            )}
          </div>
        </div>
      </section>

      {serverError && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {serverError}
        </div>
      )}

      <button
        type="submit"
        disabled={isPending || isUploading}
        className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl bg-[#16324F] px-6 py-3 text-base font-bold text-white shadow-sm transition hover:bg-[#0F243A] disabled:opacity-60"
      >
        {isPending ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>
              {initialListing ? "Guardando cambios..." : "Publicando aviso..."}
            </span>
          </>
        ) : (
          <>
            <UploadCloud className="h-5 w-5 text-[#F6C445]" />
            <span>
              {initialListing ? "Guardar cambios" : "Publicar aviso ahora"}
            </span>
          </>
        )}
      </button>
    </form>
  );
}
