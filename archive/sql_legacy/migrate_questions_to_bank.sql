-- ============================================================
-- MIGRATION: Centralize Quiz Questions into Question Bank
-- ============================================================
-- This script migrates all quiz-specific questions from quiz_questions
-- to the centralized question_bank table for unified management.
--
-- IMPORTANT: Run this in Supabase SQL Editor
-- BACKUP YOUR DATA BEFORE RUNNING THIS MIGRATION!
-- ============================================================

-- Step 1: Create temporary mapping table to track migrated questions
CREATE TEMP TABLE question_migration_map (
    old_quiz_question_id UUID,
    new_bank_question_id UUID,
    quiz_id UUID,
    lesson_id UUID
);

-- Step 2: Insert all quiz_questions into question_bank
-- We need to get the lesson_id from the quizzes table
WITH quiz_questions_with_lesson AS (
    SELECT 
        qq.id as old_question_id,
        qq.quiz_id,
        q.lesson_id,
        qq.question_text,
        qq.question_type,
        qq.points,
        qq.position,
        NOW() as created_at,
        -- Try to determine difficulty based on points (fallback to 'medium')
        CASE 
            WHEN qq.points <= 1 THEN 'easy'::text
            WHEN qq.points >= 3 THEN 'hard'::text
            ELSE 'medium'::text
        END as difficulty
    FROM quiz_questions qq
    JOIN quizzes q ON qq.quiz_id = q.id
    -- Only migrate questions that don't already exist in question_bank
    WHERE NOT EXISTS (
        SELECT 1 FROM question_bank qb 
        WHERE qb.question_text = qq.question_text 
        AND qb.lesson_id = q.lesson_id
    )
)
INSERT INTO question_bank (
    lesson_id,
    question_text,
    difficulty,
    points,
    created_at
)
SELECT 
    lesson_id,
    question_text,
    difficulty,
    points,
    created_at
FROM quiz_questions_with_lesson
RETURNING id, lesson_id;

-- Step 3: Populate the mapping table
-- This maps old quiz_question IDs to new question_bank IDs
INSERT INTO question_migration_map (old_quiz_question_id, new_bank_question_id, quiz_id, lesson_id)
SELECT 
    qq.id as old_quiz_question_id,
    qb.id as new_bank_question_id,
    qq.quiz_id,
    q.lesson_id
FROM quiz_questions qq
JOIN quizzes q ON qq.quiz_id = q.id
JOIN question_bank qb ON (
    qb.question_text = qq.question_text 
    AND qb.lesson_id = q.lesson_id
);

-- Step 4: Migrate options from quiz_options to question_bank_options
INSERT INTO question_bank_options (
    question_id,
    option_text,
    is_correct,
    position
)
SELECT 
    m.new_bank_question_id as question_id,
    qo.option_text,
    qo.is_correct,
    qo.position
FROM quiz_options qo
JOIN question_migration_map m ON qo.question_id = m.old_quiz_question_id
-- Avoid duplicates
WHERE NOT EXISTS (
    SELECT 1 FROM question_bank_options qbo
    WHERE qbo.question_id = m.new_bank_question_id
    AND qbo.option_text = qo.option_text
);

-- Step 5: Verify migration results
SELECT 
    'Quiz Questions' as source,
    COUNT(*) as total_questions
FROM quiz_questions
UNION ALL
SELECT 
    'Question Bank (Before)' as source,
    COUNT(*) as total_questions
FROM question_bank WHERE created_at < NOW() - INTERVAL '1 minute'
UNION ALL
SELECT 
    'Question Bank (After Migration)' as source,
    COUNT(*) as total_questions
FROM question_bank
UNION ALL
SELECT 
    'Migrated Questions' as source,
    COUNT(*) as total_questions
FROM question_migration_map;

-- Step 6: Display migration summary
SELECT 
    quiz_id,
    COUNT(*) as questions_migrated
FROM question_migration_map
GROUP BY quiz_id
ORDER BY questions_migrated DESC;

-- ============================================================
-- IMPORTANT NOTES:
-- ============================================================
-- 1. This migration does NOT delete the old quiz_questions table
--    You should verify the migration worked before dropping it
-- 2. Application code needs to be updated to use question_bank
-- 3. Quiz relationships will need to be managed differently
-- 4. Consider adding a 'source' column to track where questions came from
--
-- TO ROLLBACK (if needed):
-- - The old quiz_questions and quiz_options tables are still intact
-- - You can delete migrated entries from question_bank using created_at timestamp
-- ============================================================

-- Optional Step 7: Add source tracking column (recommended)
ALTER TABLE question_bank ADD COLUMN IF NOT EXISTS source VARCHAR(50) DEFAULT 'bank';

UPDATE question_bank qb
SET source = 'quiz_migration'
WHERE id IN (SELECT new_bank_question_id FROM question_migration_map);

-- Optional Step 8: Create a quiz_bank_questions junction table
-- This allows quizzes to reference questions from the bank
CREATE TABLE IF NOT EXISTS quiz_bank_questions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    quiz_id UUID REFERENCES quizzes(id) ON DELETE CASCADE,
    question_id UUID REFERENCES question_bank(id) ON DELETE CASCADE,
    position INTEGER,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(quiz_id, question_id)
);

-- Populate the junction table with migrated questions
INSERT INTO quiz_bank_questions (quiz_id, question_id, position)
SELECT 
    m.quiz_id,
    m.new_bank_question_id,
    qq.position
FROM question_migration_map m
JOIN quiz_questions qq ON m.old_quiz_question_id = qq.id
ON CONFLICT (quiz_id, question_id) DO NOTHING;

-- Final verification
SELECT 
    'Total Questions in Bank' as metric,
    COUNT(*) as count
FROM question_bank
UNION ALL
SELECT 
    'Total Quiz-Bank Links' as metric,
    COUNT(*) as count
FROM quiz_bank_questions
UNION ALL
SELECT 
    'Quizzes with Questions' as metric,
    COUNT(DISTINCT quiz_id) as count
FROM quiz_bank_questions;

-- Migration Complete! ✅
