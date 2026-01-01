-- Create xp_history table
CREATE TABLE IF NOT EXISTS public.xp_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) NOT NULL,
  amount INTEGER NOT NULL,
  action_type TEXT NOT NULL, -- e.g., 'LESSON_COMPLETE', 'QUIZ_PASS', 'MANUAL_ADJUSTMENT'
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Enable RLS
ALTER TABLE public.xp_history ENABLE ROW LEVEL SECURITY;

-- Policies
-- Admin can view all
CREATE POLICY "Admins can view all xp_history" ON public.xp_history
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('INSTRUCTOR', 'ADMIN')
    )
  );

-- Admin can insert (via backend logic mainly, but robust to allow)
CREATE POLICY "Admins can insert xp_history" ON public.xp_history
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('INSTRUCTOR', 'ADMIN')
    )
  );

-- Users can view their own history
CREATE POLICY "Users can view own xp_history" ON public.xp_history
  FOR SELECT
  USING (auth.uid() = user_id);

-- Storage permission for authenticated users (if needed for logs triggered by user actions via secure RPCs)
-- Ideally, insertions happen via Postgres Functions or Service Role, but if client triggers via Repository:
CREATE POLICY "Users can insert own xp_history" ON public.xp_history
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);
