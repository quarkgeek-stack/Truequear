import { z } from "zod";
import { Condition, DealKind, DealType, ListingStatus, Province } from "@prisma/client";

export const MAX_PRICE_PESOS = 999_999_999;
export const MIN_PRICE_PESOS = 1;
export const MAX_IMAGE_DATA_BYTES = 700 * 1024; // 700 KB tope en servidor

function isValidImageUrlOrDataUrl(val: string): boolean {
  const trimmed = val.trim();
  if (!trimmed) return false;
  if (trimmed.startsWith("https://") || trimmed.startsWith("http://")) {
    return true;
  }
  const validPrefix =
    trimmed.startsWith("data:image/jpeg") ||
    trimmed.startsWith("data:image/png") ||
    trimmed.startsWith("data:image/webp");
  if (!validPrefix) return false;
  return new TextEncoder().encode(trimmed).length <= MAX_IMAGE_DATA_BYTES;
}

const imageStringSchema = z
  .string()
  .min(1, "Imagen inválida")
  .refine(
    isValidImageUrlOrDataUrl,
    "La imagen supera los 700 KB o no empieza con data:image/jpeg, data:image/png o data:image/webp"
  );

export const registerSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Ingresá tu nombre (mínimo 2 caracteres)")
    .max(80, "El nombre es demasiado largo"),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("Ingresá un email válido"),
  password: z
    .string()
    .min(8, "La contraseña tiene que tener al menos 8 caracteres")
    .max(100, "La contraseña es demasiado larga"),
});

export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("Ingresá un email válido"),
  password: z.string().min(1, "Ingresá tu contraseña"),
});

export const profileSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Ingresá tu nombre (mínimo 2 caracteres)")
    .max(80, "El nombre no puede superar 80 caracteres"),
  city: z
    .string()
    .trim()
    .min(2, "Ingresá tu ciudad o localidad")
    .max(80, "El nombre de la ciudad es muy largo"),
  province: z.nativeEnum(Province, {
    errorMap: () => ({ message: "Elegí una provincia" }),
  }),
  bio: z
    .string()
    .trim()
    .max(280, "La bio no puede superar los 280 caracteres")
    .optional()
    .or(z.literal("")),
  imageUrl: imageStringSchema.optional().or(z.literal("")),
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Ingresá tu contraseña actual"),
    newPassword: z
      .string()
      .min(8, "La nueva contraseña tiene que tener al menos 8 caracteres")
      .max(100, "La contraseña es demasiado larga"),
    confirmPassword: z.string().min(1, "Confirmá tu nueva contraseña"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Las contraseñas no coinciden",
    path: ["confirmPassword"],
  });

export const listingSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(4, "El título tiene que tener al menos 4 caracteres")
      .max(80, "El título no puede superar los 80 caracteres"),
    description: z
      .string()
      .trim()
      .min(10, "Contá un poco más sobre el producto (mínimo 10 caracteres)")
      .max(4000, "La descripción no puede superar los 4000 caracteres"),
    categoryId: z.string().min(1, "Elegí una subcategoría"),
    condition: z.nativeEnum(Condition, {
      errorMap: () => ({ message: "Elegí el estado del producto" }),
    }),
    dealType: z.nativeEnum(DealType, {
      errorMap: () => ({ message: "Elegí el tipo de trato" }),
    }),
    pricePesos: z.number().int().nullable().optional(),
    tradeNotes: z
      .string()
      .trim()
      .max(500, "Máximo 500 caracteres")
      .optional()
      .or(z.literal("")),
    province: z.nativeEnum(Province, {
      errorMap: () => ({ message: "Elegí la provincia" }),
    }),
    city: z
      .string()
      .trim()
      .min(2, "Ingresá la ciudad o barrio")
      .max(80, "Ciudad demasiado larga"),
    images: z
      .array(imageStringSchema)
      .min(1, "Subí al menos 1 foto real para publicar")
      .max(4, "Podés subir hasta 4 fotos"),
  })
  .superRefine((data, ctx) => {
    if (data.dealType === "VENTA" || data.dealType === "AMBOS") {
      if (
        data.pricePesos === null ||
        data.pricePesos === undefined ||
        Number.isNaN(data.pricePesos)
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Ingresá un precio en pesos",
          path: ["pricePesos"],
        });
      } else if (data.pricePesos < MIN_PRICE_PESOS) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "El precio mínimo es $1",
          path: ["pricePesos"],
        });
      } else if (data.pricePesos > MAX_PRICE_PESOS) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "El precio máximo es $999.999.999",
          path: ["pricePesos"],
        });
      }
    }

    if (data.dealType === "TRUEQUE" || data.dealType === "AMBOS") {
      if (!data.tradeNotes || data.tradeNotes.trim().length < 3) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Contá qué aceptás a cambio",
          path: ["tradeNotes"],
        });
      }
    }
  });

export const listingStatusUpdateSchema = z.object({
  listingId: z.string().min(1),
  status: z.nativeEnum(ListingStatus),
});

export const sendMessageSchema = z
  .object({
    conversationId: z.string().min(1),
    body: z
      .string()
      .trim()
      .max(2000, "El mensaje no puede superar los 2000 caracteres"),
    imageUrl: imageStringSchema.optional().nullable(),
  })
  .refine((data) => data.body.length > 0 || Boolean(data.imageUrl), {
    message: "Escribí un mensaje o adjuntá una foto",
    path: ["body"],
  });

export const confirmDealSchema = z
  .object({
    conversationId: z.string().min(1),
    kind: z.nativeEnum(DealKind),
    agreedPricePesos: z.number().int().nullable().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.kind === "VENTA") {
      if (
        data.agreedPricePesos === null ||
        data.agreedPricePesos === undefined ||
        Number.isNaN(data.agreedPricePesos)
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Ingresá el precio acordado en pesos",
          path: ["agreedPricePesos"],
        });
      } else if (data.agreedPricePesos < MIN_PRICE_PESOS) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "El precio mínimo es $1",
          path: ["agreedPricePesos"],
        });
      } else if (data.agreedPricePesos > MAX_PRICE_PESOS) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "El precio máximo es $999.999.999",
          path: ["agreedPricePesos"],
        });
      }
    }
  });

export const reviewSchema = z.object({
  dealId: z.string().min(1),
  stars: z
    .number()
    .int()
    .min(1, "Elegí entre 1 y 5 estrellas")
    .max(5, "Elegí entre 1 y 5 estrellas"),
  comment: z
    .string()
    .trim()
    .min(3, "Dejá un comentario cortito sobre la operación")
    .max(500, "El comentario no puede superar los 500 caracteres"),
});

export const platformSettingSchema = z.object({
  commissionBps: z
    .number()
    .int()
    .min(100, "La comisión mínima es 100 bps (1%)")
    .max(800, "La comisión máxima es 800 bps (8%)"),
  minCommissionCents: z.number().int().min(0).default(0),
  maxCommissionCents: z.number().int().min(0).nullable().optional(),
});
