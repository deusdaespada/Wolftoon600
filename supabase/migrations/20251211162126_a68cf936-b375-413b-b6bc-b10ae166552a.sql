-- Remove the direct UPDATE policy on vip_codes since redemption is now done via edge function
-- This prevents trial-and-error attacks to discover valid codes
DROP POLICY IF EXISTS "Users can redeem VIP codes" ON public.vip_codes;

-- Update comments policy to require authentication properly
-- Drop the existing overly permissive policy
DROP POLICY IF EXISTS "Authenticated users can view comments" ON public.comments;

-- Create a proper policy that requires authentication
CREATE POLICY "Authenticated users can view comments"
ON public.comments
FOR SELECT
TO authenticated
USING (true);