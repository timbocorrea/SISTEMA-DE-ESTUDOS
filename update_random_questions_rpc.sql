-- ============================================================
-- MIGRATION: Update get_random_bank_questions to support exclusion
-- Date: 2026-02-09
-- ============================================================

-- Function to get random questions with optional exclusion list
CREATE OR REPLACE FUNCTION public.get_random_bank_questions(
  p_count INTEGER,
  p_course_id UUID DEFAULT NULL,
  p_module_id UUID DEFAULT NULL,
  p_lesson_id UUID DEFAULT NULL,
  p_difficulty TEXT DEFAULT NULL,
  p_exclude_ids UUID[] DEFAULT NULL
)
RETURNS SETOF JSON AS $$
BEGIN
  RETURN QUERY
  WITH filtered_questions AS (
    SELECT q.*
    FROM question_bank q
    WHERE (p_course_id IS NULL OR q.course_id = p_course_id)
      AND (p_module_id IS NULL OR q.module_id = p_module_id)
      AND (p_lesson_id IS NULL OR q.lesson_id = p_lesson_id)
      AND (p_difficulty IS NULL OR q.difficulty = p_difficulty)
      AND (p_exclude_ids IS NULL OR q.id <> ALL(p_exclude_ids))
    ORDER BY random()
    LIMIT p_count
  )
  SELECT row_to_json(q_data)
  FROM (
    SELECT 
      fq.*,
      COALESCE(
        (SELECT json_agg(row_to_json(opt))
         FROM (
           SELECT * FROM question_bank_options 
           WHERE question_id = fq.id 
           ORDER BY position
         ) opt
        ), '[]'::json
      ) as question_bank_options
    FROM filtered_questions fq
  ) q_data;
END;
$$ LANGUAGE plpgsql;
