
-- Fix password_reset_tickets RLS: the restrictive ALL admin policy blocks anon inserts
-- Drop all existing policies and recreate correctly

DROP POLICY IF EXISTS "Admins can manage reset tickets" ON public.password_reset_tickets;
DROP POLICY IF EXISTS "Anon can create reset tickets" ON public.password_reset_tickets;
DROP POLICY IF EXISTS "Anyone can create reset tickets" ON public.password_reset_tickets;

-- Permissive policy: anyone (including anonymous) can INSERT
CREATE POLICY "Anyone can create reset tickets"
ON public.password_reset_tickets
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Permissive policy: admins can do everything
CREATE POLICY "Admins can select reset tickets"
ON public.password_reset_tickets
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update reset tickets"
ON public.password_reset_tickets
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete reset tickets"
ON public.password_reset_tickets
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));
