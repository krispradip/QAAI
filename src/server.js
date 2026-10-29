import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { dirname, extname, resolve, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import worker from "./worker.js";

// EKS Node.js entry point. Retains the existing DevOps static-file and API
// routing pattern; only AI-provider runtime bindings change from Gemini.
const publicDirectory = resolve(dirname(fileURLToPath(import.meta.url)), "../public");
const contentTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon"
};

async function serveAsset(request) {
  if (!["GET", "HEAD"].includes(request.method)) {
    return new Response("Method not allowed", { status: 405, headers: { allow: "GET, HEAD" } });
  }
  let pathname;
  try {
    pathname = decodeURIComponent(new URL(request.url).pathname);
  } catch {
    return new Response("Bad request", { status: 400 });
  }
  const filename = resolve(publicDirectory, `.${pathname === "/" ? "/index.html" : pathname}`);
  if (!filename.startsWith(`${publicDirectory}${sep}`)) {
    return new Response("Not found", { status: 404 });
  }
  try {
    const body = await readFile(filename);
    return new Response(request.method === "HEAD" ? null : body, {
      headers: {
        "content-type": contentTypes[extname(filename)] || "application/octet-stream",
        "x-content-type-options": "nosniff",
        "cache-control": "no-cache"
      }
    });
  } catch (error) {
    if (["ENOENT", "EISDIR", "ENOTDIR", "EINVAL"].includes(error.code)) {
      return new Response("Not found", { status: 404 });
    }
    throw error;
  }
}

export function createAppServer(env = process.env) {
  const origin = new URL(env.PUBLIC_ORIGIN || "http://localhost:8080").origin;
  return createServer({ requestTimeout: 30000 }, async (incoming, outgoing) => {
    try {
      const chunks = [];
      let size = 0;
      for await (const chunk of incoming) {
        size += chunk.length;
        if (size > 1048576) {
          outgoing.writeHead(413, { "content-type": "application/json", connection: "close" });
          outgoing.end(JSON.stringify({ error: "Request body too large" }));
          return;
        }
        chunks.push(chunk);
      }
      const request = new Request(`${origin}${incoming.url}`, {
        method: incoming.method,
        headers: incoming.headers,
        ...(!["GET", "HEAD"].includes(incoming.method) && {
          body: Buffer.concat(chunks)
        })
      });
      if (new URL(request.url).pathname === "/readyz") {
        const key = env.ENTERPRISE_AI_API_KEY;
        const endpoint = env.ENTERPRISE_AI_ENDPOINT;
        const ready = Boolean(key && endpoint) &&
          !key.startsWith("vault:") && !endpoint.startsWith("vault:");
        outgoing.writeHead(ready ? 200 : 503, { "content-type": "application/json", "cache-control": "no-store" });
        outgoing.end(JSON.stringify({ ready }));
        return;
      }
      const response = await worker.fetch(request, {
        ENTERPRISE_AI_API_KEY: env.ENTERPRISE_AI_API_KEY,
        ENTERPRISE_AI_ENDPOINT: env.ENTERPRISE_AI_ENDPOINT,
        ASSETS: { fetch: serveAsset }
      });
      outgoing.writeHead(response.status, Object.fromEntries(response.headers));
      outgoing.end(Buffer.from(await response.arrayBuffer()));
    } catch {
      if (!outgoing.headersSent) {
        outgoing.writeHead(500, { "content-type": "application/json" });
      }
      outgoing.end(JSON.stringify({ error: "Internal server error" }));
    }
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const server = createAppServer();
  server.listen(Number(process.env.PORT || 8080), "0.0.0.0", () => {
    console.log(`QAMAFerAI listening on port ${server.address().port}`);
  });
  const shutdown = () => {
    server.close();
    setTimeout(() => server.closeAllConnections(), 25000).unref();
  };
  process.once("SIGTERM", shutdown);
  process.once("SIGINT", shutdown);
}
