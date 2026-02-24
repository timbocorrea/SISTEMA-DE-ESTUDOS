-- ============================================================
-- MIGRAÇÃO: Segurança do Quiz (RPC submit_quiz_attempt)
-- Data: 2026-01-01
-- ============================================================

-- Função RPC para submeter tentativa de quiz com validação no servidor
CREATE OR REPLACE FUNCTION submit_quiz_attempt(
  p_quiz_id UUID,
  p_answers JSONB -- { "questionId": "optionId" }
)
RETURNS JSONB -- Retorna o registro da tentativa criado
LANGUAGE plpgsql
SECURITY DEFINER -- Roda com permissões do criador (admin) para acessar gabarito se necessário
AS $$
DECLARE
  v_user_id UUID;
  v_quiz_exists BOOLEAN;
  v_passing_score NUMERIC;
  v_total_points INTEGER := 0;
  v_user_points INTEGER := 0;
  v_score NUMERIC(5,2);
  v_passed BOOLEAN;
  v_attempt_id UUID;
  v_question RECORD;
  v_option_id UUID;
  v_is_correct BOOLEAN;
  v_result JSONB;
BEGIN
  -- 1. Identificar usuário logado
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado';
  END IF;

  -- 2. Verificar se quiz existe e pegar passing_score
  SELECT EXISTS(SELECT 1 FROM quizzes WHERE id = p_quiz_id), passing_score
  INTO v_quiz_exists, v_passing_score
  FROM quizzes
  WHERE id = p_quiz_id;

  IF NOT v_quiz_exists THEN
    RAISE EXCEPTION 'Quiz não encontrado';
  END IF;

  -- 3. Calcular nota
  -- Loop pelas questões do quiz
  FOR v_question IN 
    SELECT id, points 
    FROM quiz_questions 
    WHERE quiz_id = p_quiz_id
  LOOP
    v_total_points := v_total_points + v_question.points;
    
    -- Verificar resposta do usuário para esta questão
    -- p_answers é um objeto JSON { "question_id": "option_id" }
    IF p_answers ? v_question.id::TEXT THEN
      v_option_id := (p_answers ->> v_question.id::TEXT)::UUID;
      
      -- Verificar se a opção escolhida é correta
      SELECT is_correct INTO v_is_correct
      FROM quiz_options
      WHERE id = v_option_id AND question_id = v_question.id;
      
      IF v_is_correct THEN
        v_user_points := v_user_points + v_question.points;
      END IF;
    END IF;
  END LOOP;

  -- Evitar divisão por zero
  IF v_total_points = 0 THEN
    v_score := 0;
  ELSE
    v_score := (v_user_points::NUMERIC / v_total_points::NUMERIC) * 100.0;
  END IF;

  v_passed := v_score >= v_passing_score;

  -- 4. Inserir tentativa
  INSERT INTO quiz_attempts (
    user_id,
    quiz_id,
    score,
    passed,
    answers,
    completed_at
  ) VALUES (
    v_user_id,
    p_quiz_id,
    v_score,
    v_passed,
    p_answers,
    NOW()
  )
  RETURNING to_jsonb(quiz_attempts.*) INTO v_result;

  RETURN v_result;
END;
$$;

-- Comentário
COMMENT ON FUNCTION submit_quiz_attempt IS 'Submete respostas de quiz, calcula nota no servidor e salva tentativa.';
