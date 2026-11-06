import { createRemoteJWKSet, jwtVerify } from "jose";

interface Env {
  ASSETS: Fetcher;
  DB: D1Database;
  ACCESS_TEAM_DOMAIN?: string;
  ACCESS_AUD?: string;
}

const API_PREFIX = "/private/api/";
// 年間グラフ(53週)を描ける分だけ返す。
const LIST_DAYS = 371;

type Jwks = ReturnType<typeof createRemoteJWKSet>;
let jwksCache: { domain: string; jwks: Jwks } | undefined;

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}

// Access の設定ミスでデータが漏れないよう、Worker 側でも JWT を検証する。
// 静的アセット付き Worker には ctx.access が渡らないため、ヘッダーを直接見る。
// 設定値が無いときは通さない。
async function isAuthorized(request: Request, env: Env): Promise<boolean> {
  const token = request.headers.get("Cf-Access-Jwt-Assertion");
  const domain = env.ACCESS_TEAM_DOMAIN;
  const audience = env.ACCESS_AUD;
  if (!token || !domain || !audience) return false;

  if (jwksCache?.domain !== domain) {
    jwksCache = {
      domain,
      jwks: createRemoteJWKSet(new URL(`${domain}/cdn-cgi/access/certs`)),
    };
  }
  try {
    await jwtVerify(token, jwksCache.jwks, { issuer: domain, audience });
    return true;
  } catch {
    return false;
  }
}

async function handleApi(request: Request, env: Env, path: string): Promise<Response> {
  if (!(await isAuthorized(request, env))) {
    return json({ error: "unauthorized" }, 401);
  }

  if (path === "sessions" && request.method === "GET") {
    const since = new Date(Date.now() - LIST_DAYS * 86_400_000).toISOString();
    const { results } = await env.DB.prepare(
      `SELECT id, started_at, ended_at FROM study_sessions
       WHERE started_at >= ? OR ended_at IS NULL
       ORDER BY started_at DESC`,
    )
      .bind(since)
      .all();
    return json({ sessions: results });
  }

  if (request.method !== "POST") {
    return json({ error: "not_found" }, 404);
  }

  // Cookie 認証なので、他サイトからの POST を止める。
  if (request.headers.get("Origin") !== new URL(request.url).origin) {
    return json({ error: "forbidden" }, 403);
  }

  const now = new Date().toISOString();

  if (path === "sessions/start") {
    const session = await env.DB.prepare(
      `INSERT INTO study_sessions (started_at) VALUES (?)
       ON CONFLICT DO NOTHING
       RETURNING id, started_at, ended_at`,
    )
      .bind(now)
      .first();
    return session ? json({ session }, 201) : json({ error: "already_running" }, 409);
  }

  if (path === "sessions/stop") {
    const session = await env.DB.prepare(
      `UPDATE study_sessions SET ended_at = ? WHERE ended_at IS NULL
       RETURNING id, started_at, ended_at`,
    )
      .bind(now)
      .first();
    return session ? json({ session }) : json({ error: "not_running" }, 409);
  }

  return json({ error: "not_found" }, 404);
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const { pathname } = new URL(request.url);
    if (pathname.startsWith(API_PREFIX)) {
      try {
        return await handleApi(request, env, pathname.slice(API_PREFIX.length));
      } catch (error) {
        console.error(error);
        return json({ error: "internal_error" }, 500);
      }
    }
    return env.ASSETS.fetch(request);
  },
} satisfies ExportedHandler<Env>;
