-- Migration: Add Gemini API Key to Profiles
-- Run this in Supabase SQL Editor if you want to support per-user API keys.

alter table public.profiles 
add column if not exists gemini_api_key text;

-- Opção: Permitir que o próprio usuário insira sua chave (UPDATE policy)
-- (Já existe uma policy de update para o próprio usuário no arquivo principal, então deve funcionar automaticamente)
