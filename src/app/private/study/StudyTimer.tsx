"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type Session = {
  id: number;
  started_at: string;
  ended_at: string | null;
};

const API = "/private/api/sessions";
const WEEKS = 53;
const RECENT_SESSIONS = 10;
const WEEKDAY_LABELS: [number, string][] = [
  [1, "月"],
  [3, "水"],
  [5, "金"],
];

function dateKey(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

function formatClock(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(Math.floor(total / 3600))}:${pad(Math.floor(total / 60) % 60)}:${pad(total % 60)}`;
}

function formatDuration(ms: number): string {
  const seconds = Math.max(0, Math.floor(ms / 1000));
  if (seconds > 0 && seconds < 60) return `${seconds}秒`;
  const minutes = Math.floor(seconds / 60);
  return minutes < 60
    ? `${minutes}分`
    : `${Math.floor(minutes / 60)}時間${minutes % 60}分`;
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("ja-JP", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

// 色の段階は学習時間の絶対値で決める。相対値だと、長い日が1日あるだけで他の日が薄くなる。
function levelOf(ms: number): number {
  if (ms <= 0) return 0;
  const minutes = ms / 60_000;
  if (minutes < 30) return 1;
  if (minutes < 60) return 2;
  if (minutes < 120) return 3;
  return 4;
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function sessionMs(session: Session, now: number): number {
  const end = session.ended_at ? new Date(session.ended_at).getTime() : now;
  return Math.max(0, end - new Date(session.started_at).getTime());
}

export default function StudyTimer() {
  const [sessions, setSessions] = useState<Session[] | null>(null);
  // 静的HTMLはビルド時に作られるので、現在時刻はマウント後に入れる。
  const [now, setNow] = useState<number | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    const res = await fetch(API, { cache: "no-store" });
    if (!res.ok) throw new Error(String(res.status));
    const data = (await res.json()) as { sessions: Session[] };
    setSessions(data.sessions);
  }, []);

  useEffect(() => {
    setNow(Date.now());
    // Access のセッションが切れると fetch 自体が失敗するので再読み込みを促す。
    load().catch(() =>
      setError("読み込めませんでした。ページを再読み込みしてください。"),
    );
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [load]);

  // 狭い画面では、最新の週が見えるように右端から表示する。
  const loaded = sessions !== null && now !== null;
  useEffect(() => {
    if (loaded && scrollRef.current) {
      scrollRef.current.scrollLeft = scrollRef.current.scrollWidth;
    }
  }, [loaded]);

  const active = sessions?.find((s) => s.ended_at === null);
  const currentTime = now ?? 0;

  // 日をまたいだ学習は開始日に計上する。
  const totals = useMemo(() => {
    const byDay = new Map<string, number>();
    for (const s of sessions ?? []) {
      const key = dateKey(new Date(s.started_at));
      byDay.set(key, (byDay.get(key) ?? 0) + sessionMs(s, currentTime));
    }
    return byDay;
  }, [sessions, currentTime]);

  const today = now === null ? null : new Date(now);
  const todayKey = today ? dateKey(today) : null;

  const days = useMemo(() => {
    if (!todayKey) return [];
    const [year, month, day] = todayKey.split("-").map(Number);
    const end = new Date(year, month - 1, day);
    const start = addDays(end, -((WEEKS - 1) * 7 + end.getDay()));
    const result: { key: string; date: Date; week: number }[] = [];
    let index = 0;
    for (let date = start; date <= end; date = addDays(date, 1)) {
      result.push({ key: dateKey(date), date, week: Math.floor(index / 7) });
      index += 1;
    }
    return result;
  }, [todayKey]);

  const months = useMemo(() => {
    const labels: { week: number; label: string }[] = [];
    let previous = -1;
    for (const { date, week } of days) {
      if (date.getDay() !== 0) continue;
      if (date.getMonth() !== previous) {
        previous = date.getMonth();
        // 先頭の週が月末だとラベルが重なるので、最初の1列は省く。
        if (week > 0) labels.push({ week, label: `${previous + 1}月` });
      }
    }
    return labels;
  }, [days]);

  const stats = useMemo(() => {
    if (!today) return { week: 0, streak: 0, year: 0 };
    let week = 0;
    for (let i = 0; i <= today.getDay(); i += 1) {
      week += totals.get(dateKey(addDays(today, -i))) ?? 0;
    }
    // 今日まだ学習していなくても、昨日までの連続は途切れていない扱いにする。
    let streak = 0;
    let cursor = totals.get(dateKey(today)) ? today : addDays(today, -1);
    while (totals.get(dateKey(cursor))) {
      streak += 1;
      cursor = addDays(cursor, -1);
    }
    const year = days.reduce((sum, d) => sum + (totals.get(d.key) ?? 0), 0);
    return { week, streak, year };
    // today は todayKey と totals の更新に連動するため、依存から外す。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [totals, todayKey, days]);

  async function toggle() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`${API}/${active ? "stop" : "start"}`, {
        method: "POST",
      });
      // 409 は別タブ等で状態が変わった場合。最新の状態を読み直せば解消する。
      if (!res.ok && res.status !== 409) {
        throw new Error(String(res.status));
      }
      await load();
    } catch {
      setError("保存できませんでした。ページを再読み込みしてください。");
    } finally {
      setBusy(false);
    }
  }

  const selectedKey = selected ?? todayKey;

  return (
    <>
      <header className="topbar">
        Study <span>/ 学習時間</span>
      </header>

      <main className="page">
        {error && (
          <div role="alert" className="flash">
            {error}
          </div>
        )}

        <section className="box">
          <div className="box-header">
            計測
            <span className={`label ${active ? "label-running" : ""}`}>
              {active ? "計測中" : "停止中"}
            </span>
          </div>
          <div className="timer">
            <div className="clock" role="timer">
              {formatClock(active ? currentTime - new Date(active.started_at).getTime() : 0)}
            </div>
            <button
              type="button"
              className={`btn ${active ? "btn-danger" : "btn-primary"}`}
              onClick={toggle}
              disabled={busy || !loaded}
            >
              {active ? "終了" : "開始"}
            </button>
          </div>
          <div className="stats">
            <div className="stat">
              <div className="stat-value">
                {formatDuration(todayKey ? totals.get(todayKey) ?? 0 : 0)}
              </div>
              <div className="stat-label">今日</div>
            </div>
            <div className="stat">
              <div className="stat-value">{formatDuration(stats.week)}</div>
              <div className="stat-label">今週</div>
            </div>
            <div className="stat">
              <div className="stat-value">{stats.streak}日</div>
              <div className="stat-label">連続</div>
            </div>
          </div>
        </section>

        <section>
          <h2 className="section-title">
            過去1年で {formatDuration(stats.year)}
          </h2>
          <div className="box">
            <div className="graph-scroll" ref={scrollRef}>
              <div className="graph">
                {months.map(({ week, label }) => (
                  <div
                    key={week}
                    className="graph-axis"
                    style={{ gridColumn: `${week + 2} / span 3`, gridRow: 1 }}
                  >
                    {label}
                  </div>
                ))}
                {WEEKDAY_LABELS.map(([day, label]) => (
                  <div
                    key={day}
                    className="graph-axis"
                    style={{ gridColumn: 1, gridRow: day + 2 }}
                  >
                    {label}
                  </div>
                ))}
                {days.map(({ key, date, week }) => {
                  const ms = totals.get(key) ?? 0;
                  return (
                    <button
                      type="button"
                      key={key}
                      className={`cell level-${levelOf(ms)}`}
                      style={{ gridColumn: week + 2, gridRow: date.getDay() + 2 }}
                      aria-label={`${key} ${formatDuration(ms)}`}
                      title={`${key}: ${formatDuration(ms)}`}
                      onClick={() => setSelected(key)}
                    />
                  );
                })}
              </div>
            </div>
            <div className="graph-footer">
              <span>
                {selectedKey}: {formatDuration(selectedKey ? totals.get(selectedKey) ?? 0 : 0)}
              </span>
              <div className="legend" aria-hidden="true">
                <span>少</span>
                {[0, 1, 2, 3, 4].map((level) => (
                  <i key={level} className={`cell level-${level}`} />
                ))}
                <span>多</span>
              </div>
            </div>
          </div>
        </section>

        <section>
          <h2 className="section-title">最近の記録</h2>
          <div className="box">
            {sessions && sessions.length > 0 ? (
              <ul className="session-list">
                {sessions.slice(0, RECENT_SESSIONS).map((s) => (
                  <li key={s.id} className="session">
                    <span>
                      {dateKey(new Date(s.started_at))} {formatTime(s.started_at)}
                      {" - "}
                      {s.ended_at ? formatTime(s.ended_at) : "計測中"}
                    </span>
                    <span className="session-duration">
                      {formatDuration(sessionMs(s, currentTime))}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="empty">
                {sessions ? "まだ記録がありません" : "読み込み中"}
              </p>
            )}
          </div>
        </section>
      </main>
    </>
  );
}
