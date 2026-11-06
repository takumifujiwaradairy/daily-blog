-- 目標と、1回の学習に付けるメモ。既存の記録は目標なし・メモなしのまま残る。
CREATE TABLE goals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL UNIQUE,
  note_path TEXT,
  created_at TEXT NOT NULL
);

ALTER TABLE study_sessions ADD COLUMN goal_id INTEGER REFERENCES goals (id);
ALTER TABLE study_sessions ADD COLUMN memo TEXT;

CREATE INDEX idx_study_sessions_goal_id ON study_sessions (goal_id);
