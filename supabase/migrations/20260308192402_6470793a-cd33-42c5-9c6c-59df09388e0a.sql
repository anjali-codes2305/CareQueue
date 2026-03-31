
-- Employees table (staff added by admin)
CREATE TABLE public.employees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  emp_id text NOT NULL UNIQUE,
  full_name text NOT NULL,
  designation text NOT NULL,
  department_id uuid REFERENCES public.departments(id),
  email text NOT NULL,
  phone text,
  is_available boolean NOT NULL DEFAULT true,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage employees" ON public.employees
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Staff can view employees" ON public.employees
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'receptionist') OR
    public.has_role(auth.uid(), 'nurse') OR
    public.has_role(auth.uid(), 'doctor')
  );

CREATE POLICY "Employees can update own availability" ON public.employees
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Patient records table (receptionist-onboarded patients)
CREATE TABLE public.patient_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_name text NOT NULL,
  phone text NOT NULL,
  purpose text NOT NULL,
  appointment_date date NOT NULL,
  doctor_id uuid NOT NULL,
  doctor_name text,
  department_id uuid REFERENCES public.departments(id),
  token_id uuid REFERENCES public.tokens(id),
  token_number integer,
  queue_position integer,
  estimated_wait_minutes integer,
  consultation_duration integer,
  temp_username text,
  temp_password text,
  severity_score integer DEFAULT 0,
  status text NOT NULL DEFAULT 'registered',
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.patient_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Receptionists and admins manage patient records" ON public.patient_records
  FOR ALL TO authenticated
  USING (
    public.has_role(auth.uid(), 'receptionist') OR
    public.has_role(auth.uid(), 'admin')
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'receptionist') OR
    public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Doctors can view assigned records" ON public.patient_records
  FOR SELECT TO authenticated
  USING (doctor_id = auth.uid());

-- Password reset tickets
CREATE TABLE public.password_reset_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username text NOT NULL,
  email text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  resolved_at timestamptz,
  resolved_by uuid,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.password_reset_tickets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can create reset tickets" ON public.password_reset_tickets
  FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Anon can create reset tickets" ON public.password_reset_tickets
  FOR INSERT TO anon
  WITH CHECK (true);

CREATE POLICY "Admins can manage reset tickets" ON public.password_reset_tickets
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Enable realtime for patient_records
ALTER PUBLICATION supabase_realtime ADD TABLE public.patient_records;
ALTER PUBLICATION supabase_realtime ADD TABLE public.employees;
