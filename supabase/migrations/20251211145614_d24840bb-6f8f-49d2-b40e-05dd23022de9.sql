-- Drop the existing type check constraint
ALTER TABLE public.titles DROP CONSTRAINT titles_type_check;

-- Add updated constraint that includes 'Novel'
ALTER TABLE public.titles ADD CONSTRAINT titles_type_check 
CHECK (type = ANY (ARRAY['Manhwa'::text, 'Manhua'::text, 'Mangá'::text, 'Novel'::text]));