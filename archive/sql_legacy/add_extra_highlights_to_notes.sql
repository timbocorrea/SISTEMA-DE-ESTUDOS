-- Migration: Add support for multi-highlight notes
-- Adds a JSONB column to store metadata for merged highlights.

ALTER TABLE public.lesson_notes 
ADD COLUMN IF NOT EXISTS extra_highlights JSONB DEFAULT '[]'::jsonb;

-- Update RLS if needed, although usually ADD COLUMN doesn't require new policies
-- if they use SELECT * or ALL.
