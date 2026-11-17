# TruequeAR

## 1. Qué es

**TruequeAR** es una plataforma argentina de compraventa y permuta de artículos usados (venta en pesos, trueque mano a mano o ambos). Los usuarios publican sus usados, se contactan por chat interno y coordinan el pago del producto y la entrega directamente entre ellos.

La plataforma **no envía ni custodia el dinero del producto**: únicamente cobra una comisión baja (por defecto 4%) cuando la operación se cierra como venta en plata. Los trueques puros tienen 0% de comisión.

---

## 2. Requisitos

- **Node.js 22+** (compatible también con Node 24)
- **Docker** y Docker Compose (para levantar PostgreSQL 16 local con `docker compose up -d`). *Nota: si el entorno local no tiene Docker instalado, `npm run dev` levanta automáticamente una instancia PostgreSQL local en el puerto `5432`.*

---

## 3. Instalación

Ejecutá los siguientes comandos en orden desde la raíz del proyecto:

```bash
cp .env.example .env
docker compose up -d
npm i
npx prisma migrate dev
npx prisma db seed
npm run dev
```

*(En Windows PowerShell podés usar `Copy-Item .env.example .env`).*

`npx prisma db seed` inicializa únicamente categorías, subcategorías y `PlatformSetting` (`commissionBps = 400`), sin usuarios ni avisos ficticios. Si por algún motivo querés cargar datos de ejemplo en desarrollo, existe el script separado `npm run seed:demo`.

Una vez iniciado el servidor de desarrollo, abrí `http://localhost:3000`.

Comandos de verificación:

```bash
npm run typecheck
npm test
npm run build
```

---

## 4. Dónde se guarda cada cosa

Las cuentas, avisos, chats, tratos y calificaciones viven en Postgres. No hay otra base.

- **Cuentas, avisos, mensajes, tratos** → Postgres (`DATABASE_URL`).
- **Fotos** → la misma base (como data URL comprimida en el cliente a máx. 1200px, JPEG calidad ~0.7), mientras no haya S3/R2. Con las cinco variables `S3_*` configuradas, pasan al bucket y la base solo guarda la URL pública.
- **Límites:** 4 fotos por publicación, 500 KB útiles cada una (el servidor rechaza cualquier imagen mayor a 700 KB o que no comience con `data:image/jpeg`, `data:image/png` o `data:image/webp`).

---

## 5. Variables de entorno y Administradores

Definidas en `.env.example` (nunca commitees `.env`):

### Base de datos y Auth.js
- `DATABASE_URL`: String de conexión a PostgreSQL (en local `docker-compose.yml`, en producción Neon o el Postgres configurado).
- `AUTH_SECRET`: Secreto para firmar las sesiones JWT de Auth.js (generar con `openssl rand -base64 32`).
- `AUTH_URL`: URL base de autenticación para Auth.js (en local `http://localhost:3000`).
- `NEXT_PUBLIC_APP_URL`: URL pública base de la app (en local `http://localhost:3000`).
- `ADMIN_EMAILS`: Lista de emails separados por coma (ej. `tu@email.com,otro@email.com`). Cualquier usuario que se registre o ingrese con un email incluido en esta lista recibe automáticamente el rol `ADMIN` para acceder a `/admin`.

### Google OAuth (opcional)
- `AUTH_GOOGLE_ID`: Client ID de Google OAuth.
- `AUTH_GOOGLE_SECRET`: Client Secret de Google OAuth.

Si `AUTH_GOOGLE_ID` y `AUTH_GOOGLE_SECRET` están vacíos, el botón «Continuar con Google» no se muestra y el ingreso con email y contraseña sigue funcionando normalmente.

### MercadoPago (opcional)
- `MERCADOPAGO_ACCESS_TOKEN`: Access Token del servidor de MercadoPago. El botón de pago de comisión aparece solo cuando este token está cargado.

### Almacenamiento S3 / Cloudflare R2 (opcional)
- `S3_BUCKET`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_ENDPOINT`, `S3_PUBLIC_URL`.

---

## 6. Cómo configurar el login con Google en local y producción

1. Entrá a [Google Cloud Console](https://console.cloud.google.com/) y creá o elegí un **proyecto**.
2. Configurá la **Pantalla de consentimiento de OAuth** con tipo de usuario **Externa**.
3. Creá credenciales de tipo **ID de cliente de OAuth** → tipo de aplicación **Aplicación web**.
4. En **Orígenes autorizados de JavaScript**, agregá `http://localhost:3000` y tu dominio de producción (ej. `https://tu-app.vercel.app`).
5. En **URI de redireccionamiento autorizados**, agregá `{AUTH_URL}/api/auth/callback/google` (por ejemplo `http://localhost:3000/api/auth/callback/google` en local).
6. Copiá el Client ID y Client Secret en `AUTH_GOOGLE_ID` y `AUTH_GOOGLE_SECRET` dentro de `.env` (y `AUTH_URL="http://localhost:3000"`).

Si un usuario ya tenía cuenta con contraseña con el mismo email de Google, se vincula por email manteniendo una cuenta única. En el primer ingreso con Google, si faltan ciudad y provincia, la app redirige a `/ajustes` antes de dejar publicar.

---

## 7. MercadoPago (Checkout Pro)

- **Sin `MERCADOPAGO_ACCESS_TOKEN`:** No se muestra botón de pago ni datos falsos de cobro. Los tratos de venta pueden confirmarse igualmente y quedar en estado `ACORDADA` con el monto de comisión congelado, informando que el pago del producto se arregla entre las dos personas y que la comisión de la plataforma se va a cobrar por MercadoPago cuando las credenciales estén cargadas.
- **Con `MERCADOPAGO_ACCESS_TOKEN`:** Se habilita el botón **«Pagar comisión con MercadoPago»**, que crea una preferencia real de Checkout Pro en el servidor. El estado `COMISION_PAGADA` se asigna únicamente cuando el webhook `POST /api/mercadopago/webhook` verifica el pago aprobado contra la API de MercadoPago.
- **URLs:** Configurá en el panel de desarrolladores de MercadoPago la notificación webhook apuntando a `https://<tu-dominio>/api/mercadopago/webhook`. Las URLs de retorno vuelven a `/operaciones/[id]`.

---

## 8. Deploy (Vercel + Postgres Neon)

1. Creá una base PostgreSQL en **Neon** y cargá `DATABASE_URL` en Vercel.
2. Cargá `AUTH_SECRET`, `AUTH_URL` (tu URL `https://...`), `NEXT_PUBLIC_APP_URL` y `ADMIN_EMAILS`.
3. Opcionalmente cargá `AUTH_GOOGLE_ID`/`AUTH_GOOGLE_SECRET`, `MERCADOPAGO_ACCESS_TOKEN` y las 5 variables `S3_*`. Sin `S3_*`, las fotos se guardan comprimidas en Postgres sin necesidad de disco local.
4. El chat funciona por polling HTTP cada 2,5 segundos cuando la pestaña está activa, por lo que despliega directo en Vercel sin servidores WebSocket.
5. **Comisión:** Se configura desde `/admin` entre `100` (1%) y `800` (8%) bps (default `400` = 4%). El valor vigente se congela como snapshot en cada `Deal` al confirmarse.
