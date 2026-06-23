ALTER TABLE public.chapters ADD COLUMN IF NOT EXISTS vip_unlock_at timestamp with time zone;

CREATE INDEX IF NOT EXISTS idx_chapters_vip_unlock_at ON public.chapters(vip_unlock_at) WHERE vip_unlock_at IS NOT NULL;

COMMENT ON COLUMN public.chapters.vip_unlock_at IS 'When set, the chapter automatically becomes non-VIP after this timestamp.';