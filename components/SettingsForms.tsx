"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Province } from "@prisma/client";
import { profileSchema, changePasswordSchema } from "@/lib/validators";
import { updateProfileAction, changePasswordAction } from "@/lib/actions";
import { uploadCompressedImages } from "@/lib/client-image";
import { PROVINCE_LIST } from "@/lib/constants";
import { Camera, CheckCircle2, Loader2, Lock, Save } from "lucide-react";

type ProfileFormValues = z.infer<typeof profileSchema>;
type PasswordFormValues = z.infer<typeof changePasswordSchema>;

interface SettingsFormsProps {
  user: {
    name: string;
    email: string;
    city: string | null;
    province: Province | null;
    bio: string | null;
    imageUrl: string | null;
    hasPassword: boolean;
  };
  mustCompleteLocation?: boolean;
}

export function SettingsForms({
  user,
  mustCompleteLocation = false,
}: SettingsFormsProps) {
  const router = useRouter();
  const [isPendingProfile, startProfileTransition] = useTransition();
  const [isPendingPass, startPassTransition] = useTransition();
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  const [profileMsg, setProfileMsg] = useState<{
    type: "ok" | "err";
    text: string;
  } | null>(null);

  const [passMsg, setPassMsg] = useState<{
    type: "ok" | "err";
    text: string;
  } | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: user.name,
      city: user.city ?? "",
      province: user.province ?? Province.BUENOS_AIRES,
      bio: user.bio ?? "",
      imageUrl: user.imageUrl ?? "",
    },
  });

  const currentAvatar = watch("imageUrl");

  const {
    register: registerPass,
    handleSubmit: handleSubmitPass,
    reset: resetPass,
    formState: { errors: passErrors },
  } = useForm<PasswordFormValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setProfileMsg(null);
    setIsUploadingAvatar(true);
    try {
      const urls = await uploadCompressedImages([file]);
      if (urls[0]) {
        setValue("imageUrl", urls[0], { shouldValidate: true });
      }
    } catch (err) {
      setProfileMsg({
        type: "err",
        text:
          err instanceof Error
            ? err.message
            : "No se pudo subir la foto de perfil.",
      });
    } finally {
      setIsUploadingAvatar(false);
      e.target.value = "";
    }
  }

  function onSubmitProfile(values: ProfileFormValues) {
    setProfileMsg(null);
    startProfileTransition(async () => {
      const res = await updateProfileAction(values);
      if (!res.ok) {
        setProfileMsg({ type: "err", text: res.error });
        return;
      }
      setProfileMsg({
        type: "ok",
        text: "¡Guardamos los cambios de tu perfil!",
      });
      router.refresh();
    });
  }

  function onSubmitPassword(values: PasswordFormValues) {
    setPassMsg(null);
    startPassTransition(async () => {
      const res = await changePasswordAction(values);
      if (!res.ok) {
        setPassMsg({ type: "err", text: res.error });
        return;
      }
      setPassMsg({
        type: "ok",
        text: "¡Tu contraseña se actualizó correctamente!",
      });
      resetPass();
    });
  }

  const initials = user.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="space-y-8">
      {mustCompleteLocation && (
        <div className="rounded-2xl border border-[#75AADB] bg-white p-4 text-sm font-semibold text-[#16324F] shadow-sm">
          Completá tu ciudad y provincia antes de publicar tu primer aviso.
        </div>
      )}

      {/* Formulario de Perfil */}
      <form
        onSubmit={handleSubmit(onSubmitProfile)}
        noValidate
        className="rounded-2xl border border-[#E2EAF2] bg-white p-5 shadow-sm space-y-5"
      >
        <h2 className="text-lg font-extrabold text-[#16324F]">
          Datos de tu perfil
        </h2>

        {/* Foto de perfil */}
        <div className="flex items-center gap-4">
          <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-[#75AADB] bg-[#16324F] text-xl font-extrabold text-white">
            {currentAvatar ? (
              <img
                src={currentAvatar}
                alt={user.name}
                className="h-full w-full object-cover"
              />
            ) : (
              <span>{initials || "U"}</span>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="inline-flex min-h-[44px] cursor-pointer items-center gap-2 rounded-xl border border-[#75AADB] bg-white px-4 py-2 text-xs font-bold text-[#16324F] hover:bg-[#F3F8FC]">
              {isUploadingAvatar ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin text-[#75AADB]" />
                  <span>Comprimiendo foto...</span>
                </>
              ) : (
                <>
                  <Camera className="h-4 w-4 text-[#75AADB]" />
                  <span>Cambiar foto de perfil</span>
                </>
              )}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleAvatarUpload}
                disabled={isUploadingAvatar}
                className="hidden"
              />
            </label>
            <p className="text-[11px] text-[#243447]/70">
              JPG, PNG o WebP (se comprime automáticamente a máx. 500 KB).
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label
              htmlFor="name"
              className="mb-1 block text-xs font-semibold text-[#16324F]"
            >
              Nombre completo
            </label>
            <input
              id="name"
              type="text"
              {...register("name")}
              className="min-h-[48px] w-full rounded-[12px] border border-[#C5D4E5] bg-white px-3.5 py-2 text-sm text-[#16324F] placeholder:text-[#5C6B82] focus:border-[#75AADB] focus:outline-none focus:ring-[3px] focus:ring-[#75AADB]/50"
            />
            {errors.name && (
              <p className="mt-1 text-xs font-medium text-red-600">
                {errors.name.message}
              </p>
            )}
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-[#16324F]">
              Email de tu cuenta
            </label>
            <input
              type="email"
              value={user.email}
              disabled
              className="min-h-[44px] w-full rounded-xl border border-[#E2EAF2] bg-[#F3F8FC] px-3.5 py-2 text-sm text-[#243447]/70"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label
              htmlFor="province"
              className="mb-1 block text-xs font-semibold text-[#16324F]"
            >
              Provincia argentina
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
              Ciudad / Localidad
            </label>
            <input
              id="city"
              type="text"
              placeholder="Ej: Lanús, Córdoba, Rosario..."
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

        <div>
          <label
            htmlFor="bio"
            className="mb-1 block text-xs font-semibold text-[#16324F]"
          >
            Tu bio (máx. 280 caracteres)
          </label>
          <textarea
            id="bio"
            rows={3}
            maxLength={280}
            placeholder="Contá brevemente de qué zona sos o qué tipo de productos publicás..."
            {...register("bio")}
            className="w-full rounded-xl border border-[#E2EAF2] p-3 text-sm text-[#243447] focus:border-[#75AADB] focus:outline-none"
          />
          {errors.bio && (
            <p className="mt-1 text-xs font-medium text-red-600">
              {errors.bio.message}
            </p>
          )}
        </div>

        {profileMsg && (
          <div
            className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold ${
              profileMsg.type === "ok"
                ? "border border-[#75AADB] bg-[#F3F8FC] text-[#16324F]"
                : "border border-red-200 bg-red-50 text-red-700"
            }`}
          >
            {profileMsg.type === "ok" && (
              <CheckCircle2 className="h-4 w-4 text-[#75AADB]" />
            )}
            <span>{profileMsg.text}</span>
          </div>
        )}

        <button
          type="submit"
          disabled={isPendingProfile || isUploadingAvatar}
          className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-[#16324F] px-5 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-[#0F243A] disabled:opacity-60"
        >
          {isPendingProfile ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Guardando...</span>
            </>
          ) : (
            <>
              <Save className="h-4 w-4" />
              <span>Guardar perfil</span>
            </>
          )}
        </button>
      </form>

      {/* Formulario de Cambio de Contraseña (solo si tiene password configurada) */}
      {user.hasPassword && (
        <form
          onSubmit={handleSubmitPass(onSubmitPassword)}
          noValidate
          className="rounded-2xl border border-[#E2EAF2] bg-white p-5 shadow-sm space-y-4"
        >
          <div className="flex items-center gap-2">
            <Lock className="h-5 w-5 text-[#75AADB]" />
            <h2 className="text-lg font-extrabold text-[#16324F]">
              Cambiar contraseña
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label
                htmlFor="currentPassword"
                className="mb-1 block text-xs font-semibold text-[#16324F]"
              >
                Contraseña actual
              </label>
              <input
                id="currentPassword"
                type="password"
                {...registerPass("currentPassword")}
                className="min-h-[48px] w-full rounded-[12px] border border-[#C5D4E5] bg-white px-3.5 py-2 text-sm text-[#16324F] placeholder:text-[#5C6B82] focus:border-[#75AADB] focus:outline-none focus:ring-[3px] focus:ring-[#75AADB]/50"
              />
              {passErrors.currentPassword && (
                <p className="mt-1 text-xs font-medium text-red-600">
                  {passErrors.currentPassword.message}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="newPassword"
                className="mb-1 block text-xs font-semibold text-[#16324F]"
              >
                Nueva contraseña
              </label>
              <input
                id="newPassword"
                type="password"
                {...registerPass("newPassword")}
                className="min-h-[48px] w-full rounded-[12px] border border-[#C5D4E5] bg-white px-3.5 py-2 text-sm text-[#16324F] placeholder:text-[#5C6B82] focus:border-[#75AADB] focus:outline-none focus:ring-[3px] focus:ring-[#75AADB]/50"
              />
              {passErrors.newPassword && (
                <p className="mt-1 text-xs font-medium text-red-600">
                  {passErrors.newPassword.message}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="confirmPassword"
                className="mb-1 block text-xs font-semibold text-[#16324F]"
              >
                Repetir nueva contraseña
              </label>
              <input
                id="confirmPassword"
                type="password"
                {...registerPass("confirmPassword")}
                className="min-h-[48px] w-full rounded-[12px] border border-[#C5D4E5] bg-white px-3.5 py-2 text-sm text-[#16324F] placeholder:text-[#5C6B82] focus:border-[#75AADB] focus:outline-none focus:ring-[3px] focus:ring-[#75AADB]/50"
              />
              {passErrors.confirmPassword && (
                <p className="mt-1 text-xs font-medium text-red-600">
                  {passErrors.confirmPassword.message}
                </p>
              )}
            </div>
          </div>

          {passMsg && (
            <div
              className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold ${
                passMsg.type === "ok"
                  ? "border border-[#75AADB] bg-[#F3F8FC] text-[#16324F]"
                  : "border border-red-200 bg-red-50 text-red-700"
              }`}
            >
              {passMsg.type === "ok" && (
                <CheckCircle2 className="h-4 w-4 text-[#75AADB]" />
              )}
              <span>{passMsg.text}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={isPendingPass}
            className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-[#75AADB] bg-white px-5 py-2.5 text-sm font-bold text-[#16324F] hover:bg-[#F3F8FC] disabled:opacity-60"
          >
            {isPendingPass ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Actualizando...</span>
              </>
            ) : (
              <span>Actualizar contraseña</span>
            )}
          </button>
        </form>
      )}
    </div>
  );
}
