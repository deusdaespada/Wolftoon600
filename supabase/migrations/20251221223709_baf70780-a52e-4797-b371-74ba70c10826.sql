-- Create function to sync missing profiles from auth.users
CREATE OR REPLACE FUNCTION public.sync_missing_profiles()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  synced_count integer := 0;
  auth_user RECORD;
BEGIN
  -- Loop through auth.users that don't have profiles
  FOR auth_user IN 
    SELECT au.id, au.raw_user_meta_data, au.created_at
    FROM auth.users au
    LEFT JOIN public.profiles p ON au.id = p.id
    WHERE p.id IS NULL
  LOOP
    -- Insert missing profile
    INSERT INTO public.profiles (id, username, created_at, updated_at)
    VALUES (
      auth_user.id, 
      auth_user.raw_user_meta_data->>'username',
      auth_user.created_at,
      now()
    );
    
    -- Insert user role if missing
    INSERT INTO public.user_roles (user_id, role)
    VALUES (auth_user.id, 'user')
    ON CONFLICT DO NOTHING;
    
    synced_count := synced_count + 1;
  END LOOP;
  
  RETURN synced_count;
END;
$$;

-- Run the sync immediately to fix existing users
SELECT public.sync_missing_profiles();