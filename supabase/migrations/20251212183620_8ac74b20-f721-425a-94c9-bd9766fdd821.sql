-- Add expires_at column to user_roles for temporary VIP
ALTER TABLE public.user_roles 
ADD COLUMN expires_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Add expires_at to vip_history for tracking
ALTER TABLE public.vip_history 
ADD COLUMN expires_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Create index for expiration queries
CREATE INDEX idx_user_roles_expires_at ON public.user_roles(expires_at) WHERE expires_at IS NOT NULL;

-- Enable pg_cron and pg_net extensions for automatic expiration
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;