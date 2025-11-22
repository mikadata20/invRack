-- Create enum for user roles
CREATE TYPE public.app_role AS ENUM ('admin', 'controller', 'operator');

-- Create profiles table for user information
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  full_name TEXT,
  role app_role NOT NULL DEFAULT 'operator',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create user_roles table for role management
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE(user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = _user_id
      AND role = _role
      AND is_active = true
  )
$$;

-- Create BOM master table
CREATE TABLE public.bom_master (
  id SERIAL PRIMARY KEY,
  unix_no TEXT NOT NULL,
  model TEXT NOT NULL,
  cyl TEXT,
  parent_part TEXT NOT NULL,
  child_part TEXT NOT NULL,
  part_name TEXT NOT NULL,
  bom TEXT,
  label_code TEXT,
  rack TEXT,
  location TEXT,
  kanban_code TEXT,
  sequence INTEGER,
  assy_line_no TEXT,
  source TEXT CHECK (source IN ('KYBJ', 'KIMZ', 'NSSI', 'KCMI', 'GM', 'YSN')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  UNIQUE(unix_no, parent_part, child_part)
);

-- Enable RLS on bom_master
ALTER TABLE public.bom_master ENABLE ROW LEVEL SECURITY;

-- Create stock_adjustments table
CREATE TABLE public.stock_adjustments (
  id SERIAL PRIMARY KEY,
  part_no TEXT NOT NULL,
  part_name TEXT NOT NULL,
  rack_location TEXT NOT NULL,
  current_stock INTEGER NOT NULL,
  adjust_qty INTEGER NOT NULL,
  new_stock INTEGER NOT NULL,
  reason TEXT NOT NULL,
  adjusted_by UUID REFERENCES auth.users(id),
  adjusted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on stock_adjustments
ALTER TABLE public.stock_adjustments ENABLE ROW LEVEL SECURITY;

-- Create activity_log table
CREATE TABLE public.activity_log (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  username TEXT,
  action_type TEXT NOT NULL,
  table_name TEXT NOT NULL,
  record_id TEXT,
  old_data JSONB,
  new_data JSONB,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on activity_log
ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;

-- Add safety_stock and last columns to rack_inventory
ALTER TABLE public.rack_inventory 
ADD COLUMN IF NOT EXISTS safety_stock INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_supply TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS last_picking TIMESTAMP WITH TIME ZONE;

-- RLS Policies for profiles
CREATE POLICY "Users can view all profiles" ON public.profiles
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage profiles" ON public.profiles
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for bom_master
CREATE POLICY "Everyone can view BOM" ON public.bom_master
  FOR SELECT USING (true);

CREATE POLICY "Admin and Controller can insert BOM" ON public.bom_master
  FOR INSERT WITH CHECK (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'controller')
  );

CREATE POLICY "Admin and Controller can update BOM" ON public.bom_master
  FOR UPDATE USING (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'controller')
  );

CREATE POLICY "Only admin can delete BOM" ON public.bom_master
  FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for stock_adjustments
CREATE POLICY "Everyone can view adjustments" ON public.stock_adjustments
  FOR SELECT USING (true);

CREATE POLICY "Admin and Controller can adjust stock" ON public.stock_adjustments
  FOR INSERT WITH CHECK (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'controller')
  );

-- RLS Policies for activity_log
CREATE POLICY "Everyone can view activity log" ON public.activity_log
  FOR SELECT USING (true);

CREATE POLICY "System can insert activity log" ON public.activity_log
  FOR INSERT WITH CHECK (true);

-- Trigger to update profiles updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger to update bom_master updated_at
CREATE TRIGGER update_bom_master_updated_at
  BEFORE UPDATE ON public.bom_master
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Function to handle new user profile creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, username, full_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE((NEW.raw_user_meta_data->>'role')::app_role, 'operator')
  );
  RETURN NEW;
END;
$$;

-- Trigger for auto-creating profiles
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();