-- Add duration_days column to vip_codes table to specify how long VIP lasts when code is redeemed
ALTER TABLE public.vip_codes 
ADD COLUMN IF NOT EXISTS duration_days integer DEFAULT NULL;

-- Add comment explaining the column
COMMENT ON COLUMN public.vip_codes.duration_days IS 'Number of days the VIP status will last when this code is redeemed. NULL means permanent VIP.';