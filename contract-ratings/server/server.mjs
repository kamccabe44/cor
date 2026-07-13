// Container HTTP server for the Contract Ratings app. Serves the built
// SPA and the /api routes (via the shared core), stores data in
// node:sqlite and PWS files on local disk, and gates everything behind a
// shared password. No AWS, no external services -- deployable as a single
// container on Kubernetes (Docker Desktop) or run directly with Node.
import { createServer } from "node:http";
import { createReadStream, createWriteStream } from "node:fs";
import { mkdir, stat } from "node:fs/promises";
import { pipeline } from "node:stream/promises";
import { dirname, extname, join, normalize, resolve, sep } from "node:path";
import { createRouter } from "../lambda/api/core.mjs";
import { createSqliteStore } from "./store.mjs";
import { createDiskFiles } from "./files.mjs";
import { createAuth } from "./auth.mjs";

const PORT = Number(process.env.PORT || 8080);
const DATA_DIR = process.env.DATA_DIR || resolve("./.local");
const STATIC_DIR = resolve(process.env.STATIC_DIR || "./public");
const PASSWORD = process.env.APP_PASSWORD || "";
const SECRET = process.env.APP_SESSION_SECRET || `session:${PASSWORD}`;
const COOKIE = "cr_session";
const MAX_JSON_BYTES = 1_000_000;

if (!PASSWORD) {
  console.error("APP_PASSWORD is required (set it in the container's environment / k8s Secret).");
  process.exit(1);
}

const store = createSqliteStore(join(DATA_DIR, "contract-ratings.db"));
const files = createDiskFiles(join(DATA_DIR, "pws"));
const auth = createAuth({ password: PASSWORD, secret: SECRET });

const API_ROUTES = [
  ["GET", /^\/api\/contracts$/, "GET /api/contracts"],
  ["POST", /^\/api\/contracts$/, "POST /api/contracts"],
  ["GET", /^\/api\/contracts\/([^/]+)$/, "GET /api/contracts/{id}"],
  ["PUT", /^\/api\/contracts\/([^/]+)$/, "PUT /api/contracts/{id}"],
  ["DELETE", /^\/api\/contracts\/([^/]+)$/, "DELETE /api/contracts/{id}"],
  ["POST", /^\/api\/contracts\/([^/]+)\/rating$/, "POST /api/contracts/{id}/rating"],
  ["GET", /^\/api\/contracts\/([^/]+)\/contractors$/, "GET /api/contracts/{id}/contractors"],
  ["POST", /^\/api\/contracts\/([^/]+)\/contractors$/, "POST /api/contracts/{id}/contractors"],
  ["POST", /^\/api\/contracts\/([^/]+)\/pws\/upload-url$/, "POST /api/contracts/{id}/pws/upload-url"],
  ["POST", /^\/api\/contracts\/([^/]+)\/pws$/, "POST /api/contracts/{id}/pws"],
  ["DELETE", /^\/api\/contracts\/([^/]+)\/pws$/, "DELETE /api/contracts/{id}/pws"],
  ["GET", /^\/api\/contractors\/([^/]+)$/, "GET /api/contractors/{id}"],
  ["PUT", /^\/api\/contractors\/([^/]+)$/, "PUT /api/contractors/{id}"],
  ["DELETE", /^\/api\/contractors\/([^/]+)$/, "DELETE /api/contractors/{id}"],
  ["POST", /^\/api\/contractors\/([^/]+)\/rating$/, "POST /api/contractors/{id}/rating"],
];

const CONTENT_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json",
  ".map": "application/json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
  ".pdf": "application/pdf",
  ".txt": "text/plain; charset=utf-8",
};

function sendJson(res, status, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(status, { "content-type": "application/json" });
  res.end(body);
}

function parseCookies(req) {
  const out = {};
  for (const part of (req.headers.cookie || "").split(";")) {
    const i = part.indexOf("=");
    if (i > -1) out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  }
  return out;
}

function getSession(req) {
  return auth.verify(parseCookies(req)[COOKIE]);
}

function setSessionCookie(res, token) {
  res.setHeader("Set-Cookie", `${COOKIE}=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${auth.ttlSeconds}`);
}

function clearSessionCookie(res) {
  res.setHeader("Set-Cookie", `${COOKIE}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0`);
}

async function readBody(req, limit) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > limit) throw new Error("payload too large");
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

async function handlePws(req, res, key, filename) {
  let path;
  try {
    path = files.keyToPath(key);
  } catch {
    return sendJson(res, 400, { error: "invalid key" });
  }

  if (req.method === "PUT") {
    await mkdir(dirname(path), { recursive: true });
    await pipeline(req, createWriteStream(path));
    return sendJson(res, 200, { ok: true });
  }

  if (req.method === "GET") {
    try {
      await stat(path);
    } catch {
      return sendJson(res, 404, { error: "Not found" });
    }
    const type = CONTENT_TYPES[extname(key).toLowerCase()] || "application/octet-stream";
    res.writeHead(200, {
      "content-type": type,
      "content-disposition": `inline; filename="${(filename || "pws").replace(/"/g, "")}"`,
    });
    return pipeline(createReadStream(path), res);
  }

  return sendJson(res, 405, { error: "method not allowed" });
}

async function serveStatic(res, pathname) {
  const rel = normalize(pathname).replace(/^(\.\.[/\\])+/, "");
  let filePath = resolve(STATIC_DIR, "." + (rel === "/" ? "/index.html" : rel));
  if (filePath !== STATIC_DIR && !filePath.startsWith(STATIC_DIR + sep)) filePath = join(STATIC_DIR, "index.html");

  try {
    const s = await stat(filePath);
    if (!s.isFile()) throw new Error("not a file");
  } catch {
    // SPA fallback: unknown routes render the app shell.
    filePath = join(STATIC_DIR, "index.html");
  }

  try {
    await stat(filePath);
  } catch {
    res.writeHead(404, { "content-type": "text/plain" });
    return res.end("Not found");
  }
  res.writeHead(200, { "content-type": CONTENT_TYPES[extname(filePath).toLowerCase()] || "application/octet-stream" });
  return pipeline(createReadStream(filePath), res);
}

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, "http://localhost");
    const pathname = decodeURIComponent(url.pathname);

    if (pathname === "/api/health") return sendJson(res, 200, { ok: true });

    if (pathname === "/api/login" && req.method === "POST") {
      let body;
      try {
        const raw = await readBody(req, MAX_JSON_BYTES);
        body = raw.length ? JSON.parse(raw.toString("utf-8")) : {};
      } catch {
        return sendJson(res, 400, { error: "Invalid request" });
      }
      if (!auth.checkPassword(body.password)) return sendJson(res, 401, { error: "Incorrect password" });
      setSessionCookie(res, auth.issue());
      return sendJson(res, 200, { signedIn: true, name: "COR user" });
    }

    if (pathname === "/api/session" && req.method === "GET") {
      const s = getSession(req);
      return sendJson(res, 200, { signedIn: Boolean(s), name: s?.name ?? null });
    }

    if (pathname === "/api/logout" && req.method === "POST") {
      clearSessionCookie(res);
      return sendJson(res, 200, { ok: true });
    }

    const needsAuth = pathname.startsWith("/api/") || pathname.startsWith("/__pws/");
    const session = needsAuth ? getSession(req) : null;
    if (needsAuth && !session) return sendJson(res, 401, { error: "Not signed in" });

    if (pathname.startsWith("/__pws/")) {
      const key = pathname.slice("/__pws/".length);
      return handlePws(req, res, key, url.searchParams.get("filename"));
    }

    if (pathname.startsWith("/api/")) {
      const match = API_ROUTES.find(([m, re]) => m === req.method && re.test(pathname));
      if (!match) return sendJson(res, 404, { error: "Not found" });
      const [, re, routeKey] = match;
      const captured = pathname.match(re);
      const id = captured && captured[1] ? captured[1] : undefined;

      let body;
      if (req.method === "POST" || req.method === "PUT") {
        try {
          const raw = await readBody(req, MAX_JSON_BYTES);
          body = raw.length ? JSON.parse(raw.toString("utf-8")) : {};
        } catch {
          return sendJson(res, 400, { error: "Invalid JSON body" });
        }
      }

      const route = createRouter({
        store,
        files,
        getUser: () => ({ sub: "local-user", name: session.name || "COR user" }),
      });
      const result = await route({ routeKey, id, body });
      res.writeHead(result.statusCode, result.headers);
      return res.end(result.body);
    }

    return serveStatic(res, pathname);
  } catch (err) {
    console.error("Request error:", err);
    if (!res.headersSent) sendJson(res, 500, { error: "Internal error" });
    else res.end();
  }
});

server.listen(PORT, () => {
  console.log(`Contract Ratings container listening on :${PORT} (data: ${DATA_DIR}, static: ${STATIC_DIR})`);
});
