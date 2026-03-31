
-- ============================================================
-- FIX: Convert ALL restrictive RLS policies to PERMISSIVE
-- Restrictive-only = default deny. We need PERMISSIVE policies.
-- ============================================================

-- ==================== consultation_metrics ====================
DROP POLICY IF EXISTS "Admins can view all metrics" ON public.consultation_metrics;
DROP POLICY IF EXISTS "Doctors can insert metrics" ON public.consultation_metrics;
DROP POLICY IF EXISTS "Doctors can view own metrics" ON public.consultation_metrics;

CREATE POLICY "Admins can view all metrics" ON public.consultation_metrics FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Doctors can insert metrics" ON public.consultation_metrics FOR INSERT TO authenticated WITH CHECK (doctor_id = auth.uid());
CREATE POLICY "Doctors can view own metrics" ON public.consultation_metrics FOR SELECT TO authenticated USING (doctor_id = auth.uid());

-- ==================== departments ====================
DROP POLICY IF EXISTS "Admins can manage departments" ON public.departments;
DROP POLICY IF EXISTS "Anyone can view departments" ON public.departments;

CREATE POLICY "Admins can manage departments" ON public.departments FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Anyone can view departments" ON public.departments FOR SELECT TO authenticated USING (true);

-- ==================== employees ====================
DROP POLICY IF EXISTS "Admins can manage employees" ON public.employees;
DROP POLICY IF EXISTS "Employees can update own availability" ON public.employees;
DROP POLICY IF EXISTS "Staff can view employees" ON public.employees;

CREATE POLICY "Admins can manage employees" ON public.employees FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Employees can update own availability" ON public.employees FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Staff can view employees" ON public.employees FOR SELECT TO authenticated USING (has_role(auth.uid(), 'receptionist'::app_role) OR has_role(auth.uid(), 'nurse'::app_role) OR has_role(auth.uid(), 'doctor'::app_role));

-- ==================== notifications ====================
DROP POLICY IF EXISTS "Authenticated users can create notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;

CREATE POLICY "Users can view own notifications" ON public.notifications FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can update own notifications" ON public.notifications FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Staff can create notifications" ON public.notifications FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() OR has_role(auth.uid(), 'nurse'::app_role) OR has_role(auth.uid(), 'doctor'::app_role) OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'receptionist'::app_role));

-- ==================== password_reset_tickets ====================
DROP POLICY IF EXISTS "Anyone can create reset tickets" ON public.password_reset_tickets;
DROP POLICY IF EXISTS "Admins can select reset tickets" ON public.password_reset_tickets;
DROP POLICY IF EXISTS "Admins can update reset tickets" ON public.password_reset_tickets;
DROP POLICY IF EXISTS "Admins can delete reset tickets" ON public.password_reset_tickets;

CREATE POLICY "Anyone can create reset tickets" ON public.password_reset_tickets FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Admins can select reset tickets" ON public.password_reset_tickets FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can update reset tickets" ON public.password_reset_tickets FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can delete reset tickets" ON public.password_reset_tickets FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- ==================== patient_records ====================
DROP POLICY IF EXISTS "Doctors can view assigned records" ON public.patient_records;
DROP POLICY IF EXISTS "Receptionists and admins manage patient records" ON public.patient_records;

CREATE POLICY "Receptionists and admins manage patient records" ON public.patient_records FOR ALL TO authenticated USING (has_role(auth.uid(), 'receptionist'::app_role) OR has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'receptionist'::app_role) OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Doctors can view assigned records" ON public.patient_records FOR SELECT TO authenticated USING (doctor_id = auth.uid());
CREATE POLICY "Nurses can view patient records" ON public.patient_records FOR SELECT TO authenticated USING (has_role(auth.uid(), 'nurse'::app_role));

-- ==================== priority_requests ====================
DROP POLICY IF EXISTS "Nurses can update requests" ON public.priority_requests;
DROP POLICY IF EXISTS "Nurses can view all requests" ON public.priority_requests;
DROP POLICY IF EXISTS "Patients can create requests" ON public.priority_requests;
DROP POLICY IF EXISTS "Patients can view own requests" ON public.priority_requests;

CREATE POLICY "Patients can create requests" ON public.priority_requests FOR INSERT TO authenticated WITH CHECK (patient_id = auth.uid());
CREATE POLICY "Patients can view own requests" ON public.priority_requests FOR SELECT TO authenticated USING (patient_id = auth.uid());
CREATE POLICY "Nurses can view all requests" ON public.priority_requests FOR SELECT TO authenticated USING (has_role(auth.uid(), 'nurse'::app_role) OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Nurses can update requests" ON public.priority_requests FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'nurse'::app_role));

-- ==================== profiles ====================
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;

CREATE POLICY "Users can view all profiles" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- ==================== tokens ====================
DROP POLICY IF EXISTS "Patients and staff can create tokens" ON public.tokens;
DROP POLICY IF EXISTS "Patients can update own tokens" ON public.tokens;
DROP POLICY IF EXISTS "Patients can view own tokens" ON public.tokens;
DROP POLICY IF EXISTS "Staff can update tokens" ON public.tokens;
DROP POLICY IF EXISTS "Staff can view all tokens" ON public.tokens;

CREATE POLICY "Staff can view all tokens" ON public.tokens FOR SELECT TO authenticated USING (has_role(auth.uid(), 'nurse'::app_role) OR has_role(auth.uid(), 'doctor'::app_role) OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'receptionist'::app_role));
CREATE POLICY "Patients can view own tokens" ON public.tokens FOR SELECT TO authenticated USING (patient_id = auth.uid());
CREATE POLICY "Patients and staff can create tokens" ON public.tokens FOR INSERT TO authenticated WITH CHECK (patient_id = auth.uid() OR has_role(auth.uid(), 'receptionist'::app_role) OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Staff can update tokens" ON public.tokens FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'nurse'::app_role) OR has_role(auth.uid(), 'doctor'::app_role) OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'receptionist'::app_role));
CREATE POLICY "Patients can update own tokens" ON public.tokens FOR UPDATE TO authenticated USING (patient_id = auth.uid());

-- ==================== user_roles ====================
DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can insert own role on signup" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;

CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all roles" ON public.user_roles FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users can insert own role on signup" ON public.user_roles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
