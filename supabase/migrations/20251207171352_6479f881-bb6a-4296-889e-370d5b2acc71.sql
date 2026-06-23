-- Fix 1: Restrict comments SELECT policy to authenticated users only
-- This prevents anonymous users from harvesting user_id data
DROP POLICY IF EXISTS "Anyone can view comments" ON public.comments;

CREATE POLICY "Authenticated users can view comments" 
ON public.comments 
FOR SELECT 
TO authenticated
USING (true);

-- Fix 2: Add INSERT policy for notifications - only admins can create notifications
CREATE POLICY "Admins can insert notifications" 
ON public.notifications 
FOR INSERT 
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));