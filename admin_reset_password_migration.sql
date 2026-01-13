-- Add is_temp_password column to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS is_temp_password boolean NOT NULL DEFAULT false;

-- Function to allow admins to reset passwords
-- This function MUST be SECURITY DEFINER to access auth.users
CREATE OR REPLACE FUNCTION public.admin_reset_password(
  target_user_id uuid,
  new_password text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth 
AS $$
BEGIN
  -- Check if the executor is an instructor/admin
  IF NOT public.is_instructor() THEN
    RAISE EXCEPTION 'Apenas administradores podem resetar senhas.';
  END IF;

  -- Update the user's password in auth.users
  -- We rely on pgcrypto's crypt function which is standard for Supabase auth
  UPDATE auth.users
  SET encrypted_password = crypt(new_password, gen_salt('bf'))
  WHERE id = target_user_id;

  -- Set the temporary password flag
  UPDATE public.profiles
  SET is_temp_password = true
  WHERE id = target_user_id;
END;
$$;

-- Function for the user to change their own password and clear the flag
CREATE OR REPLACE FUNCTION public.complete_password_reset(
  new_password text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  -- Update own password
  UPDATE auth.users
  SET encrypted_password = crypt(new_password, gen_salt('bf'))
  WHERE id = auth.uid();

  -- Clear the flag
  UPDATE public.profiles
  SET is_temp_password = false
  WHERE id = auth.uid();
END;
$$;
