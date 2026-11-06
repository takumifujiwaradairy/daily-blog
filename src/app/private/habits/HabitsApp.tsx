"use client";

import { useEffect, useState } from "react";
import PrivateHeader from "../PrivateHeader";
import HabitCalendar from "./HabitCalendar";
import { dateKey, type DayType } from "./habit";

type Habit = {
  id: string;
  title: string;
  weekdayGoal: string;
  holidayGoal: string | null;
};

type HabitsResponse = {
  habits: Habit[];
  checks: Record<string, string[]>;
  dayTypes: Record<string, DayType>;
};

async function post(path: string, body: unknown) {
  const res = await fetch(path, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(String(res.status));
}

export default function HabitsApp() {
  const [data, setData] = useState<HabitsResponse | null>(null);
  // 静的HTMLはビルド時に作られるので、今日の日付はマウント後に入れる。
  const [today, setToday] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setToday(dateKey(new Date()));
    fetch("/private/api/habits", { cache: "no-store" })
      .then((res) => {
        if (!res.ok) throw new Error(String(res.status));
        return res.json() as Promise<HabitsResponse>;
      })
      .then(setData)
      .catch(() =>
        setError("読み込めませんでした。ページを再読み込みしてください。"),
      );
    // 開いたまま日付が変わっても、今日の表示がずれないようにする。
    const timer = setInterval(() => setToday(dateKey(new Date())), 60_000);
    return () => clearInterval(timer);
  }, []);

  async function save(path: string, body: unknown, apply: () => void) {
    setBusy(true);
    setError(null);
    try {
      await post(path, body);
      apply();
    } catch {
      setError("保存できませんでした。ページを再読み込みしてください。");
    } finally {
      setBusy(false);
    }
  }

  function toggleDone(habit: string, date: string, done: boolean) {
    return save("/private/api/habits/check", { habit, date, done }, () =>
      setData(
        (current) =>
          current && {
            ...current,
            checks: {
              ...current.checks,
              [habit]: done
                ? [...(current.checks[habit] ?? []), date]
                : (current.checks[habit] ?? []).filter((key) => key !== date),
            },
          },
      ),
    );
  }

  function changeDayType(date: string, dayType: DayType) {
    return save("/private/api/calendar/day", { date, day_type: dayType }, () =>
      setData(
        (current) =>
          current && {
            ...current,
            dayTypes: { ...current.dayTypes, [date]: dayType },
          },
      ),
    );
  }

  return (
    <>
      <PrivateHeader current="habits" />
      <main className="page">
        {error && (
          <div role="alert" className="flash">
            {error}
          </div>
        )}
        {data && today ? (
          data.habits.map((habit) => (
            <HabitCalendar
              key={habit.id}
              title={habit.title}
              weekdayGoal={habit.weekdayGoal}
              holidayGoal={habit.holidayGoal}
              today={today}
              data={{
                checks: data.checks[habit.id] ?? [],
                dayTypes: data.dayTypes,
                includesHolidays: habit.holidayGoal !== null,
              }}
              busy={busy}
              onToggleDone={(date, done) => toggleDone(habit.id, date, done)}
              onChangeDayType={changeDayType}
            />
          ))
        ) : (
          !error && <p className="empty">読み込み中</p>
        )}
      </main>
    </>
  );
}
