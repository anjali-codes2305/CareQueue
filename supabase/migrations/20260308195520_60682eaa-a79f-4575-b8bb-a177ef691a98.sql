-- Add remaining tables to realtime one by one (some already added)
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.priority_requests;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.patient_records;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.employees;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;

-- Update notifications INSERT policy to include receptionist
DROP POLICY IF EXISTS "Authenticated users can create notifications" ON public.notifications;
CREATE POLICY "Authenticated users can create notifications"
ON public.notifications FOR INSERT TO authenticated
WITH CHECK (
  user_id = auth.uid() 
  OR has_role(auth.uid(), 'nurse'::app_role) 
  OR has_role(auth.uid(), 'doctor'::app_role) 
  OR has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'receptionist'::app_role)
);

-- Allow receptionist to view tokens
DROP POLICY IF EXISTS "Staff can view all tokens" ON public.tokens;
CREATE POLICY "Staff can view all tokens"
ON public.tokens FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'nurse'::app_role) 
  OR has_role(auth.uid(), 'doctor'::app_role) 
  OR has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'receptionist'::app_role)
);

-- Allow receptionist to update tokens
DROP POLICY IF EXISTS "Staff can update tokens" ON public.tokens;
CREATE POLICY "Staff can update tokens"
ON public.tokens FOR UPDATE TO authenticated
USING (
  has_role(auth.uid(), 'nurse'::app_role) 
  OR has_role(auth.uid(), 'doctor'::app_role) 
  OR has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'receptionist'::app_role)
);