import { createServer } from "node:http";
import { accessSync } from "node:fs";
import { fileURLToPath } from "node:url";
import sirv from "sirv";

const directory = fileURLToPath(new URL("../dist/", import.meta.url));
try {
  accessSync(new URL("../dist/index.html", import.meta.url));
} catch {
  console.error("Produktionsbuild fehlt. Bitte zuerst npm run build ausführen.");
  process.exit(1);
}

const port = Number(process.env.PORT ?? 10000);
if (!Number.isInteger(port) || port < 0 || port > 65535) {
  console.error("PORT muss eine gültige Portnummer sein.");
  process.exit(1);
}

const serve = sirv(directory, { etag: true, maxAge: 0 });
const server = createServer((request, response) => {
  response.setHeader("X-Content-Type-Options", "nosniff");
  if (request.method !== "GET" && request.method !== "HEAD") {
    response.writeHead(405, { Allow: "GET, HEAD" });
    response.end("Methode nicht erlaubt.");
    return;
  }
  serve(request, response, () => {
    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Nicht gefunden.");
  });
});

server.on("error", (error) => {
  console.error(`HTTP-Server konnte nicht gestartet werden: ${error.message}`);
  process.exit(1);
});
server.listen(port, "0.0.0.0", () => {
  console.log(`Nexville Roleplay läuft auf Port ${server.address().port}.`);
});

for (const signal of ["SIGTERM", "SIGINT"]) {
  process.on(signal, () => {
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(0), 10000).unref();
  });
}
