ALTER TABLE courses ADD COLUMN image_url TEXT;

-- Update RLS policies if necessary, but adding a column usually inherits existing table policies.
-- Existing read/write policies for courses should cover this new column.
