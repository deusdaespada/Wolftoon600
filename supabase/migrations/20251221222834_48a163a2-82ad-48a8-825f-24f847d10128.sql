-- Create banned_users table
CREATE TABLE public.banned_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  banned_by uuid,
  reason text NOT NULL,
  banned_at timestamp with time zone NOT NULL DEFAULT now(),
  expires_at timestamp with time zone,
  is_permanent boolean NOT NULL DEFAULT false,
  unbanned_at timestamp with time zone,
  unbanned_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create admin_actions table for audit history
CREATE TABLE public.admin_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL,
  action_type text NOT NULL,
  target_user_id uuid,
  target_resource_id text,
  details jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.banned_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_actions ENABLE ROW LEVEL SECURITY;

-- RLS policies for banned_users
CREATE POLICY "Admins can manage banned users"
ON public.banned_users
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can check if they are banned"
ON public.banned_users
FOR SELECT
USING (auth.uid() = user_id);

-- RLS policies for admin_actions
CREATE POLICY "Admins can view all admin actions"
ON public.admin_actions
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert admin actions"
ON public.admin_actions
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Enable realtime for profiles to monitor new users
ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;