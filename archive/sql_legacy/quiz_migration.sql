-- ============================================================
-- MIGRAÇÃO: Sistema de Questionários para Validação de Conquistas
-- Versão: 1.0
-- Data: 2025-12-27
-- ============================================================

-- Tabela: quizzes
-- Armazena questionários associados a aulas
CREATE TABLE IF NOT EXISTS quizzes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lesson_id UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  passing_score INTEGER DEFAULT 80 CHECK (passing_score BETWEEN 0 AND 100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(lesson_id)
);

-- Índice para busca rápida por lesson_id
CREATE INDEX IF NOT EXISTS idx_quizzes_lesson_id ON quizzes(lesson_id);

-- ============================================================

-- Tabela: quiz_questions
-- Armazena perguntas de cada questionário
CREATE TABLE IF NOT EXISTS quiz_questions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  quiz_id UUID NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  question_type TEXT DEFAULT 'multiple_choice' CHECK (question_type IN ('multiple_choice', 'true_false')),
  position INTEGER NOT NULL CHECK (position >= 0),
  points INTEGER DEFAULT 1 CHECK (points > 0),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índice para busca por quiz_id
CREATE INDEX IF NOT EXISTS idx_quiz_questions_quiz_id ON quiz_questions(quiz_id);

-- Índice composto para ordenação
CREATE INDEX IF NOT EXISTS idx_quiz_questions_quiz_position ON quiz_questions(quiz_id, position);

-- ============================================================

-- Tabela: quiz_options
-- Armazena opções de resposta para cada pergunta
CREATE TABLE IF NOT EXISTS quiz_options (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  question_id UUID NOT NULL REFERENCES quiz_questions(id) ON DELETE CASCADE,
  option_text TEXT NOT NULL,
  is_correct BOOLEAN DEFAULT FALSE,
  position INTEGER NOT NULL CHECK (position >= 0),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índice para busca por question_id
CREATE INDEX IF NOT EXISTS idx_quiz_options_question_id ON quiz_options(question_id);

-- Índice composto para ordenação
CREATE INDEX IF NOT EXISTS idx_quiz_options_question_position ON quiz_options(question_id, position);

-- ============================================================

-- Tabela: quiz_attempts
-- Armazena tentativas de usuários em questionários
CREATE TABLE IF NOT EXISTS quiz_attempts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  quiz_id UUID NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  score NUMERIC(5,2) NOT NULL CHECK (score BETWEEN 0 AND 100),
  passed BOOLEAN NOT NULL,
  answers JSONB NOT NULL, -- Formato: { "questionId": "selectedOptionId" }
  attempt_number INTEGER DEFAULT 1 CHECK (attempt_number > 0),
  completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índice para busca por user_id e quiz_id
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_user_quiz ON quiz_attempts(user_id, quiz_id);

-- Índice para busca das últimas tentativas
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_completed ON quiz_attempts(user_id, quiz_id, completed_at DESC);

-- ============================================================

-- Função: Atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_quiz_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: Atualizar updated_at na tabela quizzes
CREATE TRIGGER trigger_update_quiz_timestamp
BEFORE UPDATE ON quizzes
FOR EACH ROW
EXECUTE FUNCTION update_quiz_updated_at();

-- ============================================================

-- Função: Incrementar attempt_number automaticamente
CREATE OR REPLACE FUNCTION set_attempt_number()
RETURNS TRIGGER AS $$
BEGIN
  -- Conta tentativas anteriores para este usuário/quiz
  SELECT COALESCE(MAX(attempt_number), 0) + 1
  INTO NEW.attempt_number
  FROM quiz_attempts
  WHERE user_id = NEW.user_id AND quiz_id = NEW.quiz_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: Definir attempt_number antes de inserir
CREATE TRIGGER trigger_set_attempt_number
BEFORE INSERT ON quiz_attempts
FOR EACH ROW
EXECUTE FUNCTION set_attempt_number();

-- ============================================================

-- Comentários nas tabelas para documentação
COMMENT ON TABLE quizzes IS 'Questionários associados a aulas para validação de aprendizado';
COMMENT ON TABLE quiz_questions IS 'Perguntas de questionários com tipo e pontuação';
COMMENT ON TABLE quiz_options IS 'Opções de resposta para perguntas de questionários';
COMMENT ON TABLE quiz_attempts IS 'Tentativas de usuários em questionários com score e aprovação';

COMMENT ON COLUMN quizzes.passing_score IS 'Porcentagem mínima para aprovação (padrão: 80%)';
COMMENT ON COLUMN quiz_questions.question_type IS 'Tipo de pergunta: multiple_choice ou true_false';
COMMENT ON COLUMN quiz_questions.points IS 'Peso da questão no cálculo do score';
COMMENT ON COLUMN quiz_options.is_correct IS 'Indica se esta opção é a resposta correta';
COMMENT ON COLUMN quiz_attempts.answers IS 'Respostas do usuário em formato JSON';
COMMENT ON COLUMN quiz_attempts.passed IS 'Se o usuário atingiu passing_score ou superior';

-- ============================================================
-- FIM DA MIGRAÇÃO
-- ============================================================
