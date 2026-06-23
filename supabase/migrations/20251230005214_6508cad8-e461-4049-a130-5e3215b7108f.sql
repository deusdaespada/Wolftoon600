-- Create whitelisted_ips table
CREATE TABLE public.whitelisted_ips (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ip_address TEXT NOT NULL UNIQUE,
  description TEXT,
  added_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.whitelisted_ips ENABLE ROW LEVEL SECURITY;

-- Policies for whitelisted_ips
CREATE POLICY "Admins can manage whitelisted IPs"
ON public.whitelisted_ips
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can view whitelisted IPs"
ON public.whitelisted_ips
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create index for fast lookups
CREATE INDEX idx_whitelisted_ips_address ON public.whitelisted_ips(ip_address);

-- Enable realtime for whitelisted_ips
ALTER PUBLICATION supabase_realtime ADD TABLE public.whitelisted_ips;