import Link from "next/link";
import { auth } from "@/lib/auth";
import { logoutAction } from "@/lib/actions";
import {
  PlusCircle,
  MessageSquare,
  User,
  Heart,
  Package,
  Handshake,
  ShieldCheck,
  LogOut,
  Search,
  Gavel,
} from "lucide-react";

function TruequeARLogo() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 36 36"
      width="36"
      height="36"
      className="h-8 w-8 sm:h-9 sm:w-9 shrink-0"
      aria-hidden="true"
    >
      <circle cx="18" cy="18" r="18" fill="#FFFFFF" />
      <circle cx="18" cy="18" r="6.5" fill="#F6C445" />
      <g stroke="#F6C445" strokeWidth="2.2" strokeLinecap="round">
        <line x1="18" y1="5.5" x2="18" y2="8.5" />
        <line x1="18" y1="27.5" x2="18" y2="30.5" />
        <line x1="5.5" y1="18" x2="8.5" y2="18" />
        <line x1="27.5" y1="18" x2="30.5" y2="18" />
        <line x1="9.16" y1="9.16" x2="11.28" y2="11.28" />
        <line x1="24.72" y1="24.72" x2="26.84" y2="26.84" />
        <line x1="26.84" y1="9.16" x2="24.72" y2="11.28" />
        <line x1="11.28" y1="24.72" x2="9.16" y2="26.84" />
      </g>
    </svg>
  );
}

export async function Header() {
  const session = await auth();
  const user = session?.user;

  return (
    <header className="sticky top-0 z-40 w-full bg-[#16324F] text-white shadow-sm">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-1.5 px-3 py-2 sm:gap-2 sm:px-4 sm:py-2.5">
        <Link
          href="/"
          className="flex min-h-[44px] shrink-0 items-center gap-2 tracking-tight text-base sm:gap-2.5 sm:text-xl"
        >
          <TruequeARLogo />
          <span className="font-bold">
            <span className="text-white">Trueque</span>
            <span className="text-[#F6C445]">AR</span>
          </span>
        </Link>

        <nav className="flex items-center gap-1 sm:gap-2">
          <Link
            href="/#filtros"
            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-[12px] px-2 text-white transition hover:bg-white/10"
            title="Buscar en el feed"
          >
            <Search className="h-5 w-5 text-white" />
            <span className="sr-only sm:not-sr-only sm:ml-1.5 sm:text-sm sm:font-semibold">
              Buscar
            </span>
          </Link>

          <Link
            href="/remates"
            className="flex min-h-[44px] items-center justify-center gap-1.5 rounded-[12px] bg-[#F6C445] px-2.5 py-2 text-xs font-black text-[#16324F] transition hover:bg-[#F6C445]/90 sm:px-3 sm:text-sm"
          >
            <Gavel className="h-4 w-4 shrink-0 text-[#16324F]" />
            <span>Remates</span>
          </Link>

          <Link
            href="/publicar"
            className="flex min-h-[44px] items-center justify-center gap-1.5 rounded-[12px] bg-white px-3 py-2 text-xs font-bold text-[#16324F] transition hover:bg-[#E7F1FA] sm:px-3.5 sm:text-sm"
          >
            <PlusCircle className="h-4 w-4 shrink-0 text-[#16324F]" />
            <span>Publicar</span>
          </Link>

          {user ? (
            <>
              <Link
                href="/chat"
                className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-[12px] px-2 text-white hover:bg-white/10"
                title="Tus chats"
              >
                <MessageSquare className="h-5 w-5" />
                <span className="hidden md:ml-1.5 md:inline md:text-sm md:font-semibold">
                  Chats
                </span>
              </Link>

              <Link
                href="/operaciones"
                className="hidden sm:flex min-h-[44px] items-center justify-center rounded-[12px] px-2.5 text-white hover:bg-white/10"
                title="Tus operaciones"
              >
                <Handshake className="h-5 w-5" />
                <span className="hidden lg:ml-1.5 lg:inline lg:text-sm lg:font-semibold">
                  Operaciones
                </span>
              </Link>

              <Link
                href="/mis-publicaciones"
                className="hidden sm:flex min-h-[44px] items-center justify-center rounded-[12px] px-2.5 text-white hover:bg-white/10"
                title="Tus publicaciones"
              >
                <Package className="h-5 w-5" />
                <span className="hidden lg:ml-1.5 lg:inline lg:text-sm lg:font-semibold">
                  Mis cosas
                </span>
              </Link>

              <Link
                href="/favoritos"
                className="hidden md:flex min-h-[44px] min-w-[44px] items-center justify-center rounded-[12px] px-2 text-white hover:bg-white/10"
                title="Favoritos"
              >
                <Heart className="h-5 w-5" />
              </Link>

              {user.role === "ADMIN" && (
                <Link
                  href="/admin"
                  className="hidden sm:flex min-h-[44px] min-w-[44px] items-center justify-center rounded-[12px] border-[1.5px] border-[#F6C445] bg-transparent px-2.5 text-[#F6C445] hover:bg-white/10"
                  title="Panel Admin"
                >
                  <ShieldCheck className="h-5 w-5" />
                  <span className="hidden lg:ml-1 lg:inline lg:text-xs lg:font-bold">
                    Admin
                  </span>
                </Link>
              )}

              <Link
                href="/perfil"
                className="hidden sm:flex min-h-[44px] min-w-[44px] items-center justify-center rounded-[12px] px-2 text-white hover:bg-white/10"
                title="Mi perfil"
              >
                <User className="h-5 w-5" />
                <span className="hidden xl:ml-1.5 xl:inline xl:text-sm xl:font-semibold">
                  Perfil
                </span>
              </Link>

              <form action={logoutAction} className="hidden sm:block">
                <button
                  type="submit"
                  className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-[12px] px-2 text-white/90 hover:bg-white/10 hover:text-white"
                  title="Cerrar sesión"
                >
                  <LogOut className="h-5 w-5" />
                  <span className="sr-only">Salir</span>
                </button>
              </form>
            </>
          ) : (
            <Link
              href="/login"
              className="flex min-h-[44px] items-center justify-center rounded-[12px] border-[1.5px] border-white bg-transparent px-3 py-2 text-xs font-bold text-white transition hover:bg-white/10 sm:px-3.5 sm:text-sm"
            >
              Ingresar
            </Link>
          )}
        </nav>
      </div>

      {user && (
        <div className="flex sm:hidden flex-wrap items-center justify-around gap-x-1 border-t border-white/15 bg-[#10283F] px-2 py-1 text-xs font-semibold text-white">
          <Link
            href="/mis-publicaciones"
            className="flex min-h-[44px] items-center gap-1 px-1.5"
          >
            <Package className="h-3.5 w-3.5 text-[#F6C445]" />
            <span>Mis cosas</span>
          </Link>
          <Link
            href="/operaciones"
            className="flex min-h-[44px] items-center gap-1 px-1.5"
          >
            <Handshake className="h-3.5 w-3.5 text-[#F6C445]" />
            <span>Operaciones</span>
          </Link>
          <Link
            href="/favoritos"
            className="flex min-h-[44px] items-center gap-1 px-1.5"
          >
            <Heart className="h-3.5 w-3.5 text-[#F6C445]" />
            <span>Favoritos</span>
          </Link>
          <Link
            href="/perfil"
            className="flex min-h-[44px] items-center gap-1 px-1.5"
          >
            <User className="h-3.5 w-3.5 text-[#F6C445]" />
            <span>Perfil</span>
          </Link>
          {user.role === "ADMIN" && (
            <Link
              href="/admin"
              className="flex min-h-[44px] items-center gap-1 px-1.5 text-[#F6C445]"
            >
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>Admin</span>
            </Link>
          )}
          <form action={logoutAction}>
            <button
              type="submit"
              className="flex min-h-[44px] items-center gap-1 px-1.5 text-white/90"
              title="Cerrar sesión"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span>Salir</span>
            </button>
          </form>
        </div>
      )}
    </header>
  );
}
