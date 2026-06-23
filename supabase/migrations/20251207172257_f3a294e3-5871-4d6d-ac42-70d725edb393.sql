-- Add is_spoiler column to comments table
ALTER TABLE public.comments 
ADD COLUMN is_spoiler boolean NOT NULL DEFAULT false;