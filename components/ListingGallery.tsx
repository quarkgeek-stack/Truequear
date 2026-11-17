"use client";

import { useState } from "react";

interface ListingGalleryProps {
  images: Array<{ id: string; url: string }>;
  title: string;
}

export function ListingGallery({ images, title }: ListingGalleryProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const current = images[activeIndex] ?? images[0];

  if (!current) {
    return (
      <div className="flex aspect-square w-full items-center justify-center rounded-2xl border border-[#E2EAF2] bg-white text-sm font-semibold text-[#243447]">
        Sin foto
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="relative aspect-square w-full overflow-hidden rounded-2xl border border-[#E2EAF2] bg-white shadow-sm">
        <img
          src={current.url}
          alt={`${title} - Foto ${activeIndex + 1}`}
          className="h-full w-full object-cover"
        />
      </div>

      {images.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {images.map((img, idx) => (
            <button
              key={img.id}
              type="button"
              onClick={() => setActiveIndex(idx)}
              className={`relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border-2 transition ${
                idx === activeIndex
                  ? "border-[#75AADB] ring-2 ring-[#75AADB]/30"
                  : "border-[#E2EAF2] opacity-75 hover:opacity-100"
              }`}
            >
              <img
                src={img.url}
                alt={`Miniatura ${idx + 1}`}
                className="h-full w-full object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
