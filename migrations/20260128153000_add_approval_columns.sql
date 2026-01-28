-- Migration to add approval status columns to profiles table

ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS approval_status TEXT DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS approved_by UUID,
ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- Update existing users to approved so they don't get locked out
UPDATE public.profiles 
SET approval_status = 'approved', approved_at = NOW() 
WHERE approval_status IS NULL OR approval_status = 'pending';

-- Ensure new users get 'pending' by default if not set
ALTER TABLE public.profiles 
ALTER COLUMN approval_status SET DEFAULT 'pending';
