// 平日朝の学習習慣の判定。記録から計算するだけなので、専用の保存先は持たない。

export type HabitSession = {
  started_at: string;
  ended_at: string | null;
};

export type HabitStatus = "done" | "partial" | "missed" | "pending" | "off" | "future";

export type HabitDay = {
  key: string;
  date: Date;
  status: HabitStatus;
  morningMs: number;
};

// 過去の日を「未達」に数えないよう、習慣を始める日を決めておく。
export const HABIT_START = "2026-11-09";
export const HABIT_TARGET_MS = 50 * 60_000;

// ポモドーロの2回分（25分 x 2）で達成できるよう、目標は1時間ではなく50分にする。
// 開始と終了は、多少前後しても同じ朝の学習として数える。
const WINDOW_START = 8 * 60 + 45;
const LATEST_START = 9 * 60 + 15;
const WINDOW_END = 10 * 60 + 30;

export function dateKey(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

export function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function parseKey(key: string): Date {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function atMinutes(date: Date, minutes: number): number {
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    0,
    minutes,
  ).getTime();
}

function isWeekday(date: Date): boolean {
  return date.getDay() >= 1 && date.getDay() <= 5;
}

export function evaluateDay(
  date: Date,
  sessions: HabitSession[],
  now: number,
  start = HABIT_START,
): HabitDay {
  const key = dateKey(date);
  const day = (status: HabitStatus, morningMs = 0): HabitDay => ({
    key,
    date,
    status,
    morningMs,
  });
  if (!isWeekday(date) || key < start) return day("off");
  if (atMinutes(date, 0) > now) return day("future");

  const windowStart = atMinutes(date, WINDOW_START);
  const windowEnd = atMinutes(date, WINDOW_END);
  let morningMs = 0;
  let startedOnTime = false;
  for (const s of sessions) {
    const begin = new Date(s.started_at).getTime();
    const end = s.ended_at ? new Date(s.ended_at).getTime() : now;
    const overlap = Math.min(end, windowEnd) - Math.max(begin, windowStart);
    if (overlap <= 0) continue;
    morningMs += overlap;
    if (begin <= atMinutes(date, LATEST_START)) startedOnTime = true;
  }

  if (startedOnTime && morningMs >= HABIT_TARGET_MS) return day("done", morningMs);
  if (now < windowEnd) return day("pending", morningMs);
  return day(morningMs > 0 ? "partial" : "missed", morningMs);
}

export type HabitSummary = {
  today: HabitDay;
  // 新しい週が下。各週は月曜から金曜の5日。
  weeks: HabitDay[][];
  streak: number;
  thisWeek: number;
  rate: number | null;
};

export function summarize(
  sessions: HabitSession[],
  now: number,
  maxWeeks = 8,
  start = HABIT_START,
): HabitSummary {
  const todayDate = new Date(now);
  todayDate.setHours(0, 0, 0, 0);
  const evaluate = (date: Date) => evaluateDay(date, sessions, now, start);
  const startDate = parseKey(start);
  const monday = (date: Date) => addDays(date, -((date.getDay() + 6) % 7));

  // 開始前はその週だけを表示する。週末は今週の結果を見られるようにする。
  const anchor = monday(todayDate < startDate ? startDate : todayDate);
  const weeks: HabitDay[][] = [];
  for (let i = maxWeeks - 1; i >= 0; i -= 1) {
    const weekStart = addDays(anchor, -7 * i);
    if (addDays(weekStart, 4) < startDate) continue;
    weeks.push(
      [0, 1, 2, 3, 4].map((offset) => evaluate(addDays(weekStart, offset))),
    );
  }

  // 全期間を数えるので、表示する週数とは別に集計する。
  let done = 0;
  let due = 0;
  let streak = 0;
  let streakOpen = true;
  for (let date = todayDate; date >= startDate; date = addDays(date, -1)) {
    const { status } = evaluate(date);
    if (status === "off" || status === "pending" || status === "future") continue;
    due += 1;
    if (status === "done") {
      done += 1;
      if (streakOpen) streak += 1;
    } else {
      streakOpen = false;
    }
  }

  const thisWeek = [0, 1, 2, 3, 4].filter(
    (offset) => evaluate(addDays(monday(todayDate), offset)).status === "done",
  ).length;

  return {
    today: evaluate(todayDate),
    weeks,
    streak,
    thisWeek,
    rate: due === 0 ? null : Math.round((done / due) * 100),
  };
}
