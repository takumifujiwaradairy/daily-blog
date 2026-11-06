"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type Session = {
  id: number;
  started_at: string;
  ended_at: string | null;
};

const API = "/private/api/sessions";
const RECENT_DAYS = 14;

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
  const minutes = Math.floor(ms / 60_000);
  return minutes < 60
    ? `${minutes}分`
    : `${Math.floor(minutes / 60)}時間${minutes % 60}分`;
}

export default function StudyTimer() {
  const [sessions, setSessions] = useState<Session[] | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch(API, { cache: "no-store" });
    if (!res.ok) throw new Error(`読み込みに失敗しました (${res.status})`);
    const data = (await res.json()) as { sessions: Session[] };
    setSessions(data.sessions);
  }, []);

  useEffect(() => {
    // Access のセッションが切れると fetch 自体が失敗するので再読み込みを促す。
    load().catch(() =>
      setError("読み込めませんでした。ページを再読み込みしてください。"),
    );
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [load]);

  const active = sessions?.find((s) => s.ended_at === null);

  // 日をまたいだ学習は開始日に計上する。
  const totals = useMemo(() => {
    const byDay = new Map<string, number>();
    for (const s of sessions ?? []) {
      const start = new Date(s.started_at);
      const end = s.ended_at ? new Date(s.ended_at).getTime() : now;
      const key = dateKey(start);
      byDay.set(key, (byDay.get(key) ?? 0) + Math.max(0, end - start.getTime()));
    }
    return byDay;
  }, [sessions, now]);

  const recentDays = useMemo(() => {
    return Array.from({ length: RECENT_DAYS }, (_, i) => {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      return dateKey(date);
    });
  }, [now]);

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

  return (
    <main>
      <h1 style={{ fontSize: "1rem" }}>学習時間</h1>

      <p style={{ fontSize: "2.5rem", fontVariantNumeric: "tabular-nums", margin: "1rem 0" }}>
        {formatClock(active ? now - new Date(active.started_at).getTime() : 0)}
      </p>

      <button
        type="button"
        onClick={toggle}
        disabled={busy || sessions === null}
        style={{ fontSize: "1rem", padding: "0.5rem 1.5rem", cursor: "pointer" }}
      >
        {active ? "終了" : "開始"}
      </button>

      {error && <p role="alert" style={{ color: "#b00020" }}>{error}</p>}

      <h2 style={{ fontSize: "0.9rem", marginTop: "2rem" }}>直近{RECENT_DAYS}日</h2>
      <table style={{ fontVariantNumeric: "tabular-nums", borderCollapse: "collapse" }}>
        <tbody>
          {recentDays.map((day) => (
            <tr key={day}>
              <td style={{ paddingRight: "2rem" }}>{day}</td>
              <td style={{ textAlign: "right" }}>
                {formatDuration(totals.get(day) ?? 0)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}
