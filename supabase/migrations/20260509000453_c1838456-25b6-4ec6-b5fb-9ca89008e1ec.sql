
CREATE TABLE public.title_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title_id UUID NOT NULL REFERENCES public.titles(id) ON DELETE CASCADE,
  reporter_id UUID,
  report_type TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.title_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit title reports"
ON public.title_reports FOR INSERT
WITH CHECK (true);

CREATE POLICY "Admins can view title reports"
ON public.title_reports FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update title reports"
ON public.title_reports FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete title reports"
ON public.title_reports FOR DELETE
USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_title_reports_title_id ON public.title_reports(title_id);
CREATE INDEX idx_title_reports_status ON public.title_reports(status);

CREATE TRIGGER update_title_reports_updated_at
BEFORE UPDATE ON public.title_reports
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
