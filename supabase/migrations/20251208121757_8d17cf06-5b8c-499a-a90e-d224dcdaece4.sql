-- This will grant admin role to both users once they exist
-- Run this AFTER creating the users in the Users panel

INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::app_role 
FROM auth.users 
WHERE email IN ('kipagiorgi411@gmail.com', '23202185@ibsu.edu.ge')
ON CONFLICT (user_id, role) DO NOTHING;