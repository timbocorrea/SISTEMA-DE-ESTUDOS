-- Allow users to update their own gamification data
DROP POLICY IF EXISTS "Users can update own profile gamification" ON public.profiles;

CREATE POLICY "Users can update own profile gamification" ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Ensure xp_history is accessible
ALTER TABLE public.xp_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can insert own xp_history" ON public.xp_history;

CREATE POLICY "Users can insert own xp_history" ON public.xp_history
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view own xp_history" ON public.xp_history;

CREATE POLICY "Users can view own xp_history" ON public.xp_history
  FOR SELECT
  USING (auth.uid() = user_id);
