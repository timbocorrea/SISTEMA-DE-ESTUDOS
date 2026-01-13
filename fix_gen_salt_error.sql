-- Enable pgcrypto extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pgcrypto SCHEMA public;

-- Re-create the function with 'extensions' added to search_path
-- We also schema-qualify gen_salt and crypt to be safe (public.gen_salt) 
-- assuming pgcrypto is in public (as per line 2). 
-- But to be robust against Supabase defaults where it might be in 'extensions', 
-- we add 'extensions' to search_path.

CREATE OR REPLACE FUNCTION public.admin_reset_password(
  target_user_id uuid,
  new_password text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
BEGIN
  -- Check if the executor is an instructor/admin
  IF NOT public.is_instructor() THEN
    RAISE EXCEPTION 'Apenas administradores podem resetar senhas.';
  END IF;

  -- Update the user's password in auth.users
  UPDATE auth.users
  SET encrypted_password = crypt(new_password, gen_salt('bf'))
  WHERE id = target_user_id;

  -- Set the temporary password flag
  UPDATE public.profiles
  SET is_temp_password = true
  WHERE id = target_user_id;
END;
$$;

-- Do the same for the completion function
CREATE OR REPLACE FUNCTION public.complete_password_reset(
  new_password text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
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
