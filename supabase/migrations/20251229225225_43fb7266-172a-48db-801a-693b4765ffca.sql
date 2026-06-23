-- Create table for blocked access logs
CREATE TABLE public.blocked_access_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reason TEXT NOT NULL,
  detected_extensions TEXT[] DEFAULT '{}',
  user_agent TEXT,
  ip_address TEXT,
  page_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.blocked_access_logs ENABLE ROW LEVEL SECURITY;

-- Admins can view all logs
CREATE POLICY "Admins can view blocked access logs"
ON public.blocked_access_logs
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Anyone can insert logs (even anonymous users)
CREATE POLICY "Anyone can insert blocked access logs"
ON public.blocked_access_logs
FOR INSERT
WITH CHECK (true);

-- Create index for faster queries
CREATE INDEX idx_blocked_access_logs_created_at ON public.blocked_access_logs(created_at DESC);
CREATE INDEX idx_blocked_access_logs_user_id ON public.blocked_access_logs(user_id);