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
// Optional SSO: when set, a signed, short-lived token from a trusted issuer
// (the os_alerts app, which provisions this instance and shares this secret)
// can start a session at /__sso — so an already-authenticated ALERTS user
// walks straight in without the shared password. Blank = SSO disabled.
const SSO_SECRET = process.env.APP_SSO_SECRET || "";
const COOKIE = "cr_session";
const MAX_JSON_BYTES = 1_000_000;

if (!PASSWORD) {
  console.error("APP_PASSWORD is required (set it in the container's environment / k8s Secret).");
  process.exit(1);
}

const store = createSqliteStore(join(DATA_DIR, "contract-ratings.db"));
const files = createDiskFiles(join(DATA_DIR, "pws"));
const auth = createAuth({ password: PASSWORD, secret: SECRET });
// Verifier for inbound SSO tokens (only `secret` is used from this instance).
const sso = SSO_SECRET ? createAuth({ password: "", secret: SSO_SECRET }) : null;

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

// ── Report generation (Excel/CSV + printable PDF) ─────────────────────────────
// Zero-dependency: CSV opens directly in Excel; the HTML report prints to PDF
// from the browser. Both read straight from the local store.

function buildReport() {
  const contracts = (store.scanContracts() || []).map((c) => ({
    ...c,
    contractors: store.queryContractorsByContract(c.id) || [],
  }));
  contracts.sort((a, b) =>
    String(a.contractNumber || "").localeCompare(String(b.contractNumber || ""), undefined, { numeric: true })
  );
  return { generatedAt: new Date().toISOString(), contracts };
}

function contactNames(list) {
  return (Array.isArray(list) ? list : []).map((c) => (c && c.name) || "").filter(Boolean).join("; ");
}
function openIssueCount(list) {
  return (Array.isArray(list) ? list : []).filter((i) => {
    const s = ((i && i.status) || "").toLowerCase();
    return s !== "resolved" && s !== "closed";
  }).length;
}
function ratingText(item) {
  const n = Number(item && item.ratingCount) || 0;
  return n ? `${(Number(item.avgRating) || 0).toFixed(1)}★ (${n})` : "—";
}
function csvCell(v) {
  const s = v == null ? "" : String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
function reportCsv(report) {
  const headers = ["Contract Number", "Title", "Agency", "Value", "Start", "End",
    "Avg Rating", "# Ratings", "Contractors", "Leads", "POCs", "Open Issues", "Notes"];
  const lines = [headers.map(csvCell).join(",")];
  for (const c of report.contracts) {
    const contractors = (c.contractors || [])
      .map((k) => `${k.company}${k.ratingCount ? ` (${(Number(k.avgRating) || 0).toFixed(1)}/${k.ratingCount})` : ""}`)
      .join("; ");
    lines.push([
      c.contractNumber, c.title, c.agency,
      c.contractValue != null ? c.contractValue : "",
      c.contractStart, c.contractEnd,
      Number(c.ratingCount) ? (Number(c.avgRating) || 0).toFixed(1) : "",
      c.ratingCount || 0, contractors,
      contactNames(c.leads), contactNames(c.pocs),
      openIssueCount(c.issues), c.notes || "",
    ].map(csvCell).join(","));
  }
  return "﻿" + lines.join("\r\n"); // BOM so Excel reads UTF-8 cleanly
}
function escHtml(v) {
  return String(v == null ? "" : v).replace(/[&<>"']/g,
    (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m]));
}
function reportHtml(report) {
  const when = new Date(report.generatedAt).toLocaleString();
  const body = report.contracts.map((c) => {
    const subs = (c.contractors || []).length
      ? `<table class="sub"><thead><tr><th>Contractor</th><th>CAGE</th><th>UEI/SAM</th><th>Rating</th></tr></thead><tbody>`
        + c.contractors.map((k) =>
            `<tr><td>${escHtml(k.company)}</td><td>${escHtml(k.cageCode)}</td><td>${escHtml(k.ueiSam)}</td><td>${escHtml(ratingText(k))}</td></tr>`).join("")
        + `</tbody></table>`
      : `<p class="muted">No contractors recorded.</p>`;
    return `<section class="contract">
      <h2>${escHtml(c.contractNumber || "(no number)")} &mdash; ${escHtml(c.title || "")}</h2>
      <div class="meta">
        <span><b>Agency:</b> ${escHtml(c.agency || "—")}</span>
        <span><b>Value:</b> ${c.contractValue != null ? "$" + escHtml(Number(c.contractValue).toLocaleString()) : "—"}</span>
        <span><b>Period:</b> ${escHtml(c.contractStart || "—")} &rarr; ${escHtml(c.contractEnd || "—")}</span>
        <span><b>Rating:</b> ${escHtml(ratingText(c))}</span>
        <span><b>Open issues:</b> ${openIssueCount(c.issues)}</span>
      </div>
      ${c.leads && c.leads.length ? `<p><b>Leads:</b> ${escHtml(contactNames(c.leads))}</p>` : ""}
      ${c.pocs && c.pocs.length ? `<p><b>POCs:</b> ${escHtml(contactNames(c.pocs))}</p>` : ""}
      ${c.notes ? `<p><b>Notes:</b> ${escHtml(c.notes)}</p>` : ""}
      ${subs}
    </section>`;
  }).join("");
  return `<!doctype html><html lang="en"><head><meta charset="utf-8">
<title>Contract Ratings Report</title>
<style>
 body{font-family:-apple-system,Segoe UI,Roboto,sans-serif;color:#1a2a1a;margin:2rem;max-width:960px}
 h1{font-size:1.4rem;margin:0 0 .2rem}.when{color:#667;margin:0 0 1.2rem;font-size:.85rem}
 .toolbar{margin:0 0 1.5rem;display:flex;gap:.5rem}
 .btn{padding:.5rem 1rem;border:1px solid #3a5a3a;background:#3a7a3a;color:#fff;border-radius:6px;text-decoration:none;font-size:.9rem;cursor:pointer}
 .btn.alt{background:#fff;color:#2a4a2a}
 .contract{border:1px solid #d8e0d8;border-radius:8px;padding:1rem 1.25rem;margin:0 0 1rem;page-break-inside:avoid}
 .contract h2{font-size:1.05rem;margin:0 0 .5rem}
 .meta{display:flex;flex-wrap:wrap;gap:.25rem 1.25rem;font-size:.85rem;margin-bottom:.5rem}
 .muted{color:#889;font-size:.85rem}
 table.sub{border-collapse:collapse;width:100%;font-size:.82rem;margin-top:.5rem}
 table.sub th,table.sub td{border:1px solid #dde;padding:.3rem .5rem;text-align:left}
 table.sub th{background:#f2f6f2}
 @media print{.toolbar{display:none}body{margin:.5rem}}
</style></head><body>
<h1>Contract Ratings &mdash; Report</h1>
<p class="when">Generated ${escHtml(when)} &middot; ${report.contracts.length} contract(s)</p>
<div class="toolbar">
  <button class="btn" onclick="window.print()">Print / Save as PDF</button>
  <a class="btn alt" href="/report/export.csv">Download CSV (Excel)</a>
</div>
${body || '<p class="muted">No contracts recorded yet.</p>'}
</body></html>`;
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

    // Single sign-on landing: a trusted issuer (os_alerts) redirects an already
    // authenticated user here with a short-lived token signed by APP_SSO_SECRET.
    // Verify it, mint a normal session cookie, and bounce to the app — no
    // password prompt. Invalid/expired tokens fall through to the login screen.
    if (pathname === "/__sso" && req.method === "GET") {
      const payload = sso ? sso.verify(url.searchParams.get("token")) : null;
      if (payload) setSessionCookie(res, auth.issue(payload.name || "ALERTS user"));
      res.writeHead(302, { Location: payload ? "/" : "/?sso=denied" });
      return res.end();
    }

    // Report: a printable HTML report (Print → Save as PDF) and a CSV (Excel).
    // Session-gated; not under /api so it's checked explicitly here.
    if (pathname === "/report" || pathname === "/report/export.csv") {
      if (!getSession(req)) { res.writeHead(302, { Location: "/" }); return res.end(); }
      const report = buildReport();
      if (pathname === "/report/export.csv") {
        res.writeHead(200, {
          "content-type": "text/csv; charset=utf-8",
          "content-disposition": 'attachment; filename="contract-ratings-report.csv"',
          "cache-control": "no-store",
        });
        return res.end(reportCsv(report));
      }
      res.writeHead(200, { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" });
      return res.end(reportHtml(report));
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
