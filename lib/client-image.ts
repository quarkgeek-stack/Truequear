"use client";

const MAX_DIMENSION = 1200;
const TARGET_MAX_BYTES = 500 * 1024; // 500 KB máximo por foto ya comprimida

export async function compressImageInClient(file: File): Promise<string> {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
    throw new Error("Formato no soportado. Elegí una foto JPG, PNG o WebP.");
  }

  const bitmap = await loadImageElement(file);
  let { width, height } = bitmap;

  if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
    if (width >= height) {
      height = Math.round((height * MAX_DIMENSION) / width);
      width = MAX_DIMENSION;
    } else {
      width = Math.round((width * MAX_DIMENSION) / height);
      height = MAX_DIMENSION;
    }
  }

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("No se pudo inicializar el compresor de imagen.");
  }

  // Fondo blanco por si la imagen original tenía transparencia
  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(bitmap, 0, 0, width, height);

  const qualities = [0.7, 0.6, 0.5, 0.4];
  for (const q of qualities) {
    const dataUrl = canvas.toDataURL("image/jpeg", q);
    const approxBytes = Math.ceil((dataUrl.length * 3) / 4);
    if (approxBytes <= TARGET_MAX_BYTES && dataUrl.length <= 680 * 1024) {
      return dataUrl;
    }
  }

  // Si aún fuera grande, reducimos dimensión a 900px
  const fallbackCanvas = document.createElement("canvas");
  const scale = 900 / Math.max(width, height);
  fallbackCanvas.width = Math.max(1, Math.round(width * scale));
  fallbackCanvas.height = Math.max(1, Math.round(height * scale));
  const fCtx = fallbackCanvas.getContext("2d");
  if (!fCtx) {
    throw new Error("No se pudo comprimir la foto.");
  }
  fCtx.fillStyle = "#FFFFFF";
  fCtx.fillRect(0, 0, fallbackCanvas.width, fallbackCanvas.height);
  fCtx.drawImage(canvas, 0, 0, fallbackCanvas.width, fallbackCanvas.height);

  const finalDataUrl = fallbackCanvas.toDataURL("image/jpeg", 0.65);
  if (finalDataUrl.length > 690 * 1024) {
    throw new Error(
      "No pudimos comprimir la foto por debajo de 500 KB. Probá con otra imagen."
    );
  }
  return finalDataUrl;
}

function loadImageElement(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("No se pudo leer el archivo de imagen."));
    };
    img.src = url;
  });
}

export async function uploadCompressedImages(files: File[]): Promise<string[]> {
  const compressedDataUrls: string[] = [];
  for (const file of files) {
    const dataUrl = await compressImageInClient(file);
    compressedDataUrls.push(dataUrl);
  }

  const res = await fetch("/api/upload", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ images: compressedDataUrls }),
  });

  const data = (await res.json()) as { urls?: string[]; error?: string };
  if (!res.ok || !data.urls) {
    throw new Error(data.error || "No se pudieron procesar las imágenes.");
  }
  return data.urls;
}
