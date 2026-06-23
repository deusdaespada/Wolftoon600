-- Create table for blocked IPs
CREATE TABLE public.blocked_ips (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ip_address TEXT NOT NULL,
  blocked_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  reason TEXT NOT NULL,
  strike_count INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create unique index on IP to prevent duplicates
CREATE UNIQUE INDEX idx_blocked_ips_ip ON public.blocked_ips(ip_address);

-- Create index for expiration lookups
CREATE INDEX idx_blocked_ips_expires_at ON public.blocked_ips(expires_at);

-- Enable RLS
ALTER TABLE public.blocked_ips ENABLE ROW LEVEL SECURITY;

-- Admins can view all blocked IPs
CREATE POLICY "Admins can view blocked IPs"
  ON public.blocked_ips
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Admins can manage blocked IPs
CREATE POLICY "Admins can manage blocked IPs"
  ON public.blocked_ips
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Anyone can insert blocked IPs (for edge function)
CREATE POLICY "Anyone can insert blocked IPs"
  ON public.blocked_ips
  FOR INSERT
  WITH CHECK (true);

-- Enable realtime for blocked_ips
ALTER PUBLICATION supabase_realtime ADD TABLE public.blocked_ips;