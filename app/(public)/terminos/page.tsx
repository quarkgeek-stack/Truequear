import Link from "next/link";
import { ShieldCheck, ArrowLeft, Gavel, Handshake, AlertTriangle } from "lucide-react";

export const metadata = {
  title: "Términos y Condiciones de Uso",
};

export default function TerminosPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-8 py-6">
      <div className="space-y-2">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-[#75AADB] hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Volver al inicio</span>
        </Link>
        <h1 className="text-3xl font-black text-[#16324F]">
          Términos y Condiciones de Uso
        </h1>
        <p className="text-xs text-[#5C6B82]">
          Última actualización: Noviembre 2026 • TruequeAR
        </p>
      </div>

      {/* 1. Naturaleza de la plataforma */}
      <section className="rounded-2xl border border-[#E2EAF2] bg-white p-6 shadow-sm space-y-3">
        <div className="flex items-center gap-2.5">
          <Handshake className="h-5 w-5 text-[#75AADB]" />
          <h2 className="text-lg font-bold text-[#16324F]">
            1. Naturaleza de la plataforma
          </h2>
        </div>
        <p className="text-xs text-[#3D5270] leading-relaxed">
          TruequeAR es una plataforma web y comunitaria de clasificados que conecta a personas para realizar compraventas y permutas de bienes usados de manera directa. TruequeAR no es propietaria, no vende, no compra ni custodia los bienes publicados ni el dinero correspondiente al precio de los mismos. La transacción material, verificación del estado y entrega del objeto son exclusiva responsabilidad de los usuarios involucrados.
        </p>
      </section>

      {/* 2. Módulo de Remates y Subastas (Sección Oficial) */}
      <section className="rounded-2xl border-2 border-[#16324F] bg-white p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#16324F] text-[#F6C445]">
            <Gavel className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-black text-[#16324F]">
              2. Reglas del Módulo de Remates
            </h2>
            <p className="text-xs text-[#5C6B82]">
              Condiciones específicas aplicables a publicaciones con modalidad de subasta por tiempo
            </p>
          </div>
        </div>

        <ul className="space-y-3 text-xs text-[#3D5270]">
          <li className="flex items-start gap-2.5">
            <span className="font-black text-[#16324F]">•</span>
            <span>
              <strong>Aviso con cierre por tiempo:</strong> El remate es una modalidad de aviso clasificado con un cronómetro de cierre programado. TruequeAR no es parte de la venta, no interviene en la entrega ni actúa como martillero público.
            </span>
          </li>

          <li className="flex items-start gap-2.5">
            <span className="font-black text-[#16324F]">•</span>
            <span>
              <strong>Oferta en firme:</strong> Al ingresar una puja (manual o con tope automático), el usuario asume una oferta en firme y vinculante hasta el vencimiento del cronómetro.
            </span>
          </li>

          <li className="flex items-start gap-2.5">
            <span className="font-black text-[#16324F]">•</span>
            <span>
              <strong>Sin custodia ni garantía de cumplimiento:</strong> TruequeAR no garantiza que el ganador pague el precio ofrecido ni que el vendedor entregue el bien. Ambas partes coordinan el medio de pago directo y el intercambio a través del chat habilitado.
            </span>
          </li>

          <li className="flex items-start gap-2.5">
            <span className="font-black text-[#16324F]">•</span>
            <span>
              <strong>Precio de reserva:</strong> Si el vendedor definió un precio de reserva confidencial y la puja más alta no alcanza dicho valor al término del reloj, el remate concluye sin venta obligatoria.
            </span>
          </li>

          <li className="flex items-start gap-2.5">
            <span className="font-black text-[#16324F]">•</span>
            <span>
              <strong>Seguridad, fraudes y bajas de cuenta:</strong> Se prohíbe terminantemente ofertar en remates propios o mediante cuentas interpuestas. El incumplimiento reiterado de compromisos asumidos, maniobras fraudulentas o conductas lesivas facultará a TruequeAR a suspender o cancelar de forma inmediata y definitiva la cuenta del infractor.
            </span>
          </li>
        </ul>
      </section>

      {/* 3. Seguridad en encuentros y responsabilidad */}
      <section className="rounded-2xl border border-[#E2EAF2] bg-white p-6 shadow-sm space-y-3">
        <div className="flex items-center gap-2.5">
          <AlertTriangle className="h-5 w-5 text-amber-600" />
          <h2 className="text-lg font-bold text-[#16324F]">
            3. Seguridad y puntos de encuentro
          </h2>
        </div>
        <p className="text-xs text-[#3D5270] leading-relaxed">
          Se aconseja a todos los usuarios pactar intercambios personales en lugares públicos concurridos e iluminados (cafés, estaciones, centros comerciales) y revisar exhaustivamente el funcionamiento y estado del producto antes de completar cualquier transferencia de fondos. TruequeAR no responde por robos, estafas ni diferencias entre el estado publicado y el recibido.
        </p>
      </section>
    </div>
  );
}
