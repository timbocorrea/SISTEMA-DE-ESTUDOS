-- Adiciona colunas para suporte ao Questionário Centralizado (Pool Mode)
-- Para suportar o modo "Pool" (questões aleatórias do banco)
ALTER TABLE quizzes 
ADD COLUMN IF NOT EXISTS pool_difficulty TEXT DEFAULT NULL CHECK (pool_difficulty IN ('easy', 'medium', 'hard')),
ADD COLUMN IF NOT EXISTS questions_count INTEGER DEFAULT NULL;

COMMENT ON COLUMN quizzes.pool_difficulty IS 'Dificuldade preferencial para questões sorteadas do banco (opcional)';
COMMENT ON COLUMN quizzes.questions_count IS 'Quantidade de questões a serem sorteadas do banco quando em Pool Mode';
