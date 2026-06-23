-- Enable realtime for blocked_access_logs table
ALTER TABLE public.blocked_access_logs REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.blocked_access_logs;