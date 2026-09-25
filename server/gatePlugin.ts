import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { IncomingMessage, ServerResponse } from "node:http";
import type { Plugin } from "vite";
import { isFacilityFile } from "./auth.ts";
import {
  facilityFileFromPath,
  gatedJson,
  handleLogin,
  handleSession,
  requireSession,
} from "./handlers.ts";

function readBody(req: IncomingMessage): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk) => chunks.push(chunk as Buffer));
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

async function toWebRequest(req: IncomingMessage): Promise<Request> {
  const host = req.headers.host ?? "localhost";
  const protoHeader = req.headers["x-forwarded-proto"];
  const proto = typeof protoHeader === "string" ? protoHeader.split(",")[0] : "http";
  const url = `${proto}://${host}${req.url ?? "/"}`;
  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers)) {
    if (!value) continue;
    headers.set(key, Array.isArray(value) ? value.join(", ") : value);
  }
  const method = req.method ?? "GET";
  const init: RequestInit = { method, headers };
  if (method !== "GET" && method !== "HEAD") {
    init.body = new Uint8Array(await readBody(req));
    Object.assign(init, { duplex: "half" });
  }
  return new Request(url, init);
}

async function sendWebResponse(res: ServerResponse, response: Response) {
  res.statusCode = response.status;
  response.headers.forEach((value, key) => {
    res.setHeader(key, value);
  });
  res.end(Buffer.from(await response.arrayBuffer()));
}

function readFacilityFile(name: string): unknown | null {
  if (!isFacilityFile(name)) return null;
  const path = join(process.cwd(), "private", "data", name);
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch {
    return null;
  }
}

function skipAuth(path: string, req: IncomingMessage): boolean {
  const upgrade = req.headers.upgrade;
  if (typeof upgrade === "string" && upgrade.toLowerCase() === "websocket") {
    return true;
  }
  return (
    path.startsWith("/@") ||
    path.startsWith("/node_modules") ||
    path.startsWith("/.vite")
  );
}

export function dashboardGatePlugin(getPassword: () => string | undefined): Plugin {
  function attach(middlewares: { use: (fn: (req: IncomingMessage, res: ServerResponse, next: () => void) => void) => void }) {
    middlewares.use((req, res, next) => {
      const path = req.url?.split("?")[0] ?? "";
      if (
        path === "/private" ||
        path.startsWith("/private/") ||
        path === "/__facility" ||
        path.startsWith("/__facility/")
      ) {
        res.statusCode = 404;
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ error: "Not found" }));
        return;
      }
      if (skipAuth(path, req)) {
        next();
        return;
      }

      void (async () => {
        const request = await toWebRequest(req);
        const password = getPassword();
        if (path !== "/api/login") {
          const denied = await requireSession(request, password);
          if (denied) {
            await sendWebResponse(res, denied);
            return;
          }
        }

        if (path === "/api/login") {
          await sendWebResponse(res, await handleLogin(request, password));
          return;
        }
        if (path === "/api/session") {
          await sendWebResponse(res, await handleSession(request, password));
          return;
        }

        const file = facilityFileFromPath(path);
        if (file) {
          if (!isFacilityFile(file)) {
            await sendWebResponse(res, new Response(JSON.stringify({ error: "Not found" }), { status: 404 }));
            return;
          }
          const payload = readFacilityFile(file);
          if (payload == null) {
            await sendWebResponse(
              res,
              new Response(JSON.stringify({ error: "Unable to load facility data" }), { status: 404 }),
            );
            return;
          }
          await sendWebResponse(res, gatedJson(payload, file));
          return;
        }

        if (path.startsWith("/api/")) {
          await sendWebResponse(res, new Response(JSON.stringify({ error: "Not found" }), { status: 404 }));
          return;
        }

        next();
      })().catch((error: unknown) => {
        const message = error instanceof Error ? error.message : "Gate error";
        if (!res.headersSent) {
          res.statusCode = 500;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ error: message }));
        }
      });
    });
  }

  return {
    name: "dashboard-gate",
    configureServer(server) {
      attach(server.middlewares);
    },
    configurePreviewServer(server) {
      attach(server.middlewares);
    },
  };
}
