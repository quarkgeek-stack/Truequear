import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import crypto from "node:crypto";

const ALLOWED_MIME_TYPES: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
};

const ALLOWED_DATA_PREFIXES = [
  "data:image/jpeg",
  "data:image/png",
  "data:image/webp",
];

export const MAX_SERVER_IMAGE_BYTES = 700 * 1024; // 700 KB tope estricto en servidor
export const MAX_CLIENT_IMAGE_BYTES = 500 * 1024; // 500 KB objetivo comprimido en cliente
export const MAX_LISTING_IMAGES = 4;

export function isS3Configured(): boolean {
  return Boolean(
    process.env.S3_BUCKET?.trim() &&
      process.env.S3_ACCESS_KEY_ID?.trim() &&
      process.env.S3_SECRET_ACCESS_KEY?.trim() &&
      process.env.S3_ENDPOINT?.trim() &&
      process.env.S3_PUBLIC_URL?.trim()
  );
}

export function validateStoredImageUrl(value: string): {
  valid: boolean;
  error?: string;
} {
  const trimmed = value.trim();
  if (!trimmed) {
    return { valid: false, error: "La imagen está vacía." };
  }

  // Si es URL pública de S3/R2
  if (trimmed.startsWith("https://") || trimmed.startsWith("http://")) {
    return { valid: true };
  }

  // Validar prefijo de data URL permitido
  const hasAllowedPrefix = ALLOWED_DATA_PREFIXES.some((prefix) =>
    trimmed.startsWith(prefix)
  );
  if (!hasAllowedPrefix) {
    return {
      valid: false,
      error:
        "La imagen debe empezar con data:image/jpeg, data:image/png o data:image/webp.",
    };
  }

  // Calcular tamaño en bytes (tanto del payload decodificado como del string)
  const commaIdx = trimmed.indexOf(",");
  if (commaIdx === -1) {
    return { valid: false, error: "Formato de data URL inválido." };
  }
  const base64Part = trimmed.slice(commaIdx + 1);
  const decodedByteLength = Buffer.byteLength(base64Part, "base64");
  const totalStringBytes = Buffer.byteLength(trimmed, "utf8");

  if (
    decodedByteLength > MAX_SERVER_IMAGE_BYTES ||
    totalStringBytes > MAX_SERVER_IMAGE_BYTES
  ) {
    return {
      valid: false,
      error: "La imagen supera el límite máximo permitido de 700 KB.",
    };
  }

  return { valid: true };
}

export async function processUploadedImage(
  input: File | string
): Promise<string> {
  // Si ya llega como data URL comprimida desde el cliente
  if (typeof input === "string") {
    const check = validateStoredImageUrl(input);
    if (!check.valid) {
      throw new Error(check.error);
    }

    if (!isS3Configured()) {
      return input.trim();
    }

    // Si S3 está configurado, subimos el buffer decodificado al bucket S3/R2
    const match = input.match(/^data:(image\/(?:jpeg|png|webp));base64,(.+)$/);
    if (!match) {
      throw new Error("Formato de imagen inválido.");
    }
    const mimeType = match[1];
    const buffer = Buffer.from(match[2], "base64");
    return uploadBufferToS3(buffer, mimeType);
  }

  // Si llega como archivo binario (File)
  const ext = ALLOWED_MIME_TYPES[input.type];
  if (!ext) {
    throw new Error("Formato de imagen no válido. Usá JPG, PNG o WebP.");
  }

  if (input.size === 0) {
    throw new Error("El archivo de imagen está vacío.");
  }

  if (input.size > MAX_SERVER_IMAGE_BYTES) {
    throw new Error("La imagen supera el máximo de 700 KB en el servidor.");
  }

  const arrayBuffer = await input.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  if (isS3Configured()) {
    return uploadBufferToS3(buffer, input.type);
  }

  const dataUrl = `data:${input.type};base64,${buffer.toString("base64")}`;
  const check = validateStoredImageUrl(dataUrl);
  if (!check.valid) {
    throw new Error(check.error);
  }

  return dataUrl;
}

async function uploadBufferToS3(
  buffer: Buffer,
  mimeType: string
): Promise<string> {
  const ext = ALLOWED_MIME_TYPES[mimeType] ?? ".jpg";
  const filename = `${Date.now()}-${crypto.randomUUID()}${ext}`;

  const s3 = new S3Client({
    region: "auto",
    endpoint: process.env.S3_ENDPOINT!.trim(),
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY_ID!.trim(),
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY!.trim(),
    },
    forcePathStyle: true,
  });

  const key = `listings/${filename}`;
  await s3.send(
    new PutObjectCommand({
      Bucket: process.env.S3_BUCKET!.trim(),
      Key: key,
      Body: buffer,
      ContentType: mimeType,
    })
  );

  const baseUrl = process.env.S3_PUBLIC_URL!.trim().replace(/\/$/, "");
  return `${baseUrl}/${key}`;
}
