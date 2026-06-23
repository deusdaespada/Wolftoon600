-- Create VIP history table to track when VIP status is given/removed
CREATE TABLE public.vip_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    action TEXT NOT NULL CHECK (action IN ('added', 'removed')),
    performed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.vip_history ENABLE ROW LEVEL SECURITY;

-- Only admins can view and manage VIP history
CREATE POLICY "Admins can view VIP history"
ON public.vip_history
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert VIP history"
ON public.vip_history
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Create index for faster queries
CREATE INDEX idx_vip_history_user_id ON public.vip_history(user_id);
CREATE INDEX idx_vip_history_created_at ON public.vip_history(created_at DESC);