import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const CATEGORY_TREE: Array<{
  slug: string;
  name: string;
  children: Array<{ slug: string; name: string }>;
}> = [
  {
    slug: "hardware",
    name: "Tecnología e Informática",
    children: [
      { slug: "celulares", name: "Celulares y Smartphones" },
      { slug: "notebooks", name: "Notebooks y Laptops" },
      { slug: "componentes-pc", name: "Componentes de PC (Mothers, CPU, RAM)" },
      { slug: "placas-de-video", name: "Placas de video" },
      { slug: "almacenamiento", name: "Discos SSD, HDD y Memorias" },
      { slug: "fuentes-y-gabinetes", name: "Fuentes, Gabinetes y Refrigeración" },
      { slug: "perifericos", name: "Periféricos y Monitores" },
      { slug: "consolas", name: "Consolas y Videojuegos" },
      { slug: "audio", name: "Audio, Auriculares y Parlantes" },
      { slug: "tablets-e-readers", name: "Tablets y E-readers" },
      { slug: "smartwatches", name: "Smartwatches y Wearables" },
      { slug: "camaras-drones", name: "Cámaras, Fotografía y Drones" },
      { slug: "impresoras-insumos", name: "Impresoras y Escáneres" },
    ],
  },
  {
    slug: "electrodomesticos",
    name: "Electrodomésticos y Climatización",
    children: [
      { slug: "heladeras-freezers", name: "Heladeras y Freezers" },
      { slug: "lavarropas-secarropas", name: "Lavarropas y Secarropas" },
      { slug: "aires-ventiladores", name: "Aires Acondicionados y Ventiladores" },
      { slug: "estufas-calefactores", name: "Estufas, Calefactores y Termotanques" },
      { slug: "microondas-hornos", name: "Microondas, Hornos y Anafes" },
      { slug: "pequenos-electro", name: "Licuadoras, Cafeteras y Pequeños Electros" },
      { slug: "televisores-smart", name: "Smart TVs y Reproductores" },
      { slug: "aspiradoras-limpieza", name: "Aspiradoras y Planchas" },
    ],
  },
  {
    slug: "hogar",
    name: "Hogar, Muebles y Decoración",
    children: [
      { slug: "sillones-y-sofas", name: "Sillones, Sofás y Futones" },
      { slug: "mesas-y-sillas", name: "Mesas, Sillas y Banquetas" },
      { slug: "colchones-y-camas", name: "Colchones, Sommiers y Camas" },
      { slug: "placards-roperos", name: "Placards, Roperos y Cómodas" },
      { slug: "escritorios-oficina", name: "Escritorios y Sillas de Oficina" },
      { slug: "iluminacion", name: "Lámparas e Iluminación" },
      { slug: "bazar-cocina", name: "Bazar, Vajilla, Ollas y Sartenes" },
      { slug: "decoracion-espejos", name: "Cuadros, Espejos y Adornos" },
    ],
  },
  {
    slug: "herramientas",
    name: "Herramientas y Construcción",
    children: [
      { slug: "electricas", name: "Herramientas Eléctricas y a Batería" },
      { slug: "manuales", name: "Herramientas Manuales (Llaves, Pinzas, etc.)" },
      { slug: "soldadoras", name: "Soldadoras, Compresores y Generadores" },
      { slug: "medicion", name: "Medición, Niveles Láser y Calibres" },
      { slug: "escaleras-andamios", name: "Escaleras, Caballetes y Andamios" },
      { slug: "cajas-organizadores", name: "Cajas de Herramientas y Organizadores" },
      { slug: "materiales-construccion", name: "Materiales y Accesorios de Obra" },
    ],
  },
  {
    slug: "vehiculos",
    name: "Vehículos y Repuestos",
    children: [
      { slug: "autos-camionetas", name: "Autos y Camionetas" },
      { slug: "motos", name: "Motos, Ciclomotores y Scooters" },
      { slug: "repuestos-autos", name: "Repuestos y Mecánica de Auto" },
      { slug: "repuestos-motos", name: "Repuestos y Mecánica de Moto" },
      { slug: "accesorios-motos", name: "Cascos, Camisas e Indumentaria Moto" },
      { slug: "neumaticos-y-llantas", name: "Neumáticos, Ruedas y Llantas" },
      { slug: "audio-vehicular", name: "Audio, Parlantes y Estéreos" },
      { slug: "nautica-cuatriciclos", name: "Cuatriciclos, UTVs y Náutica" },
    ],
  },
  {
    slug: "deportes",
    name: "Deportes y Bicicletas",
    children: [
      { slug: "bicicletas", name: "Bicicletas y Ciclismo (MTB, Ruta, Paseo)" },
      { slug: "fitness-y-gym", name: "Pesas, Barras, Mancuernas y Gimnasio" },
      { slug: "cintas-fijas", name: "Bicicletas Fijas y Cintas de Correr" },
      { slug: "futbol-y-equipo", name: "Fútbol, Básquet y Deportes de Equipo" },
      { slug: "tenis-y-padel", name: "Paletas de Pádel, Raquetas y Tenis" },
      { slug: "camping-y-pesca", name: "Carpas, Cañas de Pescar y Camping" },
      { slug: "patines-skate", name: "Rollers, Patines y Skates" },
      { slug: "deportes-acuaticos", name: "Tablas, Trajes de Neoprene y Natación" },
    ],
  },
  {
    slug: "ropa",
    name: "Ropa, Calzado y Moda",
    children: [
      { slug: "zapatillas", name: "Zapatillas Urbanas y Deportivas" },
      { slug: "camperas-y-abrigos", name: "Camperas, Tapados y Abrigos" },
      { slug: "remeras-y-buzos", name: "Buzos, Hoodies y Remeras" },
      { slug: "pantalones-y-jeans", name: "Jeans, Pantalones y Bermudas" },
      { slug: "ropa-deportiva", name: "Conjuntos y Ropa de Entrenamiento" },
      { slug: "accesorios-moda", name: "Mochilas, Bolsos, Riñoneras y Carteras" },
      { slug: "relojes-lentes", name: "Relojes, Lentes de Sol y Accesorios" },
      { slug: "calzado-formal", name: "Zapatos, Botas y Sandalias" },
    ],
  },
  {
    slug: "instrumentos-musicales",
    name: "Instrumentos Musicales y Audio Pro",
    children: [
      { slug: "guitarras-bajos", name: "Guitarras Criollas, Eléctricas y Bajos" },
      { slug: "teclados-pianos", name: "Teclados, Sintetizadores y Pianos" },
      { slug: "baterias-percusion", name: "Baterías, Platillos y Percusión" },
      { slug: "amplificadores-pedales", name: "Amplificadores, Pedales y Efectos" },
      { slug: "microfonos-consolas", name: "Micrófonos, Placas de Audio y Consolas" },
      { slug: "instrumentos-viento", name: "Vientos (Saxos, Trompetas, Flautas)" },
      { slug: "accesorios-musica", name: "Fundas, Cables, Pies y Afinadores" },
    ],
  },
  {
    slug: "jardin-aire-libre",
    name: "Jardín, Piletas y Aire Libre",
    children: [
      { slug: "jardineria", name: "Cortadoras de Césped, Bordeadoras y Motosierras" },
      { slug: "piletas-accesorios", name: "Piletas de Lona, Filtros y Limpiafondos" },
      { slug: "muebles-jardin", name: "Reposeras, Sombrillas y Muebles de Exterior" },
      { slug: "parrillas-asadores", name: "Parrillas, Discos, Chulengos y Asadores" },
      { slug: "plantas-macetas", name: "Macetas, Riego y Accesorios de Jardín" },
    ],
  },
  {
    slug: "bebes",
    name: "Bebés y Niños",
    children: [
      { slug: "cochecitos", name: "Cochecitos, Huevitos y Butacas de Auto" },
      { slug: "cunas-y-muebles-bebe", name: "Cunas, Colechos y Moisés" },
      { slug: "sillas-comer-andadores", name: "Sillas de Comer, Andadores y Gimnasios" },
      { slug: "ropa-bebe", name: "Ropa, Calzado y Abrigo infantil" },
      { slug: "juguetes-primera-infancia", name: "Juguetes Didácticos para Bebés" },
    ],
  },
  {
    slug: "juegos-juguetes",
    name: "Juegos, Juguetes y Coleccionables",
    children: [
      { slug: "juguetes", name: "Juguetes, Muñecos y Pistas" },
      { slug: "juegos-de-mesa", name: "Juegos de Mesa y Rompecabezas" },
      { slug: "figuras-coleccion", name: "Figuras de Acción, Anime y Funkos" },
      { slug: "cartas-tcg", name: "Cartas Coleccionables (Pokémon, Magic, etc.)" },
      { slug: "videojuegos-retro", name: "Cartuchos y Consolas Retro" },
    ],
  },
  {
    slug: "mascotas",
    name: "Mascotas y Accesorios",
    children: [
      { slug: "cuchas-camas", name: "Cuchas, Colchonetas y Camas" },
      { slug: "transportadoras-jaulas", name: "Transportadoras, Mochilas y Caniles" },
      { slug: "acuarios-peces", name: "Peceras, Filtros y Accesorios de Acuario" },
      { slug: "paseo-correas", name: "Arneses, Correas y Rascadores para Gatos" },
    ],
  },
  {
    slug: "libros-revistas",
    name: "Libros, Revistas y Cómics",
    children: [
      { slug: "libros-estudio", name: "Libros Escolares, Universitarios y Manuales" },
      { slug: "novelas-ficcion", name: "Novelas, Literatura y Ficción" },
      { slug: "libros-y-comics", name: "Cómics, Mangas y Novelas Gráficas" },
      { slug: "revistas-coleccion", name: "Revistas y Diarios de Colección" },
    ],
  },
  {
    slug: "salud-belleza",
    name: "Salud, Belleza y Cuidado",
    children: [
      { slug: "cuidado-cabello", name: "Secadores de Pelo, Planchitas y Cortapelos" },
      { slug: "estetica-masajes", name: "Masajeadores y Equipos de Estética" },
      { slug: "ortopedia-movilidad", name: "Sillas de Ruedas, Muletas y Ortopedia" },
    ],
  },
  {
    slug: "otros",
    name: "Otros Usados y Varios",
    children: [
      { slug: "coleccionables", name: "Antigüedades, Monedas y Billetes" },
      { slug: "fotografia", name: "Ópticas, Binoculares y Telescopios" },
      { slug: "varios", name: "Varios y Artículos Inclasificables" },
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
