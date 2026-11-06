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
const MAX_TITLE = 100;
const MAX_NOTE_PATH = 300;
const MAX_MEMO = 2000;
// 日付の打ち間違いで1日を超える記録を作らないようにする。
const MAX_SESSION_MS = 24 * 60 * 60 * 1000;
// 習慣はアプリから追加しないので、ここに足す。id は記録のキーなので変えない。
// holidayGoal が null の習慣は、祝日を対象にしない。
const HABITS = [
  {
    id: "morning-study",
    title: "朝の学習",
    weekdayGoal: "9:00 から1時間",
    holidayGoal: null,
  },
  {
    id: "evening-study",
    title: "仕事終わりの学習",
    weekdayGoal: "仕事終わりに1時間",
    holidayGoal: "2時間",
  },
];
// 世界で最も進んだタイムゾーン（UTC+14）でも「今日」になる日までを許可する。
const MAX_TIMEZONE_AHEAD_MS = 14 * 60 * 60 * 1000;
const SESSION_COLUMNS = "id, started_at, ended_at, goal_id, memo";

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

class BadRequest extends Error {}

async function readBody(request: Request): Promise<Record<string, unknown>> {
  const text = await request.text();
  if (!text) return {};
  try {
    const body: unknown = JSON.parse(text);
    if (body && typeof body === "object" && !Array.isArray(body)) {
      return body as Record<string, unknown>;
    }
  } catch {
    // 下の BadRequest にまとめる。
  }
  throw new BadRequest("invalid_json");
}

// 空文字は「値なし」として NULL で保存する。
function optionalText(value: unknown, max: number, name: string): string | null {
  if (value === undefined || value === null) return null;
  if (typeof value !== "string" || value.length > max) {
    throw new BadRequest(`invalid_${name}`);
  }
  return value.trim() || null;
}

// 重なりの判定を文字列比較で行うので、toISOString の形式にそろえる。
function timestamp(value: unknown): string {
  const ms = typeof value === "string" ? Date.parse(value) : NaN;
  if (Number.isNaN(ms)) throw new BadRequest("invalid_time_range");
  return new Date(ms).toISOString();
}

function calendarDate(value: unknown): string {
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const ms = Date.parse(`${value}T00:00:00.000Z`);
    // 2026-02-31 のように繰り上がる日付を弾く。
    if (!Number.isNaN(ms) && new Date(ms).toISOString().slice(0, 10) === value) {
      return value;
    }
  }
  throw new BadRequest("invalid_date");
}

async function resolveGoalId(value: unknown, env: Env): Promise<number | null> {
  if (value === undefined || value === null) return null;
  if (typeof value !== "number" || !Number.isInteger(value)) {
    throw new BadRequest("invalid_goal_id");
  }
  const goal = await env.DB.prepare("SELECT id FROM goals WHERE id = ?")
    .bind(value)
    .first();
  if (!goal) throw new BadRequest("invalid_goal_id");
  return value;
}

async function handleApi(request: Request, env: Env, path: string): Promise<Response> {
  if (!(await isAuthorized(request, env))) {
    return json({ error: "unauthorized" }, 401);
  }

  if (path === "sessions" && request.method === "GET") {
    const since = new Date(Date.now() - LIST_DAYS * 86_400_000).toISOString();
    const { results } = await env.DB.prepare(
      `SELECT ${SESSION_COLUMNS} FROM study_sessions
       WHERE started_at >= ? OR ended_at IS NULL
       ORDER BY started_at DESC`,
    )
      .bind(since)
      .all();
    return json({ sessions: results });
  }

  if (path === "goals" && request.method === "GET") {
    const { results } = await env.DB.prepare(
      "SELECT id, title, note_path FROM goals ORDER BY id",
    ).all();
    return json({ goals: results });
  }

  if (path === "habits" && request.method === "GET") {
    const [checks, days] = await env.DB.batch<Record<string, string>>([
      env.DB.prepare("SELECT habit, date FROM habit_checks"),
      env.DB.prepare("SELECT date, day_type FROM calendar_days"),
    ]);
    const byHabit: Record<string, string[]> = {};
    for (const row of checks.results) {
      (byHabit[row.habit] ??= []).push(row.date);
    }
    return json({
      habits: HABITS,
      checks: byHabit,
      dayTypes: Object.fromEntries(
        days.results.map((row) => [row.date, row.day_type]),
      ),
    });
  }

  if (request.method !== "POST") {
    return json({ error: "not_found" }, 404);
  }

  // Cookie 認証なので、他サイトからの POST を止める。
  if (request.headers.get("Origin") !== new URL(request.url).origin) {
    return json({ error: "forbidden" }, 403);
  }

  const now = new Date().toISOString();
  const body = await readBody(request);

  if (path === "goals") {
    const title = optionalText(body.title, MAX_TITLE, "title");
    if (!title) throw new BadRequest("invalid_title");
    const notePath = optionalText(body.note_path, MAX_NOTE_PATH, "note_path");
    const goal = await env.DB.prepare(
      `INSERT INTO goals (title, note_path, created_at) VALUES (?, ?, ?)
       ON CONFLICT (title) DO NOTHING
       RETURNING id, title, note_path`,
    )
      .bind(title, notePath, now)
      .first();
    return goal ? json({ goal }, 201) : json({ error: "duplicate_title" }, 409);
  }

  if (path === "habits/check") {
    const habit = HABITS.find((h) => h.id === body.habit)?.id;
    if (!habit) throw new BadRequest("invalid_habit");
    const date = calendarDate(body.date);
    if (typeof body.done !== "boolean") throw new BadRequest("invalid_done");
    const latest = new Date(Date.now() + MAX_TIMEZONE_AHEAD_MS)
      .toISOString()
      .slice(0, 10);
    if (date > latest) throw new BadRequest("invalid_date");
    const statement = body.done
      ? env.DB.prepare(
          `INSERT INTO habit_checks (habit, date, created_at) VALUES (?, ?, ?)
           ON CONFLICT DO NOTHING`,
        ).bind(habit, date, now)
      : env.DB.prepare(
          "DELETE FROM habit_checks WHERE habit = ? AND date = ?",
        ).bind(habit, date);
    await statement.run();
    return json({ date, done: body.done });
  }

  if (path === "calendar/day") {
    const date = calendarDate(body.date);
    const dayType = body.day_type;
    if (dayType !== "weekday" && dayType !== "holiday") {
      throw new BadRequest("invalid_day_type");
    }
    await env.DB.prepare(
      `INSERT INTO calendar_days (date, day_type) VALUES (?, ?)
       ON CONFLICT (date) DO UPDATE SET day_type = excluded.day_type`,
    )
      .bind(date, dayType)
      .run();
    return json({ date, day_type: dayType });
  }

  if (path === "sessions/start") {
    const goalId = await resolveGoalId(body.goal_id, env);
    const session = await env.DB.prepare(
      `INSERT INTO study_sessions (started_at, goal_id) VALUES (?, ?)
       ON CONFLICT DO NOTHING
       RETURNING ${SESSION_COLUMNS}`,
    )
      .bind(now, goalId)
      .first();
    return session ? json({ session }, 201) : json({ error: "already_running" }, 409);
  }

  if (path === "sessions/stop") {
    const memo = optionalText(body.memo, MAX_MEMO, "memo");
    // ポモドーロは、タブを閉じていても予定の時刻で終わった記録にする。
    // 端末の時計が進んでいても未来の時刻にはしない。
    const requested = body.ended_at === undefined ? now : timestamp(body.ended_at);
    const endedAt = requested < now ? requested : now;
    const session = await env.DB.prepare(
      `UPDATE study_sessions SET ended_at = ?, memo = ?
       WHERE ended_at IS NULL AND started_at < ?
       RETURNING ${SESSION_COLUMNS}`,
    )
      .bind(endedAt, memo, endedAt)
      .first();
    return session ? json({ session }) : json({ error: "not_running" }, 409);
  }

  // 記録後の時間、メモ、目標の修正。Obsidian へは次回の書き出しで反映される。
  const edit = path.match(/^sessions\/(\d+)$/);
  if (edit) {
    const memo = optionalText(body.memo, MAX_MEMO, "memo");
    const goalId = await resolveGoalId(body.goal_id, env);
    const startedAt = timestamp(body.started_at);
    const endedAt = timestamp(body.ended_at);
    const duration = Date.parse(endedAt) - Date.parse(startedAt);
    if (duration <= 0 || duration > MAX_SESSION_MS || endedAt > now) {
      throw new BadRequest("invalid_time_range");
    }
    const id = Number(edit[1]);
    // 重なると同じ時間を二重に集計してしまう。
    const overlapping = await env.DB.prepare(
      `SELECT id FROM study_sessions
       WHERE id != ? AND started_at < ? AND (ended_at IS NULL OR ended_at > ?)
       LIMIT 1`,
    )
      .bind(id, endedAt, startedAt)
      .first();
    if (overlapping) return json({ error: "overlap" }, 409);
    // 計測中の記録を編集で終了させないよう、終了済みだけを対象にする。
    const session = await env.DB.prepare(
      `UPDATE study_sessions SET started_at = ?, ended_at = ?, memo = ?, goal_id = ?
       WHERE id = ? AND ended_at IS NOT NULL
       RETURNING ${SESSION_COLUMNS}`,
    )
      .bind(startedAt, endedAt, memo, goalId, id)
      .first();
    return session ? json({ session }) : json({ error: "not_found" }, 404);
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
        if (error instanceof BadRequest) {
          return json({ error: error.message }, 400);
        }
        console.error(error);
        return json({ error: "internal_error" }, 500);
      }
    }
    return env.ASSETS.fetch(request);
  },
} satisfies ExportedHandler<Env>;
