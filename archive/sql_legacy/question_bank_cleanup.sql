-- ============================================================
-- CLEANUP: Identify and Fix Incomplete Questions
-- ============================================================

-- 1. Identify questions with less than 2 options
-- These cause: "ValidationError: Questão deve ter pelo menos 2 opções."
SELECT q.id, q.question_text, COUNT(o.id) as option_count
FROM public.question_bank q
LEFT JOIN public.question_bank_options o ON q.id = o.question_id
GROUP BY q.id, q.question_text
HAVING COUNT(o.id) < 2;

-- 2. Identify questions with no correct option
-- These cause: "ValidationError: Questão deve ter pelo menos uma opção correta."
SELECT q.id, q.question_text
FROM public.question_bank q
WHERE NOT EXISTS (
    SELECT 1 FROM public.question_bank_options o 
    WHERE o.question_id = q.id AND o.is_correct = true
);

-- 3. [OPTIONAL] Delete questions with 0 options (Clean up abandoned questions)
-- CAUTION: Run this ONLY if you want to permanently remove them.
-- DELETE FROM public.question_bank 
-- WHERE id IN (
--   SELECT q.id 
--   FROM public.question_bank q
--   LEFT JOIN public.question_bank_options o ON q.id = o.question_id
--   GROUP BY q.id
--   HAVING COUNT(o.id) = 0
-- );
