
-- Add banner to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS banner_url text;

-- USER XP
CREATE TABLE IF NOT EXISTS public.user_xp (
  user_id uuid PRIMARY KEY,
  total_xp integer NOT NULL DEFAULT 0,
  level integer NOT NULL DEFAULT 1,
  xp_in_level integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.user_xp TO anon, authenticated;
GRANT INSERT, UPDATE ON public.user_xp TO authenticated;
GRANT ALL ON public.user_xp TO service_role;
ALTER TABLE public.user_xp ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view xp" ON public.user_xp;
CREATE POLICY "Anyone can view xp" ON public.user_xp FOR SELECT USING (true);
DROP POLICY IF EXISTS "Users insert own xp" ON public.user_xp;
CREATE POLICY "Users insert own xp" ON public.user_xp FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users update own xp" ON public.user_xp;
CREATE POLICY "Users update own xp" ON public.user_xp FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- DAILY CHECKINS
CREATE TABLE IF NOT EXISTS public.daily_checkins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  checkin_date date NOT NULL DEFAULT (now() AT TIME ZONE 'UTC')::date,
  streak integer NOT NULL DEFAULT 1,
  xp_awarded integer NOT NULL DEFAULT 10,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, checkin_date)
);
GRANT SELECT, INSERT ON public.daily_checkins TO authenticated;
GRANT ALL ON public.daily_checkins TO service_role;
ALTER TABLE public.daily_checkins ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users view own checkins" ON public.daily_checkins;
CREATE POLICY "Users view own checkins" ON public.daily_checkins FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users insert own checkins" ON public.daily_checkins;
CREATE POLICY "Users insert own checkins" ON public.daily_checkins FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Level calculation: each level needs level*100 xp (lvl1->100, lvl2->200,... cumulative)
CREATE OR REPLACE FUNCTION public.calculate_level(_total_xp integer)
RETURNS TABLE(lvl integer, xp_in_lvl integer, xp_needed integer)
LANGUAGE plpgsql IMMUTABLE
AS $$
DECLARE
  l integer := 1;
  remaining integer := COALESCE(_total_xp, 0);
  need integer;
BEGIN
  LOOP
    need := l * 100;
    IF remaining < need THEN
      EXIT;
    END IF;
    remaining := remaining - need;
    l := l + 1;
  END LOOP;
  RETURN QUERY SELECT l, remaining, need;
END;
$$;

-- Award XP function
CREATE OR REPLACE FUNCTION public.award_xp(_user_id uuid, _amount integer)
RETURNS TABLE(total_xp integer, level integer, xp_in_level integer, xp_needed integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_total integer;
  calc record;
BEGIN
  INSERT INTO public.user_xp (user_id, total_xp, level, xp_in_level)
  VALUES (_user_id, GREATEST(_amount, 0), 1, 0)
  ON CONFLICT (user_id) DO UPDATE
    SET total_xp = public.user_xp.total_xp + GREATEST(_amount, 0),
        updated_at = now()
  RETURNING public.user_xp.total_xp INTO new_total;

  SELECT * INTO calc FROM public.calculate_level(new_total);

  UPDATE public.user_xp
    SET level = calc.lvl, xp_in_level = calc.xp_in_lvl, updated_at = now()
    WHERE user_id = _user_id;

  RETURN QUERY SELECT new_total, calc.lvl, calc.xp_in_lvl, calc.xp_needed;
END;
$$;

-- Daily check-in
CREATE OR REPLACE FUNCTION public.daily_checkin(_user_id uuid)
RETURNS TABLE(streak integer, xp_awarded integer, already_checked boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  today date := (now() AT TIME ZONE 'UTC')::date;
  yesterday date := today - 1;
  last_checkin record;
  new_streak integer := 1;
  bonus integer := 10;
BEGIN
  SELECT * INTO last_checkin FROM public.daily_checkins
    WHERE user_id = _user_id ORDER BY checkin_date DESC LIMIT 1;

  IF last_checkin.checkin_date = today THEN
    RETURN QUERY SELECT last_checkin.streak, 0, true;
    RETURN;
  END IF;

  IF last_checkin.checkin_date = yesterday THEN
    new_streak := last_checkin.streak + 1;
  END IF;

  -- bonus scaling
  bonus := 10 + LEAST(new_streak * 2, 50);

  INSERT INTO public.daily_checkins (user_id, checkin_date, streak, xp_awarded)
  VALUES (_user_id, today, new_streak, bonus);

  PERFORM public.award_xp(_user_id, bonus);

  RETURN QUERY SELECT new_streak, bonus, false;
END;
$$;

GRANT EXECUTE ON FUNCTION public.award_xp(uuid, integer) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.daily_checkin(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.calculate_level(integer) TO authenticated, anon, service_role;
