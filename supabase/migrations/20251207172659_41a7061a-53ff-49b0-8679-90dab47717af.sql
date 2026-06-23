-- Add parent_id column to comments for reply system
ALTER TABLE public.comments 
ADD COLUMN parent_id uuid REFERENCES public.comments(id) ON DELETE CASCADE;

-- Create index for faster replies lookup
CREATE INDEX idx_comments_parent_id ON public.comments(parent_id);

-- Create comment_likes table
CREATE TABLE public.comment_likes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  comment_id uuid NOT NULL REFERENCES public.comments(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(comment_id, user_id)
);

-- Enable RLS on comment_likes
ALTER TABLE public.comment_likes ENABLE ROW LEVEL SECURITY;

-- Policies for comment_likes
CREATE POLICY "Authenticated users can view likes" 
ON public.comment_likes 
FOR SELECT 
TO authenticated
USING (true);

CREATE POLICY "Users can add likes" 
ON public.comment_likes 
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove their likes" 
ON public.comment_likes 
FOR DELETE 
TO authenticated
USING (auth.uid() = user_id);