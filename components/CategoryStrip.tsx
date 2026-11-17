import Link from "next/link";

interface CategoryStripProps {
  activeCategorySlug?: string;
}

const CATEGORIES = [
  { slug: "hardware", label: "Tecnología" },
  { slug: "electrodomesticos", label: "Electro" },
  { slug: "hogar", label: "Hogar" },
  { slug: "herramientas", label: "Herramientas" },
  { slug: "vehiculos", label: "Vehículos" },
  { slug: "deportes", label: "Deportes" },
  { slug: "ropa", label: "Moda y Ropa" },
  { slug: "instrumentos-musicales", label: "Música" },
  { slug: "jardin-aire-libre", label: "Jardín" },
  { slug: "bebes", label: "Bebés" },
  { slug: "juegos-juguetes", label: "Juegos" },
  { slug: "mascotas", label: "Mascotas" },
  { slug: "libros-revistas", label: "Libros" },
  { slug: "salud-belleza", label: "Salud" },
  { slug: "otros", label: "Otros" },
] as const;

function CategoryIcon({ slug, active }: { slug: string; active: boolean }) {
  const color = active ? "#FFFFFF" : "#16324F";
  const common = {
    xmlns: "http://www.w3.org/2000/svg",
    viewBox: "0 0 24 24",
    width: 28,
    height: 28,
    fill: "none",
    stroke: color,
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    className: "h-7 w-7 shrink-0",
    "aria-hidden": true,
  };

  switch (slug) {
    case "hardware":
      return (
        <svg {...common}>
          <rect x="4" y="4" width="16" height="11" rx="2" />
          <path d="M2 19h20" />
          <path d="M9 15v4" />
          <path d="M15 15v4" />
        </svg>
      );
    case "electrodomesticos":
      return (
        <svg {...common}>
          <rect x="5" y="2" width="14" height="20" rx="2" />
          <line x1="5" y1="10" x2="19" y2="10" />
          <line x1="9" y1="6" x2="9.01" y2="6" strokeWidth={2.5} />
          <line x1="9" y1="14" x2="9.01" y2="14" strokeWidth={2.5} />
        </svg>
      );
    case "hogar":
      return (
        <svg {...common}>
          <path d="M4 11V7a3 3 0 0 1 3-3h10a3 3 0 0 1 3 3v4" />
          <path d="M2 12a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5H2v-5Z" />
          <path d="M4 17v2" />
          <path d="M20 17v2" />
        </svg>
      );
    case "ropa":
      return (
        <svg {...common}>
          <path d="M16 4l4 3-2 4-2-1v10H8V10l-2 1-2-4 4-3a4 4 0 0 0 8 0Z" />
        </svg>
      );
    case "vehiculos":
      return (
        <svg {...common}>
          <path d="M5 11l2-5h10l2 5" />
          <rect x="3" y="11" width="18" height="6" rx="2" />
          <circle cx="7" cy="17" r="2" />
          <circle cx="17" cy="17" r="2" />
        </svg>
      );
    case "herramientas":
      return (
        <svg {...common}>
          <path d="M14.7 6.3a4 4 0 0 0-5.4 5.4l-5.6 5.6a2 2 0 0 0 2.8 2.8l5.6-5.6a4 4 0 0 0 5.4-5.4l-2.1 2.1-2.8-2.8 2.1-2.1Z" />
        </svg>
      );
    case "deportes":
      return (
        <svg {...common}>
          <circle cx="6.5" cy="16.5" r="3.5" />
          <circle cx="17.5" cy="16.5" r="3.5" />
          <path d="M6.5 16.5L10 9h4l3.5 7.5" />
          <path d="M10 9l-1-3h3" />
        </svg>
      );
    case "instrumentos-musicales":
      return (
        <svg {...common}>
          <path d="M9 18V5l12-2v13" />
          <circle cx="6" cy="18" r="3" />
          <circle cx="18" cy="16" r="3" />
        </svg>
      );
    case "jardin-aire-libre":
      return (
        <svg {...common}>
          <path d="M12 10a4 4 0 0 0-4-4H4v4a4 4 0 0 0 4 4" />
          <path d="M12 14a4 4 0 0 1 4-4h4v4a4 4 0 0 1-4 4" />
          <line x1="12" y1="2" x2="12" y2="22" />
        </svg>
      );
    case "bebes":
      return (
        <svg {...common}>
          <path d="M5 10h14a5 5 0 0 1-5 5H9a4 4 0 0 1-4-5Z" />
          <circle cx="9" cy="18.5" r="1.5" />
          <circle cx="16" cy="18.5" r="1.5" />
          <path d="M12 10V5a4 4 0 0 1 4 4" />
        </svg>
      );
    case "juegos-juguetes":
      return (
        <svg {...common}>
          <rect x="2" y="6" width="20" height="12" rx="4" />
          <path d="M6 12h4m-2-2v4" />
          <circle cx="15" cy="11" r="1" fill={color} />
          <circle cx="18" cy="13" r="1" fill={color} />
        </svg>
      );
    case "mascotas":
      return (
        <svg {...common}>
          <path d="M12 13c-2 0-3 1.5-3 3 0 1.5 1.5 2.5 3 2.5s3-1 3-2.5c0-1.5-1-3-3-3Z" />
          <circle cx="8" cy="10" r="1.5" />
          <circle cx="16" cy="10" r="1.5" />
          <circle cx="5.5" cy="13.5" r="1.2" />
          <circle cx="18.5" cy="13.5" r="1.2" />
        </svg>
      );
    case "libros-revistas":
      return (
        <svg {...common}>
          <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z" />
          <path d="M6 6h10" />
          <path d="M6 10h10" />
        </svg>
      );
    case "salud-belleza":
      return (
        <svg {...common}>
          <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
        </svg>
      );
    default:
      return (
        <svg {...common}>
          <rect x="3" y="8" width="18" height="12" rx="2" />
          <path d="M7 8V6a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v2" />
          <path d="M3 13h18" />
        </svg>
      );
  }
}

export function CategoryStrip({ activeCategorySlug }: CategoryStripProps) {
  return (
    <section aria-label="Categorías" className="w-full max-w-full overflow-hidden">
      <div className="no-scrollbar flex gap-2.5 overflow-x-auto pb-1 snap-x">
        {CATEGORIES.map((cat) => {
          const isActive = activeCategorySlug === cat.slug;
          const href = isActive ? "/" : `/?category=${cat.slug}`;

          return (
            <Link
              key={cat.slug}
              href={href}
              className={`snap-start flex h-[96px] min-w-[104px] flex-1 shrink-0 flex-col items-center justify-center gap-2 rounded-[16px] border px-3 text-center transition duration-150 ${
                isActive
                  ? "border-[#16324F] bg-[#16324F] text-white shadow-sm"
                  : "border-[#8FB0CC] bg-white text-[#16324F] hover:border-[#16324F]"
              }`}
            >
              <CategoryIcon slug={cat.slug} active={isActive} />
              <span className="text-[13px] font-semibold leading-tight">
                {cat.label}
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
