-- Add content_type column to chapters for novel support
ALTER TABLE public.chapters ADD COLUMN IF NOT EXISTS content_type text DEFAULT 'images';
ALTER TABLE public.chapters ADD COLUMN IF NOT EXISTS content text;

-- Add check constraint for content_type (novel or images)
ALTER TABLE public.chapters ADD CONSTRAINT chapters_content_type_check 
  CHECK (content_type IN ('images', 'novel'));

-- Add type 'Novel' to titles if not exists (we'll handle this in code since it's an enum-like text field)