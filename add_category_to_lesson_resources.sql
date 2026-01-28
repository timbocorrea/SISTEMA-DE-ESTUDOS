-- Migration to add 'category' column to lesson_resources table
-- Needed for the "Gerenciar Materiais" feature

alter table public.lesson_resources 
add column if not exists category text not null default 'Outros';
