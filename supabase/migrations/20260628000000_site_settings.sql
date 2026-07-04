-- Create site_settings table for key-value configuration
CREATE TABLE IF NOT EXISTS public.site_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

-- Anyone can read settings (needed for maintenance check on page load)
CREATE POLICY "site_settings_public_read"
  ON public.site_settings FOR SELECT
  USING (true);

-- Only admins can modify settings
CREATE POLICY "site_settings_admin_write"
  ON public.site_settings FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Seed default maintenance settings
INSERT INTO public.site_settings (key, value) VALUES
  ('maintenance_enabled', 'false'),
  ('maintenance_reason', 'Manutenção programada do sistema.'),
  ('maintenance_activated_at', ''),
  ('maintenance_show_countdown', 'false'),
  ('maintenance_estimated_return', '')
ON CONFLICT (key) DO NOTHING;
