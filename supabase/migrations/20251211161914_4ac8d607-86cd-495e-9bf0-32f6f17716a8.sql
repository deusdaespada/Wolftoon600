-- Add policy to allow authenticated users to view basic profile info of all users
-- This is needed for displaying comment authors, user mentions, etc.
CREATE POLICY "Authenticated users can view all profiles" 
ON public.profiles 
FOR SELECT 
TO authenticated
USING (true);