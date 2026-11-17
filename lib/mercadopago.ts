import { MercadoPagoConfig, Preference, Payment as MPPayment } from "mercadopago";
import { db } from "@/lib/db";

export function isMercadoPagoConfigured(): boolean {
  return Boolean(process.env.MERCADOPAGO_ACCESS_TOKEN?.trim());
}

function getMPClient(): MercadoPagoConfig {
  const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN?.trim();
  if (!accessToken) {
    throw new Error("MERCADOPAGO_ACCESS_TOKEN no está configurado");
  }
  return new MercadoPagoConfig({ accessToken });
}

export async function createOrProcessCommissionPayment(dealId: string): Promise<{
  checkoutUrl: string;
}> {
  if (!isMercadoPagoConfigured()) {
    throw new Error(
      "El cobro de comisiones por MercadoPago aún no está habilitado."
    );
  }

  const deal = await db.deal.findUnique({
    where: { id: dealId },
    include: {
      listing: true,
      payment: true,
    },
  });

  if (!deal) {
    throw new Error("La operación no existe");
  }

  if (deal.kind !== "VENTA") {
    throw new Error("Los trueques puros no pagan comisión");
  }

  if (deal.status !== "ACORDADA") {
    throw new Error("La operación todavía no fue acordada por ambas partes");
  }

  if (deal.commissionCents <= 0) {
    throw new Error("El monto de comisión es inválido");
  }

  const client = getMPClient();
  const preference = new Preference(client);
  const appUrl = (
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.AUTH_URL ||
    "http://localhost:3000"
  ).replace(/\/$/, "");
  const returnUrl = `${appUrl}/operaciones/${deal.id}`;
  const unitPricePesos = Number((deal.commissionCents / 100).toFixed(2));

  const response = await preference.create({
    body: {
      items: [
        {
          id: deal.id,
          title: `Comisión TruequeAR - ${deal.listing.title}`,
          quantity: 1,
          currency_id: "ARS",
          unit_price: unitPricePesos,
        },
      ],
      external_reference: deal.id,
      back_urls: {
        success: returnUrl,
        pending: returnUrl,
        failure: returnUrl,
      },
      auto_return: "approved",
      notification_url: `${appUrl}/api/mercadopago/webhook`,
    },
  });

  const checkoutUrl = response.init_point || response.sandbox_init_point;
  if (!checkoutUrl) {
    throw new Error("MercadoPago no devolvió una URL de pago");
  }

  await db.payment.upsert({
    where: { dealId: deal.id },
    update: {
      provider: "MERCADOPAGO",
      status: "PENDING",
      checkoutUrl,
    },
    create: {
      dealId: deal.id,
      provider: "MERCADOPAGO",
      status: "PENDING",
      checkoutUrl,
    },
  });

  return { checkoutUrl };
}

export async function verifyAndProcessMPWebhook(mpPaymentId: string): Promise<{
  processed: boolean;
  status?: string;
}> {
  if (!isMercadoPagoConfigured()) {
    return { processed: false, status: "mp_not_configured" };
  }

  const existingByExternal = await db.payment.findUnique({
    where: { externalId: String(mpPaymentId) },
  });

  if (existingByExternal && existingByExternal.status === "APPROVED") {
    return { processed: true, status: "already_approved" };
  }

  const client = getMPClient();
  const mpPayment = new MPPayment(client);
  const paymentData = await mpPayment.get({ id: mpPaymentId });

  const dealId = paymentData.external_reference;
  const mpStatus = paymentData.status;

  if (!dealId) {
    return { processed: false, status: "missing_external_reference" };
  }

  const deal = await db.deal.findUnique({
    where: { id: dealId },
  });

  if (!deal) {
    return { processed: false, status: "deal_not_found" };
  }

  if (mpStatus === "approved") {
    await db.$transaction(async (tx) => {
      await tx.payment.upsert({
        where: { dealId: deal.id },
        update: {
          provider: "MERCADOPAGO",
          status: "APPROVED",
          externalId: String(mpPaymentId),
        },
        create: {
          dealId: deal.id,
          provider: "MERCADOPAGO",
          status: "APPROVED",
          externalId: String(mpPaymentId),
        },
      });

      if (
        deal.status === "ACORDADA" ||
        deal.status === "PENDIENTE_CONFIRMACION"
      ) {
        await tx.deal.update({
          where: { id: deal.id },
          data: { status: "COMISION_PAGADA" },
        });
      }

      await tx.listing.update({
        where: { id: deal.listingId },
        data: { status: "VENDIDA" },
      });
    });

    return { processed: true, status: "approved" };
  }

  if (mpStatus === "rejected" || mpStatus === "cancelled") {
    await db.payment.upsert({
      where: { dealId: deal.id },
      update: {
        provider: "MERCADOPAGO",
        status: "REJECTED",
        externalId: String(mpPaymentId),
      },
      create: {
        dealId: deal.id,
        provider: "MERCADOPAGO",
        status: "REJECTED",
        externalId: String(mpPaymentId),
      },
    });
    return { processed: true, status: "rejected" };
  }

  return { processed: true, status: mpStatus ?? "pending" };
}
