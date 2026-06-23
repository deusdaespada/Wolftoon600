-- Allow users to delete their own reading history
CREATE POLICY "Users can delete their own history"
ON public.reading_history
FOR DELETE
USING (auth.uid() = user_id);

-- Allow authenticated users to update vip_codes when redeeming (mark as used)
CREATE POLICY "Users can redeem VIP codes"
ON public.vip_codes
FOR UPDATE
TO authenticated
USING (is_active = true AND used_by IS NULL)
WITH CHECK (used_by = auth.uid() AND is_active = false);