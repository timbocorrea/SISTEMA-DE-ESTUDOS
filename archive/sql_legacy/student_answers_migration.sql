-- StudySystem - Student Answers Migration
-- Tabela para armazenar respostas dissertativas dos alunos em blocos de texto

-- ------------------------------------------------------------
-- Table: student_answers
-- ------------------------------------------------------------
create table if not exists public.student_answers (
  user_id uuid not null references auth.users (id) on delete cascade,
  lesson_id uuid not null references public.lessons (id) on delete cascade,
  block_id text not null,
  answer_text text not null default '',
  updated_at timestamptz not null default now(),
  primary key (user_id, lesson_id, block_id)
);

-- Índices para performance
create index if not exists idx_student_answers_user_lesson
  on public.student_answers (user_id, lesson_id);

-- ------------------------------------------------------------
-- RLS (Row Level Security)
-- ------------------------------------------------------------
alter table public.student_answers enable row level security;

-- Aluno só vê suas próprias respostas
drop policy if exists student_answers_select_self on public.student_answers;
create policy student_answers_select_self on public.student_answers
  for select using (auth.uid() = user_id);

-- Aluno só insere suas próprias respostas
drop policy if exists student_answers_insert_self on public.student_answers;
create policy student_answers_insert_self on public.student_answers
  for insert with check (auth.uid() = user_id);

-- Aluno só atualiza suas próprias respostas
drop policy if exists student_answers_update_self on public.student_answers;
create policy student_answers_update_self on public.student_answers
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Instrutor pode ver todas as respostas (para futuro painel do professor)
drop policy if exists student_answers_select_instructor on public.student_answers;
create policy student_answers_select_instructor on public.student_answers
  for select using (public.is_instructor());
