-- Change chapter_number from integer to numeric to support decimal chapters (0, 0.1, 0.5, 1.5, etc)
ALTER TABLE public.chapters 
ALTER COLUMN chapter_number TYPE numeric(10,2) USING chapter_number::numeric(10,2);