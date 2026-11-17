import EmbeddedPostgres from "embedded-postgres";
import path from "node:path";
import fs from "node:fs";

const dbDir = path.resolve(process.cwd(), ".pgdata");

async function startDaemon() {
  const pg = new EmbeddedPostgres({
    databaseDir: dbDir,
    user: "postgres",
    password: "password",
    port: 5432,
    persistent: true,
  });

  if (!fs.existsSync(path.join(dbDir, "PG_VERSION"))) {
    await pg.initialise();
  }

  await pg.start();

  try {
    await pg.createDatabase("truequear");
  } catch {
    // Database already exists
  }

  console.log("Local PostgreSQL listening on 5432 (database: truequear)");

  // Keep process alive
  setInterval(() => {}, 60_000);
}

startDaemon().catch((err) => {
  console.error("Failed to start embedded postgres:", err);
  process.exit(1);
});
