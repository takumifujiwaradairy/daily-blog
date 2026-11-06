-- 1回の学習 = 1行。日次の合計は保存せず、行から集計する。
-- ノートを紐づけるときは、この id を参照する別テーブルを足す。
CREATE TABLE study_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  started_at TEXT NOT NULL,
  ended_at TEXT,
  CHECK (ended_at IS NULL OR ended_at >= started_at)
);

-- 計測中(ended_at IS NULL)の行は同時に1つだけ。二重開始をDBで防ぐ。
CREATE UNIQUE INDEX idx_study_sessions_one_active
  ON study_sessions ((ended_at IS NULL))
  WHERE ended_at IS NULL;

CREATE INDEX idx_study_sessions_started_at ON study_sessions (started_at);
