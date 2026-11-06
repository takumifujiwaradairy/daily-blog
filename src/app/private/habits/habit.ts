// 習慣のカレンダーの判定。「できた」は本人が付けるので、学習時間とは連動しない。

export type DayType = "weekday" | "holiday";

export type HabitData = {
  checks: string[];
  dayTypes: Record<string, DayType>;
  includesHolidays?: boolean;
};

export type HabitStatus =
  | "done"
  | "missed"
  | "pending"
  | "holiday"
  | "future"
  | "untracked";

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

export function parseKey(key: string): Date {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export function dayTypeOf(key: string, data: HabitData): DayType {
  const weekday = parseKey(key).getDay();
  return data.dayTypes[key] ?? (weekday === 0 || weekday === 6 ? "holiday" : "weekday");
}

function isTarget(key: string, data: HabitData): boolean {
  return dayTypeOf(key, data) === "weekday" || data.includesHolidays === true;
}

// 最初に「できた」を付けた日から記録を始める。それより前の日は未達に数えない。
function firstCheck(data: HabitData): string | null {
  return data.checks.reduce<string | null>(
    (first, key) => (first === null || key < first ? key : first),
    null,
  );
}

export function statusOf(key: string, today: string, data: HabitData): HabitStatus {
  const target = isTarget(key, data);
  if (key > today) return target ? "future" : "holiday";
  if (data.checks.includes(key)) return "done";
  if (!target) return "holiday";
  if (key === today) return "pending";
  const first = firstCheck(data);
  return first === null || key < first ? "untracked" : "missed";
}

export type HabitSummary = {
  streak: number;
  weekDone: number;
  weekTarget: number;
  rate: number | null;
};

// 集計の対象はその習慣の対象日だけ。対象外の日は、できても連続や達成率を動かさない。
export function summarize(today: string, data: HabitData): HabitSummary {
  const first = firstCheck(data);
  let done = 0;
  let due = 0;
  let streak = 0;
  let streakOpen = true;
  if (first !== null) {
    const start = parseKey(first);
    for (let date = parseKey(today); date >= start; date = addDays(date, -1)) {
      const key = dateKey(date);
      if (!isTarget(key, data)) continue;
      const status = statusOf(key, today, data);
      if (status === "pending") continue;
      due += 1;
      if (status === "done") {
        done += 1;
        if (streakOpen) streak += 1;
      } else {
        streakOpen = false;
      }
    }
  }

  const todayDate = parseKey(today);
  const sunday = addDays(todayDate, -todayDate.getDay());
  const week = [0, 1, 2, 3, 4, 5, 6]
    .map((offset) => dateKey(addDays(sunday, offset)))
    .filter((key) => isTarget(key, data));

  return {
    streak,
    weekDone: week.filter((key) => data.checks.includes(key)).length,
    weekTarget: week.length,
    rate: due === 0 ? null : Math.round((done / due) * 100),
  };
}

// 月の表示用。前後の月の分は null で埋めて、曜日の列をそろえる。
export function monthCells(year: number, month: number): (string | null)[] {
  const first = new Date(year, month, 1);
  const cells: (string | null)[] = Array(first.getDay()).fill(null);
  for (let date = first; date.getMonth() === month; date = addDays(date, 1)) {
    cells.push(dateKey(date));
  }
  return cells;
}
