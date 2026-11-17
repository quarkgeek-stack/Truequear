import Link from "next/link";

interface CategoryStripProps {
  activeCategorySlug?: string;
}

const CATEGORIES = [
  { slug: "hardware", label: "Hardware" },
  { slug: "hogar", label: "Hogar" },
  { slug: "ropa", label: "Ropa" },
  { slug: "vehiculos", label: "Vehículos" },
  { slug: "herramientas", label: "Herramientas" },
  { slug: "deportes", label: "Deportes" },
  { slug: "bebes", label: "Bebés" },
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
    case "bebes":
      return (
        <svg {...common}>
          <path d="M5 10h14a5 5 0 0 1-5 5H9a4 4 0 0 1-4-5Z" />
          <circle cx="9" cy="18.5" r="1.5" />
          <circle cx="16" cy="18.5" r="1.5" />
          <path d="M12 10V5a4 4 0 0 1 4 4" />
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
