DROP POLICY IF EXISTS "Patients can create own tokens" ON public.tokens;
CREATE POLICY "Patients and staff can create tokens"
ON public.tokens FOR INSERT TO authenticated
WITH CHECK (
  patient_id = auth.uid() 
  OR has_role(auth.uid(), 'receptionist'::app_role) 
  OR has_role(auth.uid(), 'admin'::app_role)
);