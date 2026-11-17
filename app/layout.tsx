import type { Metadata, Viewport } from "next";
import { Fraunces, Source_Sans_3 } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/Header";
import { ServiceWorkerRegister } from "@/components/ServiceWorkerRegister";

const fraunces = Fraunces({
  subsets: ["latin"],
  weight: ["600", "700", "800"],
  variable: "--font-fraunces",
  display: "swap",
});

const sourceSans = Source_Sans_3({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  variable: "--font-source-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "TruequeAR — Comprá, vendé y permutá usados en Argentina",
    template: "%s | TruequeAR",
  },
  description:
    "Plataforma argentina de usados: venta, trueque o ambos. Publicá gratis, chateá directo con el dueño y cerrá trato sin vueltas.",
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = {
  themeColor: "#16324F",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es-AR" className={`${fraunces.variable} ${sourceSans.variable}`}>
      <body className="flex min-h-screen flex-col bg-[#D6E8F7] text-[#2C4260] antialiased">
        <ServiceWorkerRegister />
        <Header />
        <main className="mx-auto w-full min-w-0 max-w-6xl flex-1 px-3 py-5 sm:px-4 sm:py-6">
          {children}
        </main>
        <footer className="mt-12 border-t border-[#8FB0CC] bg-white py-6 text-center text-xs text-[#2C4260]">
          <div className="mx-auto max-w-6xl px-4">
            <p className="font-bold text-[#10283F]">
              TruequeAR — Usados de mano en mano en toda Argentina
            </p>
            <p className="mt-1">
              El pago y la entrega del producto se acuerdan directamente entre comprador y vendedor. TruequeAR no custodia el dinero del producto.
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
