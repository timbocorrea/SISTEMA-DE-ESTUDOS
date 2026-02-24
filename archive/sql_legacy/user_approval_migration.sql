-- ============================================================
-- USER APPROVAL & COURSE ASSIGNMENT SYSTEM
-- ============================================================
-- Esta migration adiciona sistema de aprovação de usuários e
-- controle granular de acesso a cursos por usuário.
-- Execute no SQL Editor do Supabase como role postgres.
-- ============================================================

-- ------------------------------------------------------------
-- 1. Adicionar colunas de aprovação na tabela profiles
-- ------------------------------------------------------------

-- Tipo ENUM para status de aprovação
DO $$ BEGIN
  CREATE TYPE approval_status_enum AS ENUM ('pending', 'approved', 'rejected');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Adicionar colunas à tabela profiles
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS approval_status approval_status_enum DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS approved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS rejection_reason text,
  ADD COLUMN IF NOT EXISTS last_session_id text;

-- Índice para buscar usuários pendentes rapidamente
CREATE INDEX IF NOT EXISTS idx_profiles_approval_status 
  ON public.profiles(approval_status);

-- ------------------------------------------------------------
-- 2. Atualizar usuários existentes para "approved"
-- ------------------------------------------------------------
-- IMPORTANTE: Todos os usuários existentes são automaticamente
-- aprovados para não quebrar o acesso atual.

UPDATE public.profiles 
SET approval_status = 'approved',
    approved_at = NOW()
WHERE approval_status IS NULL OR approval_status = 'pending';

-- ------------------------------------------------------------
-- 3. Criar tabela de atribuições de cursos por usuário
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.user_course_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  assigned_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  assigned_at timestamptz NOT NULL DEFAULT NOW(),
  
  -- Garantir que um usuário não tenha o mesmo curso atribuído múltiplas vezes
  UNIQUE(user_id, course_id)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_user_course_assignments_user_id 
  ON public.user_course_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_user_course_assignments_course_id 
  ON public.user_course_assignments(course_id);

-- ------------------------------------------------------------
-- 4. Atribuir todos os cursos para usuários já aprovados
-- ------------------------------------------------------------
-- IMPORTANTE: Para usuários existentes, criamos atribuições
-- automáticas de todos os cursos para manter o comportamento atual.

INSERT INTO public.user_course_assignments (user_id, course_id, assigned_by, assigned_at)
SELECT 
  p.id AS user_id,
  c.id AS course_id,
  p.id AS assigned_by, -- Auto-atribuição para usuários existentes
  NOW() AS assigned_at
FROM public.profiles p
CROSS JOIN public.courses c
WHERE p.approval_status = 'approved'
ON CONFLICT (user_id, course_id) DO NOTHING;

-- ------------------------------------------------------------
-- 5. RLS Policies para user_course_assignments
-- ------------------------------------------------------------

ALTER TABLE public.user_course_assignments ENABLE ROW LEVEL SECURITY;

-- Usuários podem ver apenas suas próprias atribuições
DROP POLICY IF EXISTS user_course_assignments_select_self ON public.user_course_assignments;
CREATE POLICY user_course_assignments_select_self 
  ON public.user_course_assignments
  FOR SELECT 
  USING (auth.uid() = user_id);

-- Instrutores podem ver todas as atribuições
DROP POLICY IF EXISTS user_course_assignments_select_instructor ON public.user_course_assignments;
CREATE POLICY user_course_assignments_select_instructor 
  ON public.user_course_assignments
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'INSTRUCTOR'
    )
  );

-- Instrutores podem criar atribuições
DROP POLICY IF EXISTS user_course_assignments_insert_instructor ON public.user_course_assignments;
CREATE POLICY user_course_assignments_insert_instructor 
  ON public.user_course_assignments
  FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'INSTRUCTOR'
    )
  );

-- Instrutores podem deletar atribuições
DROP POLICY IF EXISTS user_course_assignments_delete_instructor ON public.user_course_assignments;
CREATE POLICY user_course_assignments_delete_instructor 
  ON public.user_course_assignments
  FOR DELETE 
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'INSTRUCTOR'
    )
  );

-- ------------------------------------------------------------
-- 6. Atualizar trigger de criação de usuário
-- ------------------------------------------------------------
-- Novos usuários começam com status "pending"

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (
    id, 
    email, 
    name, 
    role, 
    xp_total, 
    current_level, 
    achievements, 
    approval_status,
    updated_at
  )
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'name', new.email),
    'STUDENT',
    0,
    1,
    '[]'::jsonb,
    'pending', -- NOVO: status pendente por padrão
    NOW()
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN new;
END;
$$;

-- ------------------------------------------------------------
-- 7. Função auxiliar para verificar se usuário está aprovado
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.is_user_approved(user_uuid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = user_uuid
      AND p.approval_status = 'approved'
  );
$$;

-- ------------------------------------------------------------
-- MIGRATION COMPLETA
-- ------------------------------------------------------------
-- ✅ Colunas de aprovação adicionadas à tabela profiles
-- ✅ Usuários existentes marcados como aprovados
-- ✅ Tabela user_course_assignments criada
-- ✅ Todos os cursos atribuídos aos usuários existentes
-- ✅ RLS policies configuradas
-- ✅ Trigger atualizado para novos usuários (pending)
-- ✅ Função auxiliar is_user_approved criada
