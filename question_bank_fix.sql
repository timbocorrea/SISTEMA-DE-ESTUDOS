-- ============================================================
-- FIX: Banco de Questões Centralizado (Tabelas e Permissões)
-- ============================================================

-- 1. Garantir que as tabelas existem
CREATE TABLE IF NOT EXISTS public.question_bank (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  course_id UUID REFERENCES courses(id) ON DELETE SET NULL,
  module_id UUID REFERENCES modules(id) ON DELETE SET NULL,
  lesson_id UUID REFERENCES lessons(id) ON DELETE SET NULL,
  question_text TEXT NOT NULL,
  image_url TEXT,
  difficulty TEXT DEFAULT 'medium' CHECK (difficulty IN ('easy', 'medium', 'hard')),
  points INTEGER DEFAULT 1 CHECK (points > 0),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.question_bank_options (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  question_id UUID NOT NULL REFERENCES question_bank(id) ON DELETE CASCADE,
  option_text TEXT NOT NULL,
  is_correct BOOLEAN DEFAULT FALSE,
  position INTEGER NOT NULL CHECK (position >= 0),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Habilitar RLS
ALTER TABLE public.question_bank ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.question_bank_options ENABLE ROW LEVEL SECURITY;

-- 3. Criar Políticas de Acesso

-- Remover políticas antigas se existirem para evitar duplicidade
DROP POLICY IF EXISTS "Admins/Instructors can do everything on question_bank" ON public.question_bank;
DROP POLICY IF EXISTS "Authenticated users can select from question_bank" ON public.question_bank;
DROP POLICY IF EXISTS "Admins/Instructors can do everything on question_bank_options" ON public.question_bank_options;
DROP POLICY IF EXISTS "Authenticated users can select from question_bank_options" ON public.question_bank_options;

-- Políticas para question_bank
CREATE POLICY "Admins/Instructors can do everything on question_bank" 
ON public.question_bank 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('ADMIN', 'INSTRUCTOR')
  )
);

CREATE POLICY "Authenticated users can select from question_bank" 
ON public.question_bank 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

-- Políticas para question_bank_options
CREATE POLICY "Admins/Instructors can do everything on question_bank_options" 
ON public.question_bank_options 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('ADMIN', 'INSTRUCTOR')
  )
);

CREATE POLICY "Authenticated users can select from question_bank_options" 
ON public.question_bank_options 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

-- 4. Função para obter questões aleatórias (Re-inserção para garantir)
CREATE OR REPLACE FUNCTION public.get_random_bank_questions(
  p_count INTEGER,
  p_course_id UUID DEFAULT NULL,
  p_module_id UUID DEFAULT NULL,
  p_lesson_id UUID DEFAULT NULL,
  p_difficulty TEXT DEFAULT NULL
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
