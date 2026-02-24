-- Add color and color_legend columns to courses table
BEGIN;
ALTER TABLE courses ADD COLUMN IF NOT EXISTS color text DEFAULT NULL;
ALTER TABLE courses ADD COLUMN IF NOT EXISTS color_legend text DEFAULT NULL;
COMMIT;
