import { NextResponse } from "next/server";
import { z } from "zod";
import { verifyAndProcessMPWebhook } from "@/lib/mercadopago";

const webhookSchema = z.object({
  id: z.union([z.string(), z.number()]).optional(),
  type: z.string().optional(),
  topic: z.string().optional(),
  data: z
    .object({
      id: z.union([z.string(), z.number()]).optional(),
    })
    .optional(),
});

export async function POST(request: Request) {
  try {
    const url = new URL(request.url);
    const queryDataId = url.searchParams.get("data.id") || url.searchParams.get("id");

    let bodyRaw: unknown = {};
    try {
      bodyRaw = await request.json();
    } catch {
      bodyRaw = {};
    }

    const parsed = webhookSchema.safeParse(bodyRaw);
    const paymentId =
      (parsed.success && (parsed.data.data?.id ?? parsed.data.id)) || queryDataId;

    if (!paymentId) {
      return NextResponse.json({ received: true, ignored: "no_payment_id" }, { status: 200 });
    }

    const result = await verifyAndProcessMPWebhook(String(paymentId));
    return NextResponse.json({ received: true, ...result }, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error procesando webhook";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
