-- Idempotent StudyGPS workspace schema. Runtime queries always scope records by
-- verified Clerk ID and teacher-owned enrollment. No demo users or elevated roles.
CREATE TABLE IF NOT EXISTS studygps_profiles (
  user_id TEXT PRIMARY KEY,
  name TEXT NOT NULL CHECK (char_length(name) BETWEEN 1 AND 80),
  email TEXT NOT NULL DEFAULT '',
  role TEXT NOT NULL CHECK (role IN ('student', 'teacher')),
  goal TEXT NOT NULL DEFAULT '' CHECK (char_length(goal) <= 500),
  timezone TEXT NOT NULL DEFAULT 'Australia/Sydney',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS studygps_classrooms (
  id UUID PRIMARY KEY,
  teacher_id TEXT NOT NULL UNIQUE REFERENCES studygps_profiles(user_id),
  name TEXT NOT NULL CHECK (char_length(name) BETWEEN 1 AND 80),
  code TEXT NOT NULL UNIQUE CHECK (char_length(code) = 20),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS studygps_enrollments (
  student_id TEXT PRIMARY KEY REFERENCES studygps_profiles(user_id),
  classroom_id UUID NOT NULL REFERENCES studygps_classrooms(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS studygps_enrollments_classroom_idx ON studygps_enrollments(classroom_id);
CREATE TABLE IF NOT EXISTS studygps_learning (
  student_id TEXT PRIMARY KEY REFERENCES studygps_profiles(user_id),
  scores JSONB NOT NULL,
  target_score DOUBLE PRECISION NOT NULL CHECK (target_score BETWEEN 0 AND 100),
  minutes INTEGER NOT NULL CHECK (minutes BETWEEN 0 AND 1440),
  plan JSONB NOT NULL,
  completed_task_ids JSONB NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(completed_task_ids) = 'array'),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS studygps_assessments (
  id UUID PRIMARY KEY,
  student_id TEXT NOT NULL REFERENCES studygps_profiles(user_id),
  scores JSONB NOT NULL,
  overall_score DOUBLE PRECISION,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS studygps_assessments_student_idx ON studygps_assessments(student_id, created_at DESC);
CREATE TABLE IF NOT EXISTS studygps_advice (
  id UUID PRIMARY KEY,
  student_id TEXT NOT NULL REFERENCES studygps_profiles(user_id),
  teacher_id TEXT NOT NULL REFERENCES studygps_profiles(user_id),
  message TEXT NOT NULL CHECK (char_length(message) BETWEEN 1 AND 2000),
  focus_topic TEXT CHECK (focus_topic IS NULL OR focus_topic IN ('first_law','second_law','entropy','rankine_cycle')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS studygps_advice_student_idx ON studygps_advice(student_id, created_at DESC);

-- Explicit fixture provenance, never writable through the public profile API.
ALTER TABLE studygps_profiles ADD COLUMN IF NOT EXISTS is_demo BOOLEAN NOT NULL DEFAULT false;
