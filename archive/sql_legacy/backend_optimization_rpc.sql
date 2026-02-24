-- Otimização de Backend: RPCs para Segurança e Atomicidade
-- Transfere lógica crítica do Client (Frontend) para o Banco (Postgres)

-- 1. Função genérica para adicionar XP de forma segura
CREATE OR REPLACE FUNCTION public.add_secure_xp(
  p_user_id UUID,
  p_amount INTEGER,
  p_action_type TEXT,
  p_description TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_xp INTEGER;
  v_current_level INTEGER;
  v_new_level INTEGER;
BEGIN
  IF p_amount <= 0 THEN
    RETURN jsonb_build_object('success', false, 'message', 'XP amount must be positive');
  END IF;

  UPDATE public.profiles
  SET 
    xp_total = xp_total + p_amount,
    updated_at = NOW()
  WHERE id = p_user_id
  RETURNING xp_total, current_level INTO v_new_xp, v_current_level;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'User profile not found');
  END IF;

  v_new_level := 1 + FLOOR(v_new_xp / 1000);

  IF v_new_level > v_current_level THEN
    UPDATE public.profiles
    SET current_level = v_new_level
    WHERE id = p_user_id;
  END IF;

  INSERT INTO public.xp_history (user_id, amount, action_type, description, created_at)
  VALUES (p_user_id, p_amount, p_action_type, p_description, NOW());

  RETURN jsonb_build_object(
    'success', true, 
    'new_xp', v_new_xp, 
    'level_up', (v_new_level > v_current_level),
    'new_level', v_new_level
  );
END;
$$;


-- 2. Função Atômica para Atualizar Progresso e Completar Aula
CREATE OR REPLACE FUNCTION public.update_lesson_progress_secure(
  p_lesson_id UUID,
  p_watched_seconds INTEGER,
  p_is_completed BOOLEAN,
  p_last_block_id TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_was_completed BOOLEAN;
  v_lesson_duration INTEGER;
  v_video_progress INTEGER;
  v_lesson_title TEXT;
  v_xp_reward INTEGER := 150; -- Valor correspondente ao CourseService (Legacy)
  v_xp_result JSONB;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Not authenticated');
  END IF;

  -- Obter dados da aula
  SELECT duration_seconds, title INTO v_lesson_duration, v_lesson_title 
  FROM public.lessons WHERE id = p_lesson_id;
  
  IF NOT FOUND THEN
     RETURN jsonb_build_object('success', false, 'message', 'Lesson not found');
  END IF;

  -- Calcular progresso do vídeo
  v_lesson_duration := COALESCE(v_lesson_duration, 0);
  IF v_lesson_duration > 0 THEN
    v_video_progress := LEAST(100, (p_watched_seconds::FLOAT / v_lesson_duration::FLOAT * 100)::INTEGER);
  ELSE
    IF p_watched_seconds > 0 THEN v_video_progress := 100; ELSE v_video_progress := 0; END IF;
  END IF;

  -- Verificar estado anterior
  SELECT is_completed INTO v_was_completed
  FROM public.lesson_progress 
  WHERE user_id = v_user_id AND lesson_id = p_lesson_id;

  v_was_completed := COALESCE(v_was_completed, false);

  -- UPSERT no progresso
  INSERT INTO public.lesson_progress (
    user_id, lesson_id, watched_seconds, is_completed, last_accessed_block_id, video_progress, updated_at
  )
  VALUES (
    v_user_id, p_lesson_id, p_watched_seconds, p_is_completed, p_last_block_id, v_video_progress, NOW()
  )
  ON CONFLICT (user_id, lesson_id) 
  DO UPDATE SET 
    watched_seconds = EXCLUDED.watched_seconds,
    -- Se já estava completo, mantém completo mesmo que venha false (segurança), 
    -- exceto se quisermos permitir "descompletar" (geralmente não)
    is_completed = CASE WHEN public.lesson_progress.is_completed THEN true ELSE EXCLUDED.is_completed END,
    last_accessed_block_id = COALESCE(EXCLUDED.last_accessed_block_id, public.lesson_progress.last_accessed_block_id),
    video_progress = EXCLUDED.video_progress,
    updated_at = NOW();

  -- Se marcou como completo AGORA e NÃO estava antes -> DAR XP
  IF p_is_completed AND NOT v_was_completed THEN
    v_xp_result := public.add_secure_xp(
      v_user_id, 
      v_xp_reward, 
      'LESSON_COMPLETE', 
      'Conclusão da aula: ' || v_lesson_title
    );
    
    RETURN jsonb_build_object(
      'success', true, 
      'status', 'COMPLETED_NOW',
      'xp_awarded', v_xp_reward,
      'xp_data', v_xp_result
    );
  ELSE
    RETURN jsonb_build_object(
      'success', true, 
      'status', 'UPDATED',
      'xp_awarded', 0
    );
  END IF;

END;
$$;
