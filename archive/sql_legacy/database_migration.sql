-- StudySystem - Setup (Supabase)
-- Execute no SQL Editor do Supabase como role postgres.

-- ------------------------------------------------------------
-- Extensions
-- ------------------------------------------------------------
create extension if not exists pgcrypto;

-- ------------------------------------------------------------
-- Tables
-- ------------------------------------------------------------

create table if not exists public.courses (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  created_at timestamptz not null default now()
);

create table if not exists public.modules (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses (id) on delete cascade,
  title text not null,
  position int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.lessons (
  id uuid primary key default gen_random_uuid(),
  module_id uuid not null references public.modules (id) on delete cascade,
  title text not null,
  content text,
  video_url text,
  audio_url text,
  image_url text,
  duration_seconds int not null default 0,
  position int not null default 0,
  created_at timestamptz not null default now()
);

-- (Compat) se a tabela jรก existir, garante que as colunas novas existam.
alter table public.lessons add column if not exists content text;
alter table public.lessons add column if not exists audio_url text;
alter table public.lessons add column if not exists image_url text;

create table if not exists public.lesson_resources (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.lessons (id) on delete cascade,
  title text not null,
  resource_type text not null check (resource_type in ('PDF', 'AUDIO', 'IMAGE', 'LINK', 'FILE')),
  url text not null,
  position int not null default 0,
  category text not null default 'Outros',
  created_at timestamptz not null default now()
);

create table if not exists public.lesson_progress (
  user_id uuid not null references auth.users (id) on delete cascade,
  lesson_id uuid not null references public.lessons (id) on delete cascade,
  watched_seconds int not null default 0,
  is_completed boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (user_id, lesson_id)
);

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  name text,
  role text not null default 'STUDENT' check (role in ('STUDENT', 'INSTRUCTOR')),
  xp_total int not null default 0,
  current_level int not null default 1,
  achievements jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- Trigger: cria um perfil automaticamente no signup
-- ------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, name, role, xp_total, current_level, achievements, updated_at)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'name', new.email),
    'STUDENT',
    0,
    1,
    '[]'::jsonb,
    now()
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- ------------------------------------------------------------
-- RLS (Row Level Security)
-- ------------------------------------------------------------

alter table public.courses enable row level security;
alter table public.modules enable row level security;
alter table public.lessons enable row level security;
alter table public.lesson_resources enable row level security;
alter table public.lesson_progress enable row level security;
alter table public.profiles enable row level security;

-- Conteúdo do curso: leitura liberada (anon ou authenticated)
drop policy if exists courses_read_all on public.courses;
drop policy if exists modules_read_all on public.modules;
drop policy if exists lessons_read_all on public.lessons;
create policy courses_read_all on public.courses for select using (true);
create policy modules_read_all on public.modules for select using (true);
create policy lessons_read_all on public.lessons for select using (true);

-- Materiais: leitura liberada (anon ou authenticated)
drop policy if exists lesson_resources_read_all on public.lesson_resources;
create policy lesson_resources_read_all on public.lesson_resources for select using (true);

-- Progresso: cada usuário só acessa o seu
drop policy if exists progress_select_self on public.lesson_progress;
drop policy if exists progress_insert_self on public.lesson_progress;
drop policy if exists progress_update_self on public.lesson_progress;
create policy progress_select_self on public.lesson_progress for select using (auth.uid() = user_id);
create policy progress_insert_self on public.lesson_progress for insert with check (auth.uid() = user_id);
create policy progress_update_self on public.lesson_progress
for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Perfil: cada usuário só acessa o seu
drop policy if exists profiles_select_self on public.profiles;
drop policy if exists profiles_insert_self on public.profiles;
drop policy if exists profiles_update_self on public.profiles;
create policy profiles_select_self on public.profiles for select using (auth.uid() = id);
create policy profiles_insert_self on public.profiles for insert with check (auth.uid() = id);
create policy profiles_update_self on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);

-- ------------------------------------------------------------
-- Admin (INSTRUCTOR)
-- ------------------------------------------------------------

create or replace function public.is_instructor()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'INSTRUCTOR'
  );
$$;

-- Courses: INSERT/UPDATE/DELETE apenas para instrutores
drop policy if exists courses_insert_instructors on public.courses;
drop policy if exists courses_update_instructors on public.courses;
drop policy if exists courses_delete_instructors on public.courses;
create policy courses_insert_instructors on public.courses for insert with check (public.is_instructor());
create policy courses_update_instructors on public.courses
for update using (public.is_instructor()) with check (public.is_instructor());
create policy courses_delete_instructors on public.courses for delete using (public.is_instructor());

-- Modules: INSERT/UPDATE/DELETE apenas para instrutores
drop policy if exists modules_insert_instructors on public.modules;
drop policy if exists modules_update_instructors on public.modules;
drop policy if exists modules_delete_instructors on public.modules;
create policy modules_insert_instructors on public.modules for insert with check (public.is_instructor());
create policy modules_update_instructors on public.modules
for update using (public.is_instructor()) with check (public.is_instructor());
create policy modules_delete_instructors on public.modules for delete using (public.is_instructor());

-- Lessons: INSERT/UPDATE/DELETE apenas para instrutores
drop policy if exists lessons_insert_instructors on public.lessons;
drop policy if exists lessons_update_instructors on public.lessons;
drop policy if exists lessons_delete_instructors on public.lessons;
create policy lessons_insert_instructors on public.lessons for insert with check (public.is_instructor());
create policy lessons_update_instructors on public.lessons
for update using (public.is_instructor()) with check (public.is_instructor());
create policy lessons_delete_instructors on public.lessons for delete using (public.is_instructor());

-- Lesson resources: INSERT/UPDATE/DELETE apenas para instrutores
drop policy if exists lesson_resources_insert_instructors on public.lesson_resources;
drop policy if exists lesson_resources_update_instructors on public.lesson_resources;
drop policy if exists lesson_resources_delete_instructors on public.lesson_resources;
create policy lesson_resources_insert_instructors on public.lesson_resources for insert with check (public.is_instructor());
create policy lesson_resources_update_instructors on public.lesson_resources
for update using (public.is_instructor()) with check (public.is_instructor());
create policy lesson_resources_delete_instructors on public.lesson_resources for delete using (public.is_instructor());

-- Profiles: instrutores podem listar/atualizar perfis (ex: promover usuário)
drop policy if exists profiles_select_instructors on public.profiles;
drop policy if exists profiles_update_instructors on public.profiles;
create policy profiles_select_instructors on public.profiles for select using (public.is_instructor());
create policy profiles_update_instructors on public.profiles
for update using (public.is_instructor()) with check (public.is_instructor());

-- ------------------------------------------------------------
-- Seed (opcional)
-- ------------------------------------------------------------
-- Para popular o banco rapidamente, descomente e execute.
--
-- insert into public.courses (title, description)
-- select 'Engenharia de Software Moderna', 'Curso demo para testes'
-- where not exists (
--   select 1 from public.courses where title = 'Engenharia de Software Moderna'
-- );
--
-- with c as (
--   select id from public.courses where title = 'Engenharia de Software Moderna' limit 1
-- )
-- insert into public.modules (course_id, title, position)
-- select c.id, 'Módulo 1', 1 from c
-- where not exists (
--   select 1 from public.modules m where m.course_id = c.id and m.position = 1
-- );
--
-- with m as (
--   select m.id
--   from public.modules m
--   join public.courses c on c.id = m.course_id
--   where c.title = 'Engenharia de Software Moderna' and m.position = 1
--   limit 1
-- )
-- insert into public.lessons (module_id, title, video_url, duration_seconds, position)
-- select m.id, 'Aula 1', 'https://www.w3schools.com/html/mov_bbb.mp4', 10, 1 from m
-- where not exists (
--   select 1 from public.lessons l where l.module_id = m.id and l.position = 1
-- );
--
-- with m as (
--   select m.id
--   from public.modules m
--   join public.courses c on c.id = m.course_id
--   where c.title = 'Engenharia de Software Moderna' and m.position = 1
--   limit 1
-- )
-- insert into public.lessons (module_id, title, video_url, duration_seconds, position)
-- select m.id, 'Aula 2', 'https://www.w3schools.com/html/mov_bbb.mp4', 10, 2 from m
-- where not exists (
--   select 1 from public.lessons l where l.module_id = m.id and l.position = 2
-- );

-- ------------------------------------------------------------
-- Course Enrollments (Sistema de Inscrição)
-- ------------------------------------------------------------

-- Tabela de inscrições em cursos
create table if not exists public.course_enrollments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  course_id uuid not null references public.courses (id) on delete cascade,
  enrolled_at timestamptz not null default now(),
  is_active boolean not null default true,
  unique (user_id, course_id)
);

-- Índices para performance
create index if not exists idx_course_enrollments_user_id on public.course_enrollments (user_id);
create index if not exists idx_course_enrollments_course_id on public.course_enrollments (course_id);
create index if not exists idx_course_enrollments_active on public.course_enrollments (is_active);

-- RLS: Usuário só vê suas próprias inscrições
alter table public.course_enrollments enable row level security;

drop policy if exists enrollments_select_self on public.course_enrollments;
create policy enrollments_select_self on public.course_enrollments
  for select using (auth.uid() = user_id);

drop policy if exists enrollments_insert_self on public.course_enrollments;
create policy enrollments_insert_self on public.course_enrollments
  for insert with check (auth.uid() = user_id);

drop policy if exists enrollments_delete_self on public.course_enrollments;
create policy enrollments_delete_self on public.course_enrollments
  for delete using (auth.uid() = user_id);

drop policy if exists enrollments_update_self on public.course_enrollments;
create policy enrollments_update_self on public.course_enrollments
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Instrutor pode ver todas as inscrições
drop policy if exists enrollments_view_instructor on public.course_enrollments;
create policy enrollments_view_instructor on public.course_enrollments
  for select using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'INSTRUCTOR'
    )
  );
