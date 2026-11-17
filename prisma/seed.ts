import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const CATEGORY_TREE: Array<{
  slug: string;
  name: string;
  children: Array<{ slug: string; name: string }>;
}> = [
  {
    slug: "hardware",
    name: "Hardware y Tecnología",
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
    children: [
      { slug: "instrumentos-musicales", name: "Instrumentos Musicales" },
      { slug: "libros-y-comics", name: "Libros y Cómics" },
      { slug: "coleccionables", name: "Coleccionables y Antigüedades" },
      { slug: "fotografia", name: "Cámaras y Fotografía" },
    ],
  },
];

async function main() {
  console.log("Inicializando configuración base y categorías de TruequeAR...");

  // Limpiar cualquier dato demo previo (@truequear.local) si existiera
  const demoUsers = await prisma.user.findMany({
    where: { email: { endsWith: "@truequear.local" } },
    select: { id: true },
  });

  if (demoUsers.length > 0) {
    const demoUserIds = demoUsers.map((u) => u.id);
    await prisma.review.deleteMany({
      where: {
        OR: [{ authorId: { in: demoUserIds } }, { targetId: { in: demoUserIds } }],
      },
    });
    await prisma.deal.deleteMany({
      where: {
        OR: [{ buyerId: { in: demoUserIds } }, { sellerId: { in: demoUserIds } }],
      },
    });
    await prisma.message.deleteMany({
      where: { senderId: { in: demoUserIds } },
    });
    await prisma.conversation.deleteMany({
      where: {
        OR: [{ buyerId: { in: demoUserIds } }, { sellerId: { in: demoUserIds } }],
      },
    });
    await prisma.favorite.deleteMany({
      where: { userId: { in: demoUserIds } },
    });
    await prisma.listing.deleteMany({
      where: { ownerId: { in: demoUserIds } },
    });
    await prisma.user.deleteMany({
      where: { id: { in: demoUserIds } },
    });
  }

  // 1. PlatformSetting por defecto (400 bps = 4%)
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

  // 2. Categorías y subcategorías
  for (const parent of CATEGORY_TREE) {
    const parentCat = await prisma.category.upsert({
      where: { slug: parent.slug },
      update: { name: parent.name, parentId: null },
      create: { slug: parent.slug, name: parent.name, parentId: null },
    });

    for (const child of parent.children) {
      await prisma.category.upsert({
        where: { slug: child.slug },
        update: { name: child.name, parentId: parentCat.id },
        create: { slug: child.slug, name: child.name, parentId: parentCat.id },
      });
    }
  }

  console.log("Base inicializada: categorías, subcategorías y PlatformSetting (400 bps). Sin usuarios ni avisos demo.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
