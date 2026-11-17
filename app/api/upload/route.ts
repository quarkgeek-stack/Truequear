import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import {
  processUploadedImage,
  MAX_LISTING_IMAGES,
} from "@/lib/storage";

const jsonUploadSchema = z.object({
  images: z
    .array(z.string().min(1))
    .min(1, "Seleccioná al menos una foto.")
    .max(MAX_LISTING_IMAGES, `Podés subir hasta ${MAX_LISTING_IMAGES} fotos.`),
});

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Tenés que iniciar sesión para subir fotos." },
        { status: 401 }
      );
    }

    const contentType = request.headers.get("content-type") ?? "";

    // Flujo principal: JSON con data URLs comprimidas en el cliente
    if (contentType.includes("application/json")) {
      const rawBody = await request.json();
      const parsed = jsonUploadSchema.safeParse(rawBody);
      if (!parsed.success) {
        return NextResponse.json(
          {
            error:
              parsed.error.issues[0]?.message ?? "Datos de imagen inválidos.",
          },
          { status: 400 }
        );
      }

      const urls: string[] = [];
      for (const dataUrl of parsed.data.images) {
        const storedUrl = await processUploadedImage(dataUrl);
        urls.push(storedUrl);
      }
      return NextResponse.json({ urls });
    }

    // Soporte FormData para archivos comprimidos (máx 4 fotos, <= 700 KB c/u)
    const formData = await request.formData();
    const rawFiles = formData.getAll("files");
    const singleFile = formData.get("file");

    const files: File[] = [];
    for (const item of rawFiles) {
      if (item instanceof File) {
        files.push(item);
      }
    }
    if (files.length === 0 && singleFile instanceof File) {
      files.push(singleFile);
    }

    if (files.length === 0) {
      return NextResponse.json(
        { error: "Seleccioná al menos una imagen." },
        { status: 400 }
      );
    }

    if (files.length > MAX_LISTING_IMAGES) {
      return NextResponse.json(
        { error: `Podés subir hasta ${MAX_LISTING_IMAGES} fotos como máximo.` },
        { status: 400 }
      );
    }

    const urls: string[] = [];
    for (const file of files) {
      const url = await processUploadedImage(file);
      urls.push(url);
    }

    return NextResponse.json({ urls });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "No se pudo procesar la imagen.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
