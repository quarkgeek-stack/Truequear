import Link from "next/link";
import {
  CONDITION_LABELS,
  DEAL_TYPE_LABELS,
  PROVINCE_LIST,
} from "@/lib/constants";

interface CategoryOption {
  id: string;
  slug: string;
  name: string;
  children: Array<{ id: string; slug: string; name: string }>;
}

interface FeedFiltersProps {
  categories: CategoryOption[];
  currentParams: {
    q?: string;
    category?: string;
    province?: string;
    dealType?: string;
    condition?: string;
    min?: string;
    max?: string;
    sort?: string;
  };
}

const fieldClass =
  "h-[48px] w-full min-w-0 max-w-full rounded-[12px] border border-[#8FB0CC] bg-[#F4F8FC] px-3.5 text-sm text-[#10283F] placeholder:text-[#3E5670] focus:border-[#16324F] focus:shadow-[0_0_0_3px_rgba(117,170,219,0.45)] focus:outline-none";

export function FeedFilters({ categories, currentParams }: FeedFiltersProps) {
  const hasActiveFilters = Boolean(
    currentParams.q ||
      currentParams.category ||
      currentParams.province ||
      currentParams.dealType ||
      currentParams.condition ||
      currentParams.min ||
      currentParams.max ||
      (currentParams.sort && currentParams.sort !== "recientes")
  );

  return (
    <section
      id="filtros"
      className="rounded-[16px] border-[1.5px] border-[#16324F] bg-white p-4 shadow-[0_10px_30px_rgba(16,40,63,0.08)] sm:p-5"
    >
      <form method="GET" action="/" className="space-y-3.5">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="sm:col-span-2">
            <label
              htmlFor="q"
              className="mb-1.5 block text-[13px] font-semibold text-[#16324F]"
            >
              ¿Qué estás buscando?
            </label>
            <input
              id="q"
              name="q"
              type="search"
              defaultValue={currentParams.q ?? ""}
              placeholder="Ej: bicicleta, sillón, taladro, notebook..."
              className={fieldClass}
            />
          </div>

          <div>
            <label
              htmlFor="category"
              className="mb-1.5 block text-[13px] font-semibold text-[#16324F]"
            >
              Categoría
            </label>
            <select
              id="category"
              name="category"
              defaultValue={currentParams.category ?? ""}
              className={fieldClass}
            >
              <option value="">Todas las categorías</option>
              {categories.map((parent) => (
                <optgroup key={parent.id} label={parent.name}>
                  <option value={parent.slug}>Todo en {parent.name}</option>
                  {parent.children.map((sub) => (
                    <option key={sub.id} value={sub.slug}>
                      {sub.name}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="province"
              className="mb-1.5 block text-[13px] font-semibold text-[#16324F]"
            >
              Provincia
            </label>
            <select
              id="province"
              name="province"
              defaultValue={currentParams.province ?? ""}
              className={fieldClass}
            >
              <option value="">Toda Argentina</option>
              {PROVINCE_LIST.map((prov) => (
                <option key={prov.value} value={prov.value}>
                  {prov.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-6">
          <div>
            <label
              htmlFor="dealType"
              className="mb-1.5 block text-[13px] font-semibold text-[#16324F]"
            >
              Tipo de trato
            </label>
            <select
              id="dealType"
              name="dealType"
              defaultValue={currentParams.dealType ?? ""}
              className={fieldClass}
            >
              <option value="">Todos</option>
              {Object.entries(DEAL_TYPE_LABELS).map(([val, label]) => (
                <option key={val} value={val}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="condition"
              className="mb-1.5 block text-[13px] font-semibold text-[#16324F]"
            >
              Estado
            </label>
            <select
              id="condition"
              name="condition"
              defaultValue={currentParams.condition ?? ""}
              className={fieldClass}
            >
              <option value="">Cualquier estado</option>
              {Object.entries(CONDITION_LABELS).map(([val, label]) => (
                <option key={val} value={val}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="min"
              className="mb-1.5 block text-[13px] font-semibold text-[#16324F]"
            >
              Precio mín. ($)
            </label>
            <input
              id="min"
              name="min"
              type="number"
              min={0}
              defaultValue={currentParams.min ?? ""}
              placeholder="Ej: 50000"
              className={fieldClass}
            />
          </div>

          <div>
            <label
              htmlFor="max"
              className="mb-1.5 block text-[13px] font-semibold text-[#16324F]"
            >
              Precio máx. ($)
            </label>
            <input
              id="max"
              name="max"
              type="number"
              min={0}
              defaultValue={currentParams.max ?? ""}
              placeholder="Ej: 500000"
              className={fieldClass}
            />
          </div>

          <div>
            <label
              htmlFor="sort"
              className="mb-1.5 block text-[13px] font-semibold text-[#16324F]"
            >
              Ordenar por
            </label>
            <select
              id="sort"
              name="sort"
              defaultValue={currentParams.sort ?? "recientes"}
              className={fieldClass}
            >
              <option value="recientes">Más recientes</option>
              <option value="precio_asc">Menor precio</option>
              <option value="precio_desc">Mayor precio</option>
            </select>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <button
              type="submit"
              className="h-[48px] w-full rounded-[12px] bg-[#16324F] px-4 text-sm font-bold text-white transition hover:bg-[#10283F]"
            >
              Filtrar
            </button>
            {hasActiveFilters && (
              <Link
                href="/"
                className="flex h-[48px] w-full sm:w-auto items-center justify-center rounded-[12px] border-[1.5px] border-[#16324F] bg-white px-3 text-xs font-bold text-[#16324F] hover:bg-[#F4F8FC]"
              >
                Limpiar
              </Link>
            )}
          </div>
        </div>
      </form>
    </section>
  );
}
