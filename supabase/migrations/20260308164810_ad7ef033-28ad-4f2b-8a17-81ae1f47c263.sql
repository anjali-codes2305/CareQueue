
-- Create enum for user roles
CREATE TYPE public.app_role AS ENUM ('patient', 'nurse', 'doctor', 'admin');

-- Create enum for queue types
CREATE TYPE public.queue_type AS ENUM ('normal', 'priority');

-- Create enum for token status
CREATE TYPE public.token_status AS ENUM ('waiting', 'in_consultation', 'completed', 'cancelled');

-- Create enum for priority request status
CREATE TYPE public.priority_status AS ENUM ('pending', 'approved', 'rejected');

-- Create enum for notification type
CREATE TYPE public.notification_type AS ENUM ('token_created', 'queue_update', 'turn_near', 'priority_decision', 'doctor_calling', 'emergency_alert', 'doctor_delay');

-- Profiles table
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- User roles table (separate for security)
CREATE TABLE public.user_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE(user_id, role)
);

-- Departments
CREATE TABLE public.departments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tokens (patient queue entries)
CREATE TABLE public.tokens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  token_number SERIAL,
  patient_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  department_id UUID REFERENCES public.departments(id) NOT NULL,
  doctor_id UUID REFERENCES auth.users(id),
  queue_type queue_type NOT NULL DEFAULT 'normal',
  status token_status NOT NULL DEFAULT 'waiting',
  severity_score INTEGER DEFAULT 0 CHECK (severity_score >= 0 AND severity_score <= 100),
  priority_score NUMERIC DEFAULT 0,
  position INTEGER,
  arrival_time TIMESTAMPTZ NOT NULL DEFAULT now(),
  consultation_start TIMESTAMPTZ,
  consultation_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Priority requests
CREATE TABLE public.priority_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  token_id UUID REFERENCES public.tokens(id) ON DELETE CASCADE NOT NULL,
  patient_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  nurse_id UUID REFERENCES auth.users(id),
  status priority_status NOT NULL DEFAULT 'pending',
  reason TEXT,
  symptoms JSONB,
  severity_score INTEGER DEFAULT 0 CHECK (severity_score >= 0 AND severity_score <= 100),
  nurse_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_at TIMESTAMPTZ
);

-- Notifications
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  type notification_type NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Consultation metrics (for analytics)
CREATE TABLE public.consultation_metrics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  doctor_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  department_id UUID REFERENCES public.departments(id) NOT NULL,
  token_id UUID REFERENCES public.tokens(id) ON DELETE CASCADE NOT NULL,
  duration_minutes NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.priority_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consultation_metrics ENABLE ROW LEVEL SECURITY;

-- Security definer function for role checks
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Profiles policies
CREATE POLICY "Users can view all profiles" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- User roles policies
CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all roles" ON public.user_roles FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can insert own role on signup" ON public.user_roles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Departments policies
CREATE POLICY "Anyone can view departments" ON public.departments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage departments" ON public.departments FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Tokens policies
CREATE POLICY "Patients can view own tokens" ON public.tokens FOR SELECT TO authenticated USING (patient_id = auth.uid());
CREATE POLICY "Staff can view all tokens" ON public.tokens FOR SELECT TO authenticated USING (
  public.has_role(auth.uid(), 'nurse') OR public.has_role(auth.uid(), 'doctor') OR public.has_role(auth.uid(), 'admin')
);
CREATE POLICY "Patients can create own tokens" ON public.tokens FOR INSERT TO authenticated WITH CHECK (patient_id = auth.uid());
CREATE POLICY "Staff can update tokens" ON public.tokens FOR UPDATE TO authenticated USING (
  public.has_role(auth.uid(), 'nurse') OR public.has_role(auth.uid(), 'doctor') OR public.has_role(auth.uid(), 'admin')
);
CREATE POLICY "Patients can update own tokens" ON public.tokens FOR UPDATE TO authenticated USING (patient_id = auth.uid());

-- Priority requests policies
CREATE POLICY "Patients can view own requests" ON public.priority_requests FOR SELECT TO authenticated USING (patient_id = auth.uid());
CREATE POLICY "Nurses can view all requests" ON public.priority_requests FOR SELECT TO authenticated USING (
  public.has_role(auth.uid(), 'nurse') OR public.has_role(auth.uid(), 'admin')
);
CREATE POLICY "Patients can create requests" ON public.priority_requests FOR INSERT TO authenticated WITH CHECK (patient_id = auth.uid());
CREATE POLICY "Nurses can update requests" ON public.priority_requests FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'nurse'));

-- Notifications policies
CREATE POLICY "Users can view own notifications" ON public.notifications FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can update own notifications" ON public.notifications FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "System can create notifications" ON public.notifications FOR INSERT TO authenticated WITH CHECK (true);

-- Consultation metrics policies
CREATE POLICY "Doctors can view own metrics" ON public.consultation_metrics FOR SELECT TO authenticated USING (doctor_id = auth.uid());
CREATE POLICY "Admins can view all metrics" ON public.consultation_metrics FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Doctors can insert metrics" ON public.consultation_metrics FOR INSERT TO authenticated WITH CHECK (doctor_id = auth.uid());

-- Enable realtime for key tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.tokens;
ALTER PUBLICATION supabase_realtime ADD TABLE public.priority_requests;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- Update timestamp function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_tokens_updated_at BEFORE UPDATE ON public.tokens FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed departments
INSERT INTO public.departments (name) VALUES 
  ('General Medicine'),
  ('Cardiology'),
  ('Orthopedics'),
  ('Pediatrics'),
  ('Emergency'),
  ('Dermatology'),
  ('ENT'),
  ('Ophthalmology');

-- Handle new user profile creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
