import net from "node:net";
import { spawn } from "node:child_process";
import path from "node:path";

function checkPort(port = 5432, host = "127.0.0.1") {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(1000);
    socket.once("connect", () => {
      socket.destroy();
      resolve(true);
    });
    socket.once("timeout", () => {
      socket.destroy();
      resolve(false);
    });
    socket.once("error", () => {
      socket.destroy();
      resolve(false);
    });
    socket.connect(port, host);
  });
}

async function main() {
  const isUp = await checkPort(5432);
  if (isUp) {
    return;
  }

  console.log("Iniciando instancia PostgreSQL local en puerto 5432...");
  const daemonPath = path.resolve(process.cwd(), "scripts", "pg-daemon.mjs");
  const child = spawn(process.execPath, [daemonPath], {
    detached: true,
    stdio: "ignore",
    windowsHide: true,
  });
  child.unref();

  for (let i = 0; i < 60; i++) {
    await new Promise((r) => setTimeout(r, 1000));
    if (await checkPort(5432)) {
      console.log("PostgreSQL listo en localhost:5432");
      return;
    }
  }

  console.error("No se pudo conectar a PostgreSQL en el puerto 5432.");
  process.exit(1);
}

main();
