"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { loginSchema, registerSchema } from "@/lib/validators";
import {
  loginAction,
  registerAction,
  googleSignInAction,
} from "@/lib/actions";
import { Loader2, LogIn, UserPlus } from "lucide-react";

type LoginFormValues = z.infer<typeof loginSchema>;
type RegisterFormValues = z.infer<typeof registerSchema>;

function GoogleLogoSvg() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width="20"
      height="20"
      className="h-5 w-5 shrink-0"
      aria-hidden="true"
    >
      <path
        fill="#4285F4"
        d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.29v3.14C3.26 21.3 7.31 24 12 24z"
      />
      <path
        fill="#FBBC05"
        d="M5.28 14.24c-.24-.72-.38-1.49-.38-2.24s.14-1.52.38-2.24V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.99-3.14z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.99 3.14c.95-2.85 3.6-4.96 6.72-4.96z"
      />
    </svg>
  );
}

function GoogleAuthBlock({ googleEnabled }: { googleEnabled: boolean }) {
  const [missingEnvMsg, setMissingEnvMsg] = useState(false);

  if (googleEnabled) {
    return (
      <div className="space-y-4">
        <form action={googleSignInAction}>
          <button
            type="submit"
            className="flex min-h-[48px] w-full items-center justify-center gap-3 rounded-[12px] border border-[#DADCE0] bg-white px-4 py-2.5 text-sm font-semibold text-[#1F1F1F] transition hover:bg-[#F8F9FA]"
          >
            <GoogleLogoSvg />
            <span>Continuar con Google</span>
          </button>
        </form>

        <div className="relative flex items-center">
          <div className="flex-grow border-t border-[#C5D7E8]" />
          <span className="mx-3 shrink-0 text-xs font-semibold text-[#2C4260]">
            o
          </span>
          <div className="flex-grow border-t border-[#C5D7E8]" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={() => setMissingEnvMsg(true)}
        className="flex min-h-[48px] w-full items-center justify-center gap-3 rounded-[12px] border border-[#DADCE0] bg-white px-4 py-2.5 text-sm font-semibold text-[#1F1F1F] transition hover:bg-[#F8F9FA]"
      >
        <GoogleLogoSvg />
        <span>Continuar con Google</span>
      </button>

      {missingEnvMsg && (
        <p className="text-center text-xs font-semibold text-[#10283F]">
          Falta conectar Google. Cargá AUTH_GOOGLE_ID y AUTH_GOOGLE_SECRET
        </p>
      )}

      <div className="relative flex items-center pt-1">
        <div className="flex-grow border-t border-[#C5D7E8]" />
        <span className="mx-3 shrink-0 text-xs font-semibold text-[#2C4260]">
          o
        </span>
        <div className="flex-grow border-t border-[#C5D7E8]" />
      </div>
    </div>
  );
}

const inputClass =
  "h-[48px] w-full rounded-[12px] border border-[#8FB0CC] bg-[#F4F8FC] px-3.5 py-2 text-sm text-[#10283F] placeholder:text-[#3E5670] focus:border-[#16324F] focus:shadow-[0_0_0_3px_rgba(117,170,219,0.45)] focus:outline-none";

export function LoginForm({ googleEnabled }: { googleEnabled: boolean }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  function onSubmit(values: LoginFormValues) {
    setServerError(null);
    startTransition(async () => {
      const res = await loginAction(values);
      if (!res.ok) {
        setServerError(res.error);
        return;
      }
      router.push("/");
      router.refresh();
    });
  }

  return (
    <div className="mx-auto max-w-md py-6">
      <div className="rounded-[16px] border-[1.5px] border-[#16324F] bg-white p-6 shadow-[0_10px_28px_rgba(16,40,63,0.12)] space-y-5">
        <div className="space-y-1 text-center">
          <h1 className="text-2xl font-bold tracking-tight text-[#10283F]">
            Iniciá sesión en TruequeAR
          </h1>
          <p className="text-sm text-[#2C4260]">
            Ingresá para publicar, chatear y cerrar tratos.
          </p>
        </div>

        <GoogleAuthBlock googleEnabled={googleEnabled} />

        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
          <div>
            <label
              htmlFor="email"
              className="mb-1.5 block text-[13px] font-semibold text-[#16324F]"
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="vos@ejemplo.com"
              {...register("email")}
              className={inputClass}
            />
            {errors.email && (
              <p className="mt-1 text-xs font-medium text-red-700">
                {errors.email.message}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="password"
              className="mb-1.5 block text-[13px] font-semibold text-[#16324F]"
            >
              Contraseña
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              {...register("password")}
              className={inputClass}
            />
            {errors.password && (
              <p className="mt-1 text-xs font-medium text-red-700">
                {errors.password.message}
              </p>
            )}
          </div>

          {serverError && (
            <div className="rounded-[12px] border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs font-medium text-red-700">
              {serverError}
            </div>
          )}

          <button
            type="submit"
            disabled={isPending}
            className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-[12px] bg-[#F6C445] px-4 py-2.5 text-sm font-bold text-[#16324F] shadow-sm transition hover:bg-[#eab836] disabled:opacity-60"
          >
            {isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Ingresando...</span>
              </>
            ) : (
              <>
                <LogIn className="h-4 w-4" />
                <span>Iniciar sesión</span>
              </>
            )}
          </button>
        </form>

        <div className="border-t border-[#C5D7E8] pt-4 text-center text-sm text-[#2C4260]">
          ¿Todavía no tenés cuenta?{" "}
          <Link
            href="/registro"
            className="font-bold text-[#16324F] hover:underline"
          >
            Registrate acá
          </Link>
        </div>
      </div>
    </div>
  );
}

export function RegisterForm({ googleEnabled }: { googleEnabled: boolean }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
    },
  });

  function onSubmit(values: RegisterFormValues) {
    setServerError(null);
    startTransition(async () => {
      const res = await registerAction(values);
      if (!res.ok) {
        setServerError(res.error);
        return;
      }
      router.push("/ajustes?completar=1");
      router.refresh();
    });
  }

  return (
    <div className="mx-auto max-w-md py-6">
      <div className="rounded-[16px] border-[1.5px] border-[#16324F] bg-white p-6 shadow-[0_10px_28px_rgba(16,40,63,0.12)] space-y-5">
        <div className="space-y-1 text-center">
          <h1 className="text-2xl font-bold tracking-tight text-[#10283F]">
            Creá tu cuenta en TruequeAR
          </h1>
          <p className="text-sm text-[#2C4260]">
            Sumate para publicar tus usados, permutar o comprar directo.
          </p>
        </div>

        <GoogleAuthBlock googleEnabled={googleEnabled} />

        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
          <div>
            <label
              htmlFor="name"
              className="mb-1.5 block text-[13px] font-semibold text-[#16324F]"
            >
              Tu nombre
            </label>
            <input
              id="name"
              type="text"
              autoComplete="name"
              placeholder="Ej: Juan Pérez"
              {...register("name")}
              className={inputClass}
            />
            {errors.name && (
              <p className="mt-1 text-xs font-medium text-red-700">
                {errors.name.message}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="email"
              className="mb-1.5 block text-[13px] font-semibold text-[#16324F]"
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="vos@ejemplo.com"
              {...register("email")}
              className={inputClass}
            />
            {errors.email && (
              <p className="mt-1 text-xs font-medium text-red-700">
                {errors.email.message}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="password"
              className="mb-1.5 block text-[13px] font-semibold text-[#16324F]"
            >
              Contraseña (mínimo 8 caracteres)
            </label>
            <input
              id="password"
              type="password"
              autoComplete="new-password"
              placeholder="Mínimo 8 caracteres"
              {...register("password")}
              className={inputClass}
            />
            {errors.password && (
              <p className="mt-1 text-xs font-medium text-red-700">
                {errors.password.message}
              </p>
            )}
          </div>

          {serverError && (
            <div className="rounded-[12px] border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs font-medium text-red-700">
              {serverError}
            </div>
          )}

          <button
            type="submit"
            disabled={isPending}
            className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-[12px] bg-[#F6C445] px-4 py-2.5 text-sm font-bold text-[#16324F] shadow-sm transition hover:bg-[#eab836] disabled:opacity-60"
          >
            {isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Creando cuenta...</span>
              </>
            ) : (
              <>
                <UserPlus className="h-4 w-4" />
                <span>Registrarme</span>
              </>
            )}
          </button>
        </form>

        <div className="border-t border-[#C5D7E8] pt-4 text-center text-sm text-[#2C4260]">
          ¿Ya tenés cuenta?{" "}
          <Link
            href="/login"
            className="font-bold text-[#16324F] hover:underline"
          >
            Iniciá sesión
          </Link>
        </div>
      </div>
    </div>
  );
}
