import { PrismaClient, Condition, DealType, Province } from "@prisma/client";
import bcrypt from "bcryptjs";
import fs from "node:fs/promises";
import path from "node:path";

const prisma = new PrismaClient();

const CATEGORY_TREE: Array<{
  slug: string;
  name: string;
  color: string;
  children: Array<{ slug: string; name: string }>;
}> = [
  {
    slug: "hardware",
    name: "Hardware y Tecnología",
    color: "#145C43",
    children: [
      { slug: "celulares", name: "Celulares y Smartphones" },
      { slug: "notebooks", name: "Notebooks y Laptops" },
      { slug: "placas-de-video", name: "Placas de video" },
      { slug: "perifericos", name: "Periféricos y Monitores" },
      { slug: "consolas", name: "Consolas y Videojuegos" },
      { slug: "audio", name: "Audio y Auriculares" },
    ],
  },
  {
    slug: "hogar",
    name: "Hogar y Muebles",
    color: "#2E6F40",
    children: [
      { slug: "sillones-y-sofas", name: "Sillones y Sofás" },
      { slug: "mesas-y-sillas", name: "Mesas y Sillas" },
      { slug: "electrodomesticos", name: "Electrodomésticos" },
      { slug: "iluminacion", name: "Iluminación y Deco" },
      { slug: "colchones-y-camas", name: "Colchones y Camas" },
    ],
  },
  {
    slug: "ropa",
    name: "Ropa y Calzado",
    color: "#3B5998",
    children: [
      { slug: "camperas-y-abrigos", name: "Camperas y Abrigos" },
      { slug: "zapatillas", name: "Zapatillas y Calzado" },
      { slug: "remeras-y-buzos", name: "Remeras y Buzos" },
      { slug: "pantalones-y-jeans", name: "Pantalones y Jeans" },
      { slug: "accesorios-moda", name: "Mochilas y Accesorios" },
    ],
  },
  {
    slug: "vehiculos",
    name: "Vehículos y Accesorios",
    color: "#1E3A5F",
    children: [
      { slug: "motos", name: "Motos y Scooters" },
      { slug: "repuestos-autos", name: "Repuestos de Auto" },
      { slug: "accesorios-motos", name: "Cascos y Accesorios Moto" },
      { slug: "neumaticos-y-llantas", name: "Neumáticos y Llantas" },
      { slug: "audio-vehicular", name: "Audio para Vehículos" },
    ],
  },
  {
    slug: "herramientas",
    name: "Herramientas",
    color: "#6B4423",
    children: [
      { slug: "electricas", name: "Herramientas Eléctricas" },
      { slug: "manuales", name: "Herramientas Manuales" },
      { slug: "medicion", name: "Medición y Nivelación" },
      { slug: "soldadoras", name: "Soldadoras y Compresores" },
      { slug: "jardineria", name: "Máquinas de Jardín" },
    ],
  },
  {
    slug: "deportes",
    name: "Deportes y Bicicletas",
    color: "#0F5257",
    children: [
      { slug: "bicicletas", name: "Bicicletas y Ciclismo" },
      { slug: "fitness-y-gym", name: "Fitness y Musculación" },
      { slug: "futbol-y-equipo", name: "Fútbol y Deportes de Equipo" },
      { slug: "camping-y-pesca", name: "Camping y Pesca" },
      { slug: "tenis-y-padel", name: "Tenis y Pádel" },
    ],
  },
  {
    slug: "bebes",
    name: "Bebés y Niños",
    color: "#7A3E65",
    children: [
      { slug: "cochecitos", name: "Cochecitos y Butacas" },
      { slug: "cunas-y-muebles-bebe", name: "Cunas y Corralitos" },
      { slug: "juguetes", name: "Juguetes y Juegos" },
      { slug: "ropa-bebe", name: "Ropa de Bebé" },
    ],
  },
  {
    slug: "otros",
    name: "Otros Usados",
    color: "#4A5568",
    children: [
      { slug: "instrumentos-musicales", name: "Instrumentos Musicales" },
      { slug: "libros-y-comics", name: "Libros y Cómics" },
      { slug: "coleccionables", name: "Coleccionables y Antigüedades" },
      { slug: "fotografia", name: "Cámaras y Fotografía" },
    ],
  },
];

function escapeXml(unsafe: string): string {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

async function generatePlaceholderSvg(
  filename: string,
  title: string,
  subtitle: string,
  bgColor: string
): Promise<string> {
  const dir = path.join(process.cwd(), "public", "placeholders");
  await fs.mkdir(dir, { recursive: true });
  const shortTitle = title.length > 28 ? `${title.slice(0, 26)}…` : title;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="800" viewBox="0 0 800 800">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${bgColor}" />
      <stop offset="100%" stop-color="#0B2E22" />
    </linearGradient>
  </defs>
  <rect width="800" height="800" fill="url(#bg)" />
  <circle cx="400" cy="310" r="110" fill="rgba(255,255,255,0.1)" />
  <rect x="330" y="250" width="140" height="120" rx="16" fill="none" stroke="#ffffff" stroke-width="8" opacity="0.85" />
  <circle cx="375" cy="290" r="14" fill="#ffffff" opacity="0.85" />
  <path d="M340 355 L390 310 L425 340 L445 320 L460 355 Z" fill="#ffffff" opacity="0.75" />
  <text x="400" y="510" font-family="system-ui, -apple-system, sans-serif" font-size="34" font-weight="700" fill="#ffffff" text-anchor="middle">${escapeXml(shortTitle)}</text>
  <text x="400" y="560" font-family="system-ui, -apple-system, sans-serif" font-size="24" font-weight="500" fill="#A7F3D0" text-anchor="middle">${escapeXml(subtitle)}</text>
  <text x="400" y="720" font-family="system-ui, -apple-system, sans-serif" font-size="20" font-weight="600" fill="rgba(255,255,255,0.6)" text-anchor="middle">TruequeAR • Usados Argentina</text>
</svg>`;
  const filePath = path.join(dir, filename);
  await fs.writeFile(filePath, svg, "utf8");
  return `/placeholders/${filename}`;
}

async function generateAvatarSvg(filename: string, initials: string, bg: string): Promise<string> {
  const dir = path.join(process.cwd(), "public", "placeholders");
  await fs.mkdir(dir, { recursive: true });
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200">
  <rect width="200" height="200" rx="100" fill="${bg}" />
  <text x="100" y="118" font-family="system-ui, sans-serif" font-size="64" font-weight="700" fill="#ffffff" text-anchor="middle">${escapeXml(initials)}</text>
</svg>`;
  await fs.writeFile(path.join(dir, filename), svg, "utf8");
  return `/placeholders/${filename}`;
}

async function main() {
  console.log("Seedeando TruequeAR...");

  // 1. PlatformSetting
  await prisma.platformSetting.upsert({
    where: { id: "default" },
    update: {},
    create: {
      id: "default",
      commissionBps: 400,
      minCommissionCents: 0,
      maxCommissionCents: null,
    },
  });

  // 2. Password hash (cost 12)
  const passwordHash = await bcrypt.hash("truequear-dev", 12);

  // 3. Usuarios (1 admin + 6 usuarios de distintas ciudades argentinas)
  const adminAvatar = await generateAvatarSvg("avatar-admin.svg", "AD", "#145C43");
  await prisma.user.upsert({
    where: { email: "admin@truequear.local" },
    update: { role: "ADMIN" },
    create: {
      email: "admin@truequear.local",
      passwordHash,
      name: "Admin TruequeAR",
      city: "CABA",
      province: Province.CABA,
      bio: "Equipo de administración y moderación de TruequeAR.",
      imageUrl: adminAvatar,
      role: "ADMIN",
    },
  });

  const seedUsersData = [
    {
      email: "lucas@truequear.local",
      name: "Lucas Gómez",
      initials: "LG",
      city: "Lanús",
      province: Province.BUENOS_AIRES,
      bio: "Armo PCs y cambio hardware en Zona Sur. Siempre respondo rápido.",
      color: "#145C43",
    },
    {
      email: "sofia@truequear.local",
      name: "Sofía Fernández",
      initials: "SF",
      city: "Córdoba",
      province: Province.CORDOBA,
      bio: "Mudándome en Nueva Córdoba. Vendo muebles y cosas del depto.",
      color: "#2B6CB0",
    },
    {
      email: "martin@truequear.local",
      name: "Martín Pereyra",
      initials: "MP",
      city: "Rosario",
      province: Province.SANTA_FE,
      bio: "Ciclista y fanático de las herramientas de taller. Busco trueques copados.",
      color: "#9C4221",
    },
    {
      email: "valentina@truequear.local",
      name: "Valentina Sosa",
      initials: "VS",
      city: "Mendoza",
      province: Province.MENDOZA,
      bio: "Vendo ropa impecable y tecnología que ya no uso. Entregas por el centro.",
      color: "#6B46C1",
    },
    {
      email: "mateo@truequear.local",
      name: "Mateo Quiroga",
      initials: "MQ",
      city: "Salta",
      province: Province.SALTA,
      bio: "Músico y coleccionista de consolas retro y audio. Escucho ofertas de canje.",
      color: "#2C7A7B",
    },
    {
      email: "camila@truequear.local",
      name: "Camila Morales",
      initials: "CM",
      city: "Mar del Plata",
      province: Province.BUENOS_AIRES,
      bio: "Deportes, camping y cosas para chicos en Mardel.",
      color: "#B83280",
    },
  ];

  const usersByEmail: Record<string, { id: string; city: string; province: Province }> = {};

  for (const u of seedUsersData) {
    const avatarUrl = await generateAvatarSvg(`avatar-${u.initials.toLowerCase()}.svg`, u.initials, u.color);
    const created = await prisma.user.upsert({
      where: { email: u.email },
      update: {
        name: u.name,
        city: u.city,
        province: u.province,
        bio: u.bio,
        imageUrl: avatarUrl,
      },
      create: {
        email: u.email,
        passwordHash,
        name: u.name,
        city: u.city,
        province: u.province,
        bio: u.bio,
        imageUrl: avatarUrl,
        role: "USER",
      },
    });
    usersByEmail[u.email] = {
      id: created.id,
      city: created.city ?? u.city,
      province: created.province ?? u.province,
    };
  }

  // 4. Categorías padres e hijas
  const subcatIdBySlug: Record<string, { id: string; color: string; name: string }> = {};

  for (const parent of CATEGORY_TREE) {
    const parentCat = await prisma.category.upsert({
      where: { slug: parent.slug },
      update: { name: parent.name, parentId: null },
      create: { slug: parent.slug, name: parent.name, parentId: null },
    });

    for (const child of parent.children) {
      const childCat = await prisma.category.upsert({
        where: { slug: child.slug },
        update: { name: child.name, parentId: parentCat.id },
        create: { slug: child.slug, name: child.name, parentId: parentCat.id },
      });
      subcatIdBySlug[child.slug] = {
        id: childCat.id,
        color: parent.color,
        name: child.name,
      };
    }
  }

  // 5. 24 avisos realistas de usados (precios en pesos argentinos 2026)
  const listingsSeed = [
    {
      key: "seed-listing-01",
      ownerEmail: "lucas@truequear.local",
      title: "Placa de video Radeon RX 570 8GB GDDR5 Sapphire Nitro+",
      description:
        "Placa de video Sapphire Nitro+ RX 570 de 8GB en excelente estado. Nunca se usó para minería, solo gaming liviano (CS2, Valorant, GTA V). Se le hizo cambio de pasta térmica Arctic MX-4 hace dos meses. Incluye caja original.",
      subcatSlug: "placas-de-video",
      condition: Condition.USADO,
      dealType: DealType.AMBOS,
      pricePesos: 165000,
      tradeNotes: "Permuto por monitor 24 pulgadas IPS o procesador Ryzen 5 5600 más diferencia.",
    },
    {
      key: "seed-listing-02",
      ownerEmail: "sofia@truequear.local",
      title: "Sillón de dos cuerpos chenille gris topo impecable",
      description:
        "Sillón de 2 cuerpos tapizado en chenille antimanchas color gris topo. Mide 1,60m de ancho x 0,85m de profundidad. Estructura de madera saligna maciza y almohadones con placa soft de alta densidad. Se retira por Nueva Córdoba.",
      subcatSlug: "sillones-y-sofas",
      condition: Condition.COMO_NUEVO,
      dealType: DealType.VENTA,
      pricePesos: 340000,
      tradeNotes: null,
    },
    {
      key: "seed-listing-03",
      ownerEmail: "martin@truequear.local",
      title: "Bicicleta MTB Venzo Skyline Rodado 29 Shimano 21v",
      description:
        "Bici rodado 29 cuadro de aluminio talle M, transmisión Shimano de 21 velocidades, frenos a disco mecánicos y horquilla con suspensión y bloqueo. Cubiertas con 80% de vida útil. Lista para salir a rodar.",
      subcatSlug: "bicicletas",
      condition: Condition.USADO,
      dealType: DealType.AMBOS,
      pricePesos: 420000,
      tradeNotes: "Acepto herramientas de taller, soldadora inverter o notebook usada en parte de pago.",
    },
    {
      key: "seed-listing-04",
      ownerEmail: "valentina@truequear.local",
      title: "Samsung Galaxy A54 5G 256GB Negro Liberado",
      description:
        "Samsung A54 5G de 256GB y 8GB RAM, libre para cualquier compañía. Siempre usado con funda y vidrio templado, sin detalles ni marcas en pantalla. Se entrega con caja, cable USB-C original y dos fundas de regalo.",
      subcatSlug: "celulares",
      condition: Condition.COMO_NUEVO,
      dealType: DealType.AMBOS,
      pricePesos: 450000,
      tradeNotes: "Busco iPad o tablet Samsung línea S, o cámara mirrorless.",
    },
    {
      key: "seed-listing-05",
      ownerEmail: "martin@truequear.local",
      title: "Taladro percutor inalámbrico DeWalt 20V con 2 baterías",
      description:
        "Taladro atornillador y percutor DeWalt DCD776 20V Max. Viene con maletín plástico original, cargador rápido y 2 baterías de 2.0Ah funcionando al 100%. Uso doméstico.",
      subcatSlug: "electricas",
      condition: Condition.USADO,
      dealType: DealType.VENTA,
      pricePesos: 235000,
      tradeNotes: null,
    },
    {
      key: "seed-listing-06",
      ownerEmail: "valentina@truequear.local",
      title: "Campera inflable Columbia Omni-Heat talle M mujer",
      description:
        "Campera térmica Columbia original con interior reflectivo Omni-Heat. Talle M de mujer, color verde oscuro. Cierres impecables, súper abrigada y liviana para montaña o invierno.",
      subcatSlug: "camperas-y-abrigos",
      condition: Condition.COMO_NUEVO,
      dealType: DealType.TRUEQUE,
      pricePesos: null,
      tradeNotes: "Cambio por zapatillas de trekking talle 38 o mochila de viaje de 40L.",
    },
    {
      key: "seed-listing-07",
      ownerEmail: "lucas@truequear.local",
      title: "Notebook Lenovo ThinkPad T480 i5 8va 16GB RAM SSD 512GB",
      description:
        "Un tanque de guerra: ThinkPad T480 con Intel Core i5-8350U, 16GB de RAM DDR4 y disco SSD NVMe de 512GB. Pantalla 14 pulgadas Full HD IPS, teclado retroiluminado en español y doble batería con 5 horas de autonomía real.",
      subcatSlug: "notebooks",
      condition: Condition.USADO,
      dealType: DealType.AMBOS,
      pricePesos: 520000,
      tradeNotes: "Recibo placa de video RTX 3060 / RX 6600 XT o consola PS4 Slim.",
    },
    {
      key: "seed-listing-08",
      ownerEmail: "mateo@truequear.local",
      title: "Consola PlayStation 4 Slim 1TB con 2 joysticks originales",
      description:
        "PS4 Slim de 1TB muy cuidada, silenciosa y sin bloqueos. Incluye dos joysticks DualShock 4 originales sin drift, cable HDMI, cable de corriente y 4 juegos físicos.",
      subcatSlug: "consolas",
      condition: Condition.USADO,
      dealType: DealType.AMBOS,
      pricePesos: 390000,
      tradeNotes: "Cambio mano a mano por Nintendo Switch OLED o guitarra eléctrica Fender Squier.",
    },
    {
      key: "seed-listing-09",
      ownerEmail: "mateo@truequear.local",
      title: "Auriculares de estudio Audio-Technica ATH-M40x en caja",
      description:
        "Auriculares profesionales de monitoreo Audio-Technica ATH-M40x con sus dos cables desmontables (espiralado y liso), funda de cuero y adaptador plug 6.5mm. Almohadillas recién cambiadas.",
      subcatSlug: "audio",
      condition: Condition.COMO_NUEVO,
      dealType: DealType.TRUEQUE,
      pricePesos: null,
      tradeNotes: "Busco interfaz de audio Focusrite Scarlett Solo o micrófono condensador.",
    },
    {
      key: "seed-listing-10",
      ownerEmail: "sofia@truequear.local",
      title: "Mesa comedor escandinava 1,40m + 4 sillas Eames blancas",
      description:
        "Juego de comedor nórdico: mesa tapa laqueada blanca de 1,40 x 0,80m con patas de madera paraíso + 4 sillas Eames blancas. Todo firme y muy bien cuidado.",
      subcatSlug: "mesas-y-sillas",
      condition: Condition.USADO,
      dealType: DealType.VENTA,
      pricePesos: 260000,
      tradeNotes: null,
    },
    {
      key: "seed-listing-11",
      ownerEmail: "camila@truequear.local",
      title: "Cochecito Carestino Beverly 3 en 1 con huevito y moisés",
      description:
        "Cochecito Carestino completo color gris melange. Incluye estructura plegable de aluminio, moisés, silla paseadora reversible y huevito para el auto con base. Telas lavadas y ruedas impecables.",
      subcatSlug: "cochecitos",
      condition: Condition.USADO,
      dealType: DealType.AMBOS,
      pricePesos: 280000,
      tradeNotes: "Acepto bicicleta rodado 16 o 20 para nene o butaca de auto para niños más grandes.",
    },
    {
      key: "seed-listing-12",
      ownerEmail: "lucas@truequear.local",
      title: "Monitor Gamer LG UltraGear 24'' IPS 144Hz 1ms Full HD",
      description:
        "Monitor LG 24GN600-B de 24 pulgadas, panel IPS 144Hz con FreeSync Premium. Cero píxeles quemados ni fugas de luz. Viene con cable DisplayPort y fuente original.",
      subcatSlug: "perifericos",
      condition: Condition.COMO_NUEVO,
      dealType: DealType.VENTA,
      pricePesos: 275000,
      tradeNotes: null,
    },
    {
      key: "seed-listing-13",
      ownerEmail: "martin@truequear.local",
      title: "Soldadora Inverter Lusqtoff Iron 100 + máscara fotosensible",
      description:
        "Soldadora inverter liviana Lusqtoff Iron-100 con correa, pinza masa y porta electrodo. Incluye máscara fotosensible automática funcionando perfecto.",
      subcatSlug: "soldadoras",
      condition: Condition.USADO,
      dealType: DealType.AMBOS,
      pricePesos: 145000,
      tradeNotes: "Permuto por amoladora de banco o juego de llaves tubo Bahco / Bremen.",
    },
    {
      key: "seed-listing-14",
      ownerEmail: "camila@truequear.local",
      title: "Carpa iglú Doite 4 personas impermeable con ábside",
      description:
        "Carpa Doite para 4 personas con sobretecho completo hasta el piso, columna de agua 3000mm y varillas de fibra de vidrio. Usada en dos viajes al sur, sin roturas.",
      subcatSlug: "camping-y-pesca",
      condition: Condition.COMO_NUEVO,
      dealType: DealType.TRUEQUE,
      pricePesos: null,
      tradeNotes: "Cambio por paleta de pádel de carbono o artículos de playa / surf.",
    },
    {
      key: "seed-listing-15",
      ownerEmail: "mateo@truequear.local",
      title: "Guitarra eléctrica Squier Affinity Stratocaster Sunburst",
      description:
        "Fender Squier Stratocaster línea Affinity color Brown Sunburst con trastera de maple. Calibrada con cuerdas Ernie Ball 0.10. Incluye funda acolchada y correa.",
      subcatSlug: "instrumentos-musicales",
      condition: Condition.USADO,
      dealType: DealType.AMBOS,
      pricePesos: 380000,
      tradeNotes: "Permuto por bajo eléctrico de 4 cuerdas o pedales de efecto.",
    },
    {
      key: "seed-listing-16",
      ownerEmail: "sofia@truequear.local",
      title: "Cafetera Expreso Oster PrimaLatte automática",
      description:
        "Cafetera Oster PrimaLatte con depósito de leche desmontable para hacer espresso, latte y cappuccino con un botón. Funciona con café molido o cápsulas.",
      subcatSlug: "electrodomesticos",
      condition: Condition.USADO,
      dealType: DealType.AMBOS,
      pricePesos: 195000,
      tradeNotes: "Acepto freidora de aire grande o microondas digital en buen estado.",
    },
    {
      key: "seed-listing-17",
      ownerEmail: "valentina@truequear.local",
      title: "Zapatillas Nike Air Force 1 blancas originales talle 39 AR",
      description:
        "Nike Air Force 1 '07 blancas originales compradas en local oficial. Talle 39 Argentina (25.5 cm de plantilla). Muy pocas puestas, suela entera sin desgaste.",
      subcatSlug: "zapatillas",
      condition: Condition.COMO_NUEVO,
      dealType: DealType.VENTA,
      pricePesos: 120000,
      tradeNotes: null,
    },
    {
      key: "seed-listing-18",
      ownerEmail: "martin@truequear.local",
      title: "Caja de herramientas Bahco 94 piezas tubos y llaves crique",
      description:
        "Set completo Bahco S910 / 94 piezas con encastres de 1/4 y 1/2 pulgada en maletín original naranja y negro. No le falta ni una sola pieza.",
      subcatSlug: "manuales",
      condition: Condition.COMO_NUEVO,
      dealType: DealType.VENTA,
      pricePesos: 290000,
      tradeNotes: null,
    },
    {
      key: "seed-listing-19",
      ownerEmail: "camila@truequear.local",
      title: "Paleta de Pádel Bullpadel Vertex 03 carbono",
      description:
        "Paleta Bullpadel formato diamante, núcleo MultiEva y caras de carbono. Tiene protector en el marco y grip Hesacore puesto. Sin fisuras ni reparaciones.",
      subcatSlug: "tenis-y-padel",
      condition: Condition.USADO,
      dealType: DealType.AMBOS,
      pricePesos: 210000,
      tradeNotes: "Cambio por reloj Garmin para correr o mancuernas hexagonales.",
    },
    {
      key: "seed-listing-20",
      ownerEmail: "lucas@truequear.local",
      title: "Casco integral moto LS2 Rookie FF352 talle L negro mate",
      description:
        "Casco LS2 FF352 negro mate talle L con visor transparente antirrayas. Interior desmontable recién lavado, nunca tuvo caídas ni golpes.",
      subcatSlug: "accesorios-motos",
      condition: Condition.USADO,
      dealType: DealType.TRUEQUE,
      pricePesos: null,
      tradeNotes: "Cambio por campera de moto con protecciones o guantes de cuero.",
    },
    {
      key: "seed-listing-21",
      ownerEmail: "mateo@truequear.local",
      title: "Cámara Canon EOS Rebel T7 + lente 18-55mm IS II",
      description:
        "Cámara réflex digital Canon T7 de 24.1 MP con Wi-Fi integrado. Menos de 6.000 disparos reales. Incluye lente kit 18-55mm, batería, cargador, correa y memoria SD de 64GB.",
      subcatSlug: "fotografia",
      condition: Condition.COMO_NUEVO,
      dealType: DealType.AMBOS,
      pricePesos: 560000,
      tradeNotes: "Acepto notebook i5/Ryzen 5 o lente fijo 50mm f/1.8 más diferencia.",
    },
    {
      key: "seed-listing-22",
      ownerEmail: "sofia@truequear.local",
      title: "Lámpara de pie trípode nórdica madera con pantalla lino",
      description:
        "Lámpara de pie estilo escandinavo de 1,55m de altura en madera de paraíso y pantalla cilíndrica de lino natural. Incluye lámpara LED cálida.",
      subcatSlug: "iluminacion",
      condition: Condition.NUEVO,
      dealType: DealType.VENTA,
      pricePesos: 75000,
      tradeNotes: null,
    },
    {
      key: "seed-listing-23",
      ownerEmail: "valentina@truequear.local",
      title: "Mochila Fjällräven Kånken Classic original color mostaza",
      description:
        "Mochila Kånken Classic de 16 litros en tela Vinylon F impermeable color Ochre (mostaza). Incluye la almohadilla original en el bolsillo interno.",
      subcatSlug: "accesorios-moda",
      condition: Condition.USADO,
      dealType: DealType.AMBOS,
      pricePesos: 88000,
      tradeNotes: "Cambio por riñonera grande, termo Stanley original o auriculares inalámbricos.",
    },
    {
      key: "seed-listing-24",
      ownerEmail: "camila@truequear.local",
      title: "Kit mancuernas y barra con 30 kg en discos de fundición",
      description:
        "Par de mancuernas macizas a rosca + barra recta de 1,50m + 30 kilos totales en discos de fundición pintados (4x5kg y 4x2.5kg).",
      subcatSlug: "fitness-y-gym",
      condition: Condition.USADO,
      dealType: DealType.VENTA,
      pricePesos: 155000,
      tradeNotes: null,
    },
  ];

  const createdListings: Record<string, { id: string; ownerId: string; priceCents: number | null }> = {};

  for (let i = 0; i < listingsSeed.length; i++) {
    const item = listingsSeed[i];
    const owner = usersByEmail[item.ownerEmail];
    const subcat = subcatIdBySlug[item.subcatSlug];

    const imgUrl1 = await generatePlaceholderSvg(
      `${item.key}-1.svg`,
      item.title,
      subcat.name,
      subcat.color
    );
    const imgUrl2 = await generatePlaceholderSvg(
      `${item.key}-2.svg`,
      `${item.title} (Detalle)`,
      `${owner.city} • TruequeAR`,
      "#1E293B"
    );

    const priceCents = item.pricePesos !== null ? item.pricePesos * 100 : null;

    const listing = await prisma.listing.upsert({
      where: { id: item.key },
      update: {
        title: item.title,
        description: item.description,
        categoryId: subcat.id,
        condition: item.condition,
        dealType: item.dealType,
        priceCents,
        tradeNotes: item.tradeNotes,
        province: owner.province,
        city: owner.city,
      },
      create: {
        id: item.key,
        ownerId: owner.id,
        title: item.title,
        description: item.description,
        categoryId: subcat.id,
        condition: item.condition,
        dealType: item.dealType,
        priceCents,
        tradeNotes: item.tradeNotes,
        province: owner.province,
        city: owner.city,
        status: "ACTIVA",
      },
    });

    await prisma.listingImage.deleteMany({ where: { listingId: listing.id } });
    await prisma.listingImage.createMany({
      data: [
        { listingId: listing.id, url: imgUrl1, position: 0 },
        { listingId: listing.id, url: imgUrl2, position: 1 },
      ],
    });

    createdListings[item.key] = {
      id: listing.id,
      ownerId: owner.id,
      priceCents,
    };
  }

  // 6. 2 conversaciones con mensajes y 1 deal de ejemplo
  const listing1 = createdListings["seed-listing-01"]; // RX 570 de Lucas
  const buyer1 = usersByEmail["martin@truequear.local"]; // Martín

  const conv1 = await prisma.conversation.upsert({
    where: {
      listingId_buyerId: {
        listingId: listing1.id,
        buyerId: buyer1.id,
      },
    },
    update: {},
    create: {
      id: "seed-conv-01",
      listingId: listing1.id,
      buyerId: buyer1.id,
      sellerId: listing1.ownerId,
      lastMessageAt: new Date(),
      buyerReadAt: new Date(),
      sellerReadAt: new Date(),
    },
  });

  await prisma.message.deleteMany({ where: { conversationId: conv1.id } });
  await prisma.message.createMany({
    data: [
      {
        conversationId: conv1.id,
        senderId: buyer1.id,
        body: "¡Hola Lucas! ¿Cómo va? ¿Seguís teniendo la RX 570? ¿Aceptás $155.000 en efectivo o transferencia?",
        createdAt: new Date(Date.now() - 3600_000 * 3),
      },
      {
        conversationId: conv1.id,
        senderId: listing1.ownerId,
        body: "¡Hola Martín! Todo bien che. Sí, la tengo todavía en caja. Si cerramos en $160.000 es tuya hoy mismo.",
        createdAt: new Date(Date.now() - 3600_000 * 2),
      },
      {
        conversationId: conv1.id,
        senderId: buyer1.id,
        body: "Dale, me sirve $160.000. Ahí confirmo la operación por acá así arreglamos la entrega.",
        createdAt: new Date(Date.now() - 3600_000),
      },
    ],
  });

  // 1 Deal de ejemplo en estado ACORDADA (listo para probar el pago de comisión y luego calificar)
  const agreedPriceCents = 160000 * 100;
  const commissionBps = 400;
  const commissionCents = Math.round((agreedPriceCents * commissionBps) / 10000);

  await prisma.deal.upsert({
    where: { conversationId: conv1.id },
    update: {},
    create: {
      id: "seed-deal-01",
      conversationId: conv1.id,
      listingId: listing1.id,
      buyerId: buyer1.id,
      sellerId: listing1.ownerId,
      kind: "VENTA",
      agreedPriceCents,
      commissionBps,
      commissionCents,
      status: "ACORDADA",
      buyerConfirmedAt: new Date(Date.now() - 1800_000),
      sellerConfirmedAt: new Date(Date.now() - 900_000),
    },
  });

  // Segunda conversación: Sofía interesada en la bici de Martín
  const listing3 = createdListings["seed-listing-03"]; // Bici de Martín
  const buyer2 = usersByEmail["sofia@truequear.local"]; // Sofía

  const conv2 = await prisma.conversation.upsert({
    where: {
      listingId_buyerId: {
        listingId: listing3.id,
        buyerId: buyer2.id,
      },
    },
    update: {},
    create: {
      id: "seed-conv-02",
      listingId: listing3.id,
      buyerId: buyer2.id,
      sellerId: listing3.ownerId,
      lastMessageAt: new Date(),
      buyerReadAt: new Date(),
    },
  });

  await prisma.message.deleteMany({ where: { conversationId: conv2.id } });
  await prisma.message.createMany({
    data: [
      {
        conversationId: conv2.id,
        senderId: buyer2.id,
        body: "¡Hola Martín! Te consulto por la Venzo R29, ¿te interesa permutar por una cafetera Oster PrimaLatte más diferencia a tu favor?",
        createdAt: new Date(Date.now() - 7200_000),
      },
      {
        conversationId: conv2.id,
        senderId: listing3.ownerId,
        body: "¡Hola Sofía! ¿En qué estado está la cafetera? Contame qué diferencia tenías pensada y lo vemos.",
        createdAt: new Date(Date.now() - 5400_000),
      },
    ],
  });

  console.log("Seed completado con éxito: 1 admin, 6 usuarios, categorías, 24 avisos, 2 chats y 1 trato acordado.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
