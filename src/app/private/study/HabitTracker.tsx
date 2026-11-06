"use client";

import { useMemo } from "react";
import {
  HABIT_START,
  HABIT_TARGET_MS,
  summarize,
  type HabitDay,
  type HabitSession,
  type HabitStatus,
} from "./habit";

const WEEKDAYS = ["月", "火", "水", "木", "金"];

const STATUS: Record<HabitStatus, { label: string; mark: string }> = {
  done: { label: "達成", mark: "✓" },
  partial: { label: "一部", mark: "△" },
  missed: { label: "未達", mark: "×" },
  pending: { label: "今日", mark: "" },
  future: { label: "これから", mark: "" },
  off: { label: "対象外", mark: "" },
};

function todayMessage(today: HabitDay): string {
  const minutes = Math.floor(today.morningMs / 60_000);
  const target = HABIT_TARGET_MS / 60_000;
  switch (today.status) {
    case "done":
      return `今日は達成しました（${minutes}分）`;
    case "pending":
      return `今日の朝: ${minutes} / ${target}分`;
    case "partial":
      return `今日は一部達成でした（${minutes}分）`;
    case "missed":
      return "今日の朝は未達でした";
    case "off":
      return today.key < HABIT_START
        ? `${HABIT_START}（月）から始まります`
        : "今日はお休みです";
    case "future":
      return "";
  }
}

export default function HabitTracker({
  sessions,
  now,
}: {
  sessions: HabitSession[];
  now: number;
}) {
  const { today, weeks, streak, thisWeek, rate } = useMemo(
    () => summarize(sessions, now),
    [sessions, now],
  );

  return (
    <section>
      <h2 className="section-title">習慣: 平日 9:00 から1時間</h2>
      <div className="box">
        <div className="habit-today">{todayMessage(today)}</div>
        <div className="stats">
          <div className="stat">
            <div className="stat-value">{streak}日</div>
            <div className="stat-label">連続（平日）</div>
          </div>
          <div className="stat">
            <div className="stat-value">{thisWeek} / 5</div>
            <div className="stat-label">今週</div>
          </div>
          <div className="stat">
            <div className="stat-value">{rate === null ? "-" : `${rate}%`}</div>
            <div className="stat-label">達成率</div>
          </div>
        </div>
        <div className="habit-grid">
          {WEEKDAYS.map((label) => (
            <div key={label} className="graph-axis habit-head">
              {label}
            </div>
          ))}
          {weeks.flat().map((day) => (
            <div
              key={day.key}
              className={`habit-cell habit-${day.status}`}
              title={`${day.key}: ${STATUS[day.status].label}`}
              aria-label={`${day.key} ${STATUS[day.status].label}`}
            >
              <span className="habit-date">
                {day.date.getMonth() + 1}/{day.date.getDate()}
              </span>
              <span aria-hidden="true">{STATUS[day.status].mark}</span>
            </div>
          ))}
        </div>
        <p className="habit-note">
          9:15までに開始し、8:45〜10:30に合計50分以上で達成（ポモドーロ2回分）。
          開始が遅れた日や短かった日は一部（△）。
        </p>
      </div>
    </section>
  );
}
