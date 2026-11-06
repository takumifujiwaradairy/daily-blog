"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type Session = {
  id: number;
  started_at: string;
  ended_at: string | null;
  goal_id: number | null;
  memo: string | null;
};

type Goal = {
  id: number;
  title: string;
  note_path: string | null;
};

type Editing = {
  id: number;
  startedAt: string;
  endedAt: string;
  goalId: number | null;
  memo: string;
};

type Mode = "normal" | "pomodoro";

type Pomodoro =
  | { phase: "focus"; sessionId: number; endsAt: number }
  | { phase: "break"; endsAt: number };

const API = "/private/api/sessions";
const GOALS_API = "/private/api/goals";
const WEEKS = 53;
const RECENT_SESSIONS = 10;
const FOCUS_MS = 25 * 60_000;
const BREAK_MS = 5 * 60_000;
const MODE_KEY = "study-timer-mode";
const POMODORO_KEY = "study-pomodoro";
const EDIT_ERRORS: Record<string, string> = {
  invalid_time_range:
    "終了は開始より後の現在以前の時刻にし、長さは24時間以内にしてください。",
  overlap: "他の記録と時間が重なっています。",
};
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

function formatCountdown(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(Math.floor(total / 60))}:${pad(total % 60)}`;
}

function formatDuration(ms: number): string {
  const seconds = Math.max(0, Math.floor(ms / 1000));
  if (seconds > 0 && seconds < 60) return `${seconds}秒`;
  const minutes = Math.floor(seconds / 60);
  return minutes < 60
    ? `${minutes}分`
    : `${Math.floor(minutes / 60)}時間${minutes % 60}分`;
}

// datetime-local 入力の形式（端末の時刻、分単位）。
function toInputValue(iso: string): string {
  const date = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${dateKey(date)}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

// 入力は分単位なので、変更していない時刻は元の値を使い、秒を失わないようにする。
function fromInputValue(value: string, original: string): string {
  return value === toInputValue(original)
    ? original
    : new Date(value).toISOString();
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

function draftKey(sessionId: number): string {
  return `study-memo-draft-${sessionId}`;
}

// 書きかけのメモは再読み込みで消えないようにする。保存できない環境でも計測は止めない。
function readDraft(sessionId: number): string {
  try {
    return localStorage.getItem(draftKey(sessionId)) ?? "";
  } catch {
    return "";
  }
}

function writeDraft(sessionId: number, memo: string | null) {
  try {
    if (memo === null) localStorage.removeItem(draftKey(sessionId));
    else localStorage.setItem(draftKey(sessionId), memo);
  } catch {
    // 下書きは補助機能なので、失敗しても無視する。
  }
}

// 再読み込みやタブを閉じた後も続けられるよう、残り時間ではなく終了時刻を保存する。
function readPomodoro(): Pomodoro | null {
  try {
    const stored = localStorage.getItem(POMODORO_KEY);
    return stored ? (JSON.parse(stored) as Pomodoro) : null;
  } catch {
    return null;
  }
}

function readMode(): Mode {
  try {
    return localStorage.getItem(MODE_KEY) === "pomodoro" ? "pomodoro" : "normal";
  } catch {
    return "normal";
  }
}

function writeStored(key: string, value: string | null) {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    // 保存できなくても、開いている間のタイマーは動く。
  }
}

function askNotificationPermission() {
  try {
    if (Notification.permission === "default") {
      void Notification.requestPermission();
    }
  } catch {
    // 通知に対応していない環境では、音と画面表示だけにする。
  }
}

// 通知も音も補助なので、使えない環境では黙って諦める。
function announce(message: string) {
  try {
    if (Notification.permission === "granted") new Notification(message);
  } catch {
    // Android の Chrome などは、この形の通知に対応していない。
  }
  try {
    const audio = new AudioContext();
    const oscillator = audio.createOscillator();
    oscillator.frequency.value = 880;
    oscillator.connect(audio.destination);
    oscillator.onended = () => void audio.close();
    oscillator.start();
    oscillator.stop(audio.currentTime + 0.4);
  } catch {
    // 音を出せなくても記録には影響しない。
  }
}

function goalValue(value: string): number | null {
  return value === "" ? null : Number(value);
}

export default function StudyTimer() {
  const [sessions, setSessions] = useState<Session[] | null>(null);
  // 静的HTMLはビルド時に作られるので、現在時刻はマウント後に入れる。
  const [now, setNow] = useState<number | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [goalId, setGoalId] = useState<number | null>(null);
  const [memo, setMemo] = useState("");
  const [addingGoal, setAddingGoal] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newNotePath, setNewNotePath] = useState("");
  const [editing, setEditing] = useState<Editing | null>(null);
  const [editError, setEditError] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>("normal");
  const [pomodoro, setPomodoro] = useState<Pomodoro | null>(null);
  const finishingRef = useRef(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    const [sessionsRes, goalsRes] = await Promise.all([
      fetch(API, { cache: "no-store" }),
      fetch(GOALS_API, { cache: "no-store" }),
    ]);
    if (!sessionsRes.ok || !goalsRes.ok) throw new Error("load failed");
    const data = (await sessionsRes.json()) as { sessions: Session[] };
    const goalData = (await goalsRes.json()) as { goals: Goal[] };
    setSessions(data.sessions);
    setGoals(goalData.goals);
    return data.sessions;
  }, []);

  const post = useCallback(async (path: string, body: unknown) => {
    return fetch(path, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
  }, []);

  const savePomodoro = useCallback((next: Pomodoro | null) => {
    setPomodoro(next);
    writeStored(POMODORO_KEY, next && JSON.stringify(next));
  }, []);

  useEffect(() => {
    setNow(Date.now());
    setMode(readMode());
    setPomodoro(readPomodoro());
    // Access のセッションが切れると fetch 自体が失敗するので再読み込みを促す。
    load()
      .then((loadedSessions) => {
        // 同じ目標を続けることが多いので、直近の記録の目標を初期値にする。
        setGoalId(loadedSessions[0]?.goal_id ?? null);
        const running = loadedSessions.find((s) => s.ended_at === null);
        if (running) setMemo(readDraft(running.id));
      })
      .catch(() =>
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
  const goalTitle = (id: number | null) =>
    goals.find((g) => g.id === id)?.title ?? null;
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

  const goalTotals = useMemo(() => {
    const byGoal = new Map<number | null, { ms: number; count: number }>();
    for (const s of sessions ?? []) {
      const entry = byGoal.get(s.goal_id) ?? { ms: 0, count: 0 };
      entry.ms += sessionMs(s, currentTime);
      entry.count += 1;
      byGoal.set(s.goal_id, entry);
    }
    return byGoal;
  }, [sessions, currentTime]);

  const focus =
    pomodoro?.phase === "focus" && pomodoro.sessionId === active?.id
      ? pomodoro
      : null;
  const onBreak = pomodoro?.phase === "break" ? pomodoro : null;
  const countdownEnd = focus?.endsAt ?? onBreak?.endsAt ?? null;
  const countdown =
    countdownEnd === null ? null : formatCountdown(countdownEnd - currentTime);

  // ポモドーロの終了判定。閉じている間に時間が過ぎていても、開いた時点で処理する。
  useEffect(() => {
    if (!pomodoro || !loaded || busy) return;
    if (pomodoro.phase === "break") {
      if (currentTime >= pomodoro.endsAt) {
        savePomodoro(null);
        announce("休憩が終わりました");
      }
      return;
    }
    // 別のタブや端末で終了された場合は、ここでのカウントダウンをやめる。
    if (!focus) {
      savePomodoro(null);
      return;
    }
    if (currentTime >= focus.endsAt && !finishingRef.current) {
      // 失敗したら再読み込みまで再試行しない。毎秒エラーを出さないため。
      finishingRef.current = true;
      void finishFocus(focus);
    }
    // finishFocus は memo の最新値を使うので、毎回作り直される関数を依存に入れない。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pomodoro, focus, loaded, busy, currentTime, savePomodoro]);

  useEffect(() => {
    document.title = countdown
      ? `${countdown} ${onBreak ? "休憩" : "集中"}`
      : "Study";
  }, [countdown, onBreak]);

  async function run(action: () => Promise<void>) {
    setBusy(true);
    setError(null);
    try {
      await action();
    } catch {
      setError("保存できませんでした。ページを再読み込みしてください。");
    } finally {
      setBusy(false);
    }
  }

  function finishFocus(target: { endsAt: number }) {
    return run(async () => {
      const res = await post(`${API}/stop`, {
        memo,
        ended_at: new Date(target.endsAt).toISOString(),
      });
      if (!res.ok && res.status !== 409) {
        throw new Error(String(res.status));
      }
      if (res.ok) {
        if (active) writeDraft(active.id, null);
        setMemo("");
        savePomodoro({ phase: "break", endsAt: target.endsAt + BREAK_MS });
        announce("集中が終わりました。休憩しましょう");
      } else {
        savePomodoro(null);
      }
      await load();
      finishingRef.current = false;
    });
  }

  function changeMode(next: Mode) {
    setMode(next);
    writeStored(MODE_KEY, next);
    if (next === "normal") savePomodoro(null);
  }

  function toggle() {
    const startingPomodoro = mode === "pomodoro" && !active;
    if (startingPomodoro) askNotificationPermission();
    return run(async () => {
      const res = active
        ? await post(`${API}/stop`, { memo })
        : await post(`${API}/start`, { goal_id: goalId });
      // 409 は別タブ等で状態が変わった場合。最新の状態を読み直せば解消する。
      if (!res.ok && res.status !== 409) {
        throw new Error(String(res.status));
      }
      if (active && res.ok) {
        writeDraft(active.id, null);
        setMemo("");
      }
      // 途中で終了したら、実際の時間で記録して休憩には入らない。
      if (active) savePomodoro(null);
      const started =
        startingPomodoro && res.ok
          ? ((await res.json()) as { session: Session }).session
          : null;
      await load();
      // 読み直す前に設定すると、計測中の記録がないと判定されて消えてしまう。
      if (started) {
        savePomodoro({
          phase: "focus",
          sessionId: started.id,
          endsAt: new Date(started.started_at).getTime() + FOCUS_MS,
        });
      }
    });
  }

  function addGoal() {
    return run(async () => {
      const res = await post(GOALS_API, {
        title: newTitle,
        note_path: newNotePath,
      });
      if (!res.ok) throw new Error(String(res.status));
      const data = (await res.json()) as { goal: Goal };
      setGoalId(data.goal.id);
      setNewTitle("");
      setNewNotePath("");
      setAddingGoal(false);
      await load();
    });
  }

  function saveEdit() {
    const target = editing;
    const original = sessions?.find((s) => s.id === target?.id);
    if (!target || !original?.ended_at) return;
    const originalEnd = original.ended_at;
    return run(async () => {
      setEditError(null);
      const res = await post(`${API}/${target.id}`, {
        started_at: fromInputValue(target.startedAt, original.started_at),
        ended_at: fromInputValue(target.endedAt, originalEnd),
        memo: target.memo,
        goal_id: target.goalId,
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        const message = data?.error && EDIT_ERRORS[data.error];
        if (!message) throw new Error(String(res.status));
        setEditError(message);
        return;
      }
      setEditing(null);
      await load();
    });
  }

  function goalOptions() {
    return (
      <>
        <option value="">目標なし</option>
        {goals.map((g) => (
          <option key={g.id} value={g.id}>
            {g.title}
          </option>
        ))}
      </>
    );
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
              {focus ? "集中中" : active ? "計測中" : onBreak ? "休憩中" : "停止中"}
            </span>
          </div>
          <div className="mode-switch" role="group" aria-label="タイマーの種類">
            {(
              [
                ["normal", "通常"],
                ["pomodoro", "ポモドーロ（25分 / 休憩5分）"],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                className="btn btn-small"
                aria-pressed={mode === value}
                disabled={Boolean(active)}
                onClick={() => changeMode(value)}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="timer">
            <div className="clock" role="timer">
              {countdown ??
                (active
                  ? formatClock(currentTime - new Date(active.started_at).getTime())
                  : mode === "pomodoro"
                    ? formatCountdown(FOCUS_MS)
                    : formatClock(0))}
            </div>
            {onBreak ? (
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => savePomodoro(null)}
              >
                休憩をスキップ
              </button>
            ) : (
              <button
                type="button"
                className={`btn ${active ? "btn-danger" : "btn-primary"}`}
                onClick={toggle}
                disabled={busy || !loaded}
              >
                {active ? "終了" : "開始"}
              </button>
            )}
          </div>
          <div className="fields">
            {active ? (
              <>
                <div className="field-text">
                  目標: {goalTitle(active.goal_id) ?? "なし"}
                </div>
                <label className="field">
                  メモ（終了時に保存）
                  <textarea
                    className="input"
                    rows={3}
                    maxLength={2000}
                    value={memo}
                    placeholder="何を学習したか"
                    onChange={(e) => {
                      setMemo(e.target.value);
                      writeDraft(active.id, e.target.value);
                    }}
                  />
                </label>
              </>
            ) : (
              <>
                <div className="field-row">
                  <label className="field">
                    目標
                    <select
                      className="input"
                      value={goalId ?? ""}
                      onChange={(e) => setGoalId(goalValue(e.target.value))}
                    >
                      {goalOptions()}
                    </select>
                  </label>
                  <button
                    type="button"
                    className="btn btn-small"
                    onClick={() => setAddingGoal(!addingGoal)}
                  >
                    目標を追加
                  </button>
                </div>
                {addingGoal && (
                  <form
                    className="add-goal"
                    onSubmit={(e) => {
                      e.preventDefault();
                      addGoal();
                    }}
                  >
                    <label className="field">
                      目標名
                      <input
                        className="input"
                        required
                        maxLength={100}
                        value={newTitle}
                        onChange={(e) => setNewTitle(e.target.value)}
                      />
                    </label>
                    <label className="field">
                      Obsidian のノートパス（任意）
                      <input
                        className="input"
                        maxLength={300}
                        value={newNotePath}
                        placeholder="05_目標/2026年_29歳_年間目標"
                        onChange={(e) => setNewNotePath(e.target.value)}
                      />
                    </label>
                    <button type="submit" className="btn btn-small" disabled={busy}>
                      追加
                    </button>
                  </form>
                )}
              </>
            )}
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

        {goals.length > 0 && (
          <section>
            <h2 className="section-title">目標別（過去1年）</h2>
            <div className="box">
              <ul className="session-list">
                {[...goals.map((g) => g.id), null]
                  .filter((id) => goalTotals.has(id) || id !== null)
                  .map((id) => {
                    const total = goalTotals.get(id);
                    return (
                      <li key={id ?? "none"} className="session">
                        <span>{goalTitle(id) ?? "目標なし"}</span>
                        <span className="session-duration">
                          {formatDuration(total?.ms ?? 0)} / {total?.count ?? 0}回
                        </span>
                      </li>
                    );
                  })}
              </ul>
            </div>
          </section>
        )}

        <section>
          <h2 className="section-title">最近の記録</h2>
          <div className="box">
            {sessions && sessions.length > 0 ? (
              <ul className="session-list">
                {sessions.slice(0, RECENT_SESSIONS).map((s) => (
                  <li key={s.id} className="session session-entry">
                    <div className="session-line">
                      <span>
                        {dateKey(new Date(s.started_at))} {formatTime(s.started_at)}
                        {" - "}
                        {s.ended_at ? formatTime(s.ended_at) : "計測中"}
                        {goalTitle(s.goal_id) && (
                          <span className="label label-goal">
                            {goalTitle(s.goal_id)}
                          </span>
                        )}
                      </span>
                      <span className="session-duration">
                        {formatDuration(sessionMs(s, currentTime))}
                        {s.ended_at && (
                          <button
                            type="button"
                            className="link-btn"
                            onClick={() => {
                              setEditError(null);
                              setEditing({
                                id: s.id,
                                startedAt: toInputValue(s.started_at),
                                endedAt: toInputValue(s.ended_at ?? s.started_at),
                                goalId: s.goal_id,
                                memo: s.memo ?? "",
                              });
                            }}
                          >
                            編集
                          </button>
                        )}
                      </span>
                    </div>
                    {editing?.id === s.id ? (
                      <form
                        className="add-goal"
                        onSubmit={(e) => {
                          e.preventDefault();
                          saveEdit();
                        }}
                      >
                        {editError && (
                          <div role="alert" className="flash">
                            {editError}
                          </div>
                        )}
                        <div className="time-row">
                          <label className="field">
                            開始
                            <input
                              className="input"
                              type="datetime-local"
                              required
                              value={editing.startedAt}
                              onChange={(e) =>
                                setEditing({ ...editing, startedAt: e.target.value })
                              }
                            />
                          </label>
                          <label className="field">
                            終了
                            <input
                              className="input"
                              type="datetime-local"
                              required
                              value={editing.endedAt}
                              onChange={(e) =>
                                setEditing({ ...editing, endedAt: e.target.value })
                              }
                            />
                          </label>
                        </div>
                        <select
                          className="input"
                          aria-label="目標"
                          value={editing.goalId ?? ""}
                          onChange={(e) =>
                            setEditing({
                              ...editing,
                              goalId: goalValue(e.target.value),
                            })
                          }
                        >
                          {goalOptions()}
                        </select>
                        <textarea
                          className="input"
                          aria-label="メモ"
                          rows={3}
                          maxLength={2000}
                          value={editing.memo}
                          onChange={(e) =>
                            setEditing({ ...editing, memo: e.target.value })
                          }
                        />
                        <div className="form-actions">
                          <button type="submit" className="btn btn-small" disabled={busy}>
                            保存
                          </button>
                          <button
                            type="button"
                            className="btn btn-small"
                            onClick={() => setEditing(null)}
                          >
                            キャンセル
                          </button>
                        </div>
                      </form>
                    ) : (
                      s.memo && <p className="session-memo">{s.memo}</p>
                    )}
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
