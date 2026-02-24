-- ============================================================
-- FIX: Permissões de Exclusão para Questionários (Quiz)
-- ============================================================

-- 1. Habilitar RLS em todas as tabelas de quiz (garantir)
ALTER TABLE IF EXISTS public.quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.quiz_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.quiz_options ENABLE ROW LEVEL SECURITY;

-- 2. Remover políticas antigas para evitar conflitos
DROP POLICY IF EXISTS "Admins/Instructors can do everything on quizzes" ON public.quizzes;
DROP POLICY IF EXISTS "Admins/Instructors can do everything on quiz_questions" ON public.quiz_questions;
DROP POLICY IF EXISTS "Admins/Instructors can do everything on quiz_options" ON public.quiz_options;
DROP POLICY IF EXISTS "Students can select quizzes" ON public.quizzes;
DROP POLICY IF EXISTS "Students can select quiz_questions" ON public.quiz_questions;
DROP POLICY IF EXISTS "Students can select quiz_options" ON public.quiz_options;

-- 3. Criar Políticas de Acesso Total para ADMIN e INSTRUCTOR

-- Quizzes
CREATE POLICY "Admins/Instructors can do everything on quizzes" 
ON public.quizzes 
FOR ALL 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('ADMIN', 'INSTRUCTOR')
  )
);

-- Questions
CREATE POLICY "Admins/Instructors can do everything on quiz_questions" 
ON public.quiz_questions 
FOR ALL 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('ADMIN', 'INSTRUCTOR')
  )
);

-- Options
CREATE POLICY "Admins/Instructors can do everything on quiz_options" 
ON public.quiz_options 
FOR ALL 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('ADMIN', 'INSTRUCTOR')
  )
);

-- 4. Permitir que Alunos (Authenticated) leiam (SELECT)
CREATE POLICY "Show quizzes to all authenticated" ON public.quizzes FOR SELECT USING (true);
CREATE POLICY "Show quiz_questions to all authenticated" ON public.quiz_questions FOR SELECT USING (true);
CREATE POLICY "Show quiz_options to all authenticated" ON public.quiz_options FOR SELECT USING (true);

-- 5. Garantir Cascade Delete (Geralmente já está, mas reforçando conceito)
-- As foreign keys já têm ON DELETE CASCADE segundo quiz_migration.sql
