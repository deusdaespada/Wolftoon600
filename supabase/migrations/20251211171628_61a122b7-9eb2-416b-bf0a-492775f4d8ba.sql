-- Create comment_reports table for moderation
CREATE TABLE public.comment_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  comment_id UUID NOT NULL REFERENCES public.comments(id) ON DELETE CASCADE,
  reporter_id UUID NOT NULL,
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolved_by UUID,
  CONSTRAINT comment_reports_status_check CHECK (status IN ('pending', 'reviewed', 'dismissed'))
);

-- Enable RLS
ALTER TABLE public.comment_reports ENABLE ROW LEVEL SECURITY;

-- Users can create reports
CREATE POLICY "Users can create reports"
ON public.comment_reports
FOR INSERT
WITH CHECK (auth.uid() = reporter_id);

-- Users can view their own reports
CREATE POLICY "Users can view own reports"
ON public.comment_reports
FOR SELECT
USING (auth.uid() = reporter_id);

-- Admins can manage all reports
CREATE POLICY "Admins can manage reports"
ON public.comment_reports
FOR ALL
USING (has_role(auth.uid(), 'admin'));

-- Add is_vip column to chapters table
ALTER TABLE public.chapters ADD COLUMN is_vip BOOLEAN NOT NULL DEFAULT false;