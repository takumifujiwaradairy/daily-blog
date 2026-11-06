-- 習慣の「できた」と、日ごとの平日/祝日の指定。習慣の種類はコードで定義する。
CREATE TABLE habit_checks (
  habit TEXT NOT NULL,
  date TEXT NOT NULL,
  created_at TEXT NOT NULL,
  PRIMARY KEY (habit, date)
);

-- 指定のない日は、月〜金を平日、土日を祝日として扱う。
CREATE TABLE calendar_days (
  date TEXT PRIMARY KEY,
  day_type TEXT NOT NULL CHECK (day_type IN ('weekday', 'holiday'))
);
