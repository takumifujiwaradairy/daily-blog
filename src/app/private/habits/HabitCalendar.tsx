"use client";

import { useMemo, useState } from "react";
import {
  dayTypeOf,
  monthCells,
  parseKey,
  statusOf,
  summarize,
  type DayType,
  type HabitData,
  type HabitStatus,
} from "./habit";

const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];

const STATUS: Record<HabitStatus, { label: string; mark: string }> = {
  done: { label: "できた", mark: "✓" },
  missed: { label: "未達", mark: "×" },
  pending: { label: "今日", mark: "" },
  holiday: { label: "祝日", mark: "" },
  future: { label: "これから", mark: "" },
  untracked: { label: "記録前", mark: "" },
};

export default function HabitCalendar({
  title,
  today,
  data,
  busy,
  onToggleDone,
  onChangeDayType,
}: {
  title: string;
  today: string;
  data: HabitData;
  busy: boolean;
  onToggleDone: (date: string, done: boolean) => void;
  onChangeDayType: (date: string, dayType: DayType) => void;
}) {
  const [selected, setSelected] = useState(today);
  const [month, setMonth] = useState(() => {
    const date = parseKey(today);
    return { year: date.getFullYear(), month: date.getMonth() };
  });

  const cells = useMemo(() => monthCells(month.year, month.month), [month]);
  const summary = summarize(today, data);

  function moveMonth(delta: number) {
    const next = new Date(month.year, month.month + delta, 1);
    setMonth({ year: next.getFullYear(), month: next.getMonth() });
  }

  const selectedDate = parseKey(selected);
  const selectedDone = data.checks.includes(selected);
  const selectedType = dayTypeOf(selected, data);

  return (
    <section>
      <h2 className="section-title">{title}</h2>
      <div className="box">
        <div className="stats">
          <div className="stat">
            <div className="stat-value">{summary.streak}日</div>
            <div className="stat-label">連続（平日）</div>
          </div>
          <div className="stat">
            <div className="stat-value">
              {summary.weekDone} / {summary.weekTarget}
            </div>
            <div className="stat-label">今週</div>
          </div>
          <div className="stat">
            <div className="stat-value">
              {summary.rate === null ? "-" : `${summary.rate}%`}
            </div>
            <div className="stat-label">達成率</div>
          </div>
        </div>

        <div className="calendar-nav">
          <button
            type="button"
            className="btn btn-small"
            aria-label="前の月"
            onClick={() => moveMonth(-1)}
          >
            ‹
          </button>
          <span>
            {month.year}年{month.month + 1}月
          </span>
          <button
            type="button"
            className="btn btn-small"
            aria-label="次の月"
            onClick={() => moveMonth(1)}
          >
            ›
          </button>
        </div>

        <div className="calendar">
          {WEEKDAYS.map((label) => (
            <div key={label} className="graph-axis calendar-head">
              {label}
            </div>
          ))}
          {cells.map((key, index) => {
            if (!key) return <div key={`blank-${index}`} />;
            const status = statusOf(key, today, data);
            return (
              <button
                type="button"
                key={key}
                className={`calendar-day habit-${status}${key === today ? " calendar-today" : ""}`}
                aria-pressed={key === selected}
                aria-label={`${key} ${STATUS[status].label}`}
                title={`${key}: ${STATUS[status].label}`}
                onClick={() => setSelected(key)}
              >
                <span>{parseKey(key).getDate()}</span>
                <span aria-hidden="true" className="calendar-mark">
                  {STATUS[status].mark}
                </span>
              </button>
            );
          })}
        </div>

        <div className="day-panel">
          <div className="day-panel-title">
            {selectedDate.getMonth() + 1}/{selectedDate.getDate()}（
            {WEEKDAYS[selectedDate.getDay()]}）
            {selected === today && " 今日"}
          </div>
          <div className="day-panel-actions">
            <button
              type="button"
              className={`btn ${selectedDone ? "" : "btn-primary"} btn-done`}
              disabled={busy || selected > today}
              onClick={() => onToggleDone(selected, !selectedDone)}
            >
              {selectedDone ? "できたを取り消す" : "できた"}
            </button>
            <div className="mode-switch-inline" role="group" aria-label="日の種類">
              {(
                [
                  ["weekday", "平日"],
                  ["holiday", "祝日"],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  className="btn btn-small"
                  aria-pressed={selectedType === value}
                  disabled={busy}
                  onClick={() => onChangeDayType(selected, value)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
