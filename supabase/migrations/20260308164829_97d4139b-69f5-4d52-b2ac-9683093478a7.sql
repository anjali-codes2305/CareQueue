
-- Fix permissive notifications INSERT policy
DROP POLICY "System can create notifications" ON public.notifications;
CREATE POLICY "Authenticated users can create notifications" ON public.notifications FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() OR public.has_role(auth.uid(), 'nurse') OR public.has_role(auth.uid(), 'doctor') OR public.has_role(auth.uid(), 'admin'));
