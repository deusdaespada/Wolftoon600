-- Add admin role for lopesalveskaua3@gmail.com
INSERT INTO public.user_roles (user_id, role)
VALUES ('6ab5e046-377c-49c5-a3cb-ddbf9f923f91', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;