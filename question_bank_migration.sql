-- ============================================================
-- MIGRAÇÃO: Banco de Questões Centralizado (Questionário Admin)
-- Versão: 1.0
-- Data: 2026-01-03
-- ============================================================

-- Tabela: question_bank
-- Armazena questões globais que podem ser vinculadas a níveis hierárquicos
CREATE TABLE IF NOT EXISTS question_bank (
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

-- Índices para navegação hierárquica e filtros
CREATE INDEX IF NOT EXISTS idx_question_bank_course ON question_bank(course_id);
CREATE INDEX IF NOT EXISTS idx_question_bank_module ON question_bank(module_id);
CREATE INDEX IF NOT EXISTS idx_question_bank_lesson ON question_bank(lesson_id);
CREATE INDEX IF NOT EXISTS idx_question_bank_difficulty ON question_bank(difficulty);

-- Tabela: question_bank_options
-- Armazena opções de resposta para as questões do banco
CREATE TABLE IF NOT EXISTS question_bank_options (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  question_id UUID NOT NULL REFERENCES question_bank(id) ON DELETE CASCADE,
  option_text TEXT NOT NULL,
  is_correct BOOLEAN DEFAULT FALSE,
  position INTEGER NOT NULL CHECK (position >= 0),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índice para busca por question_id
CREATE INDEX IF NOT EXISTS idx_bank_options_question_id ON question_bank_options(question_id);

-- Trigger para atualização de timestamp
CREATE TRIGGER trigger_update_question_bank_timestamp
BEFORE UPDATE ON question_bank
FOR EACH ROW
EXECUTE FUNCTION update_quiz_updated_at(); -- Reutilizando função existente se houver, ou criando abaixo

-- Garante que a função existe
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Caso a anterior falhe, usa essa:
DROP TRIGGER IF EXISTS trigger_update_question_bank_timestamp ON question_bank;
CREATE TRIGGER trigger_update_question_bank_timestamp
BEFORE UPDATE ON question_bank
FOR EACH ROW
EXECUTE FUNCTION update_timestamp();

-- Função: Obter questões aleatórias do banco com filtros
CREATE OR REPLACE FUNCTION get_random_bank_questions(
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

COMMENT ON TABLE question_bank IS 'Banco de questões globais organizadas por curso/módulo/aula';
COMMENT ON COLUMN question_bank.difficulty IS 'Nível de dificuldade: easy, medium, hard';
COMMENT ON COLUMN question_bank.image_url IS 'URL opcional de imagem para ilustrar a questão';
