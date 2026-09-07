-- ==========================================================
-- SIX SIGMA ERP - SUPABASE SCHEMA MIGRATION
-- Devise : USD & CDF | Matrice RBAC 13 Rôles
-- Slogan : « La constance dans la qualité »
-- ==========================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. ENUMS
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        CREATE TYPE user_role AS ENUM (
            'admin',
            'company_management',
            'site_manager',
            'supervisor',
            'team_leader',
            'hr_officer',
            'accountant',
            'warehouse_keeper',
            'stewardship',
            'mechanic',
            'dispatch',
            'safety_officer',
            'commercial'
        );
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'currency_code') THEN
        CREATE TYPE currency_code AS ENUM ('USD', 'CDF');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'project_status') THEN
        CREATE TYPE project_status AS ENUM ('draft', 'in_progress', 'on_hold', 'completed', 'cancelled');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'requisition_status') THEN
        CREATE TYPE requisition_status AS ENUM ('draft', 'submitted', 'site_manager_approved', 'rejected', 'fulfilled');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'vehicle_status') THEN
        CREATE TYPE vehicle_status AS ENUM ('available', 'in_mission', 'under_maintenance', 'out_of_service');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'presence_status') THEN
        CREATE TYPE presence_status AS ENUM ('present', 'late', 'absent', 'leave');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'report_status') THEN
        CREATE TYPE report_status AS ENUM ('draft', 'submitted', 'validated', 'rejected');
    END IF;
END $$;

-- 3. TABLE PROFILES
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    first_name TEXT,
    last_name TEXT,
    full_name TEXT,
    email TEXT,
    phone TEXT,
    role user_role NOT NULL DEFAULT 'supervisor',
    sub_role TEXT, -- e.g. for hr_officer: 'pointeur', 'payroll', 'juridique'
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Function to get current user role without triggering RLS recursion
CREATE OR REPLACE FUNCTION public.get_user_role(uid UUID)
RETURNS user_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT role FROM public.profiles WHERE id = uid LIMIT 1;
$$;

-- Trigger to create profile when auth.users is created
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name, first_name, last_name, role, sub_role)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
        COALESCE(NEW.raw_user_meta_data->>'first_name', split_part(NEW.email, '@', 1)),
        COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
        COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'supervisor'::user_role),
        COALESCE(NEW.raw_user_meta_data->>'sub_role', NULL)
    )
    ON CONFLICT (id) DO UPDATE
    SET email = EXCLUDED.email,
        full_name = COALESCE(EXCLUDED.full_name, public.profiles.full_name),
        role = COALESCE(EXCLUDED.role, public.profiles.role),
        updated_at = now();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 4. TABLE PROJECTS
CREATE TABLE IF NOT EXISTS public.projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    client_name TEXT NOT NULL,
    location TEXT NOT NULL,
    budget NUMERIC(15,2) NOT NULL DEFAULT 0,
    currency currency_code NOT NULL DEFAULT 'USD',
    site_manager_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    status project_status NOT NULL DEFAULT 'in_progress',
    start_date DATE DEFAULT CURRENT_DATE,
    end_date DATE,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 5. TABLE PROJECT_ASSIGNMENTS
CREATE TABLE IF NOT EXISTS public.project_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    supervisor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    team_leader_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    assigned_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(project_id, supervisor_id, team_leader_id)
);

-- 6. TABLE DAILY_SITE_REPORTS
CREATE TABLE IF NOT EXISTS public.daily_site_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    supervisor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    report_date DATE NOT NULL DEFAULT CURRENT_DATE,
    weather TEXT DEFAULT 'Ensoleillé',
    workforce_count INTEGER DEFAULT 0,
    activities_summary TEXT NOT NULL,
    issues_and_delays TEXT,
    safety_observations TEXT,
    status report_status NOT NULL DEFAULT 'draft',
    validated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    validation_notes TEXT,
    validated_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 7. TABLE TIME_ENTRIES
CREATE TABLE IF NOT EXISTS public.time_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
    profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    worker_name TEXT NOT NULL,
    worker_function TEXT,
    entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
    status presence_status NOT NULL DEFAULT 'present',
    check_in TIME,
    check_out TIME,
    overtime_hours NUMERIC(4,2) DEFAULT 0,
    supervisor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 8. TABLE INVENTORY_ITEMS
CREATE TABLE IF NOT EXISTS public.inventory_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sku TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    unit TEXT NOT NULL,
    current_stock NUMERIC(12,2) NOT NULL DEFAULT 0,
    min_threshold NUMERIC(12,2) NOT NULL DEFAULT 10,
    unit_cost NUMERIC(12,2) DEFAULT 0,
    currency currency_code NOT NULL DEFAULT 'USD',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 9. TABLE STOCK_MOVEMENTS
CREATE TABLE IF NOT EXISTS public.stock_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_id UUID NOT NULL REFERENCES public.inventory_items(id) ON DELETE CASCADE,
    movement_type TEXT NOT NULL CHECK (movement_type IN ('IN', 'OUT', 'ADJUSTMENT')),
    quantity NUMERIC(12,2) NOT NULL,
    reference_doc TEXT,
    project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
    performed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Trigger to update inventory current_stock on stock_movement
CREATE OR REPLACE FUNCTION public.apply_stock_movement()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    IF NEW.movement_type = 'IN' THEN
        UPDATE public.inventory_items
        SET current_stock = current_stock + NEW.quantity, updated_at = now()
        WHERE id = NEW.item_id;
    ELSIF NEW.movement_type = 'OUT' THEN
        UPDATE public.inventory_items
        SET current_stock = current_stock - NEW.quantity, updated_at = now()
        WHERE id = NEW.item_id;
    ELSIF NEW.movement_type = 'ADJUSTMENT' THEN
        UPDATE public.inventory_items
        SET current_stock = NEW.quantity, updated_at = now()
        WHERE id = NEW.item_id;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_stock_movement_apply ON public.stock_movements;
CREATE TRIGGER trg_stock_movement_apply
    AFTER INSERT ON public.stock_movements
    FOR EACH ROW EXECUTE FUNCTION public.apply_stock_movement();

-- 10. TABLE MATERIAL_REQUISITIONS (DRI)
CREATE TABLE IF NOT EXISTS public.material_requisitions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    requisition_number TEXT UNIQUE NOT NULL,
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    requested_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    site_manager_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    status requisition_status NOT NULL DEFAULT 'submitted',
    items JSONB NOT NULL DEFAULT '[]'::jsonb,
    urgent BOOLEAN DEFAULT false,
    supervisor_comment TEXT,
    validation_comment TEXT,
    approved_at TIMESTAMPTZ,
    fulfilled_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 11. TABLE FLEET_VEHICLES
CREATE TABLE IF NOT EXISTS public.fleet_vehicles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plate_number TEXT UNIQUE NOT NULL,
    model TEXT NOT NULL,
    vehicle_type TEXT NOT NULL,
    status vehicle_status NOT NULL DEFAULT 'available',
    current_mileage INTEGER DEFAULT 0,
    assigned_driver TEXT,
    last_maintenance_date DATE,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 12. TABLE DISPATCH_MISSIONS
CREATE TABLE IF NOT EXISTS public.dispatch_missions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vehicle_id UUID REFERENCES public.fleet_vehicles(id) ON DELETE SET NULL,
    driver_name TEXT NOT NULL,
    project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
    departure_place TEXT NOT NULL,
    destination TEXT NOT NULL,
    cargo_description TEXT,
    departure_date TIMESTAMPTZ NOT NULL,
    return_date TIMESTAMPTZ,
    fuel_consumed_liters NUMERIC(8,2) DEFAULT 0,
    status TEXT DEFAULT 'in_transit' CHECK (status IN ('planned', 'in_transit', 'completed', 'cancelled')),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 13. TABLE CASHBOX_TRANSACTIONS
CREATE TABLE IF NOT EXISTS public.cashbox_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cashbox_type TEXT NOT NULL CHECK (cashbox_type IN ('central', 'site')),
    project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
    transaction_type TEXT NOT NULL CHECK (transaction_type IN ('INCOME', 'EXPENSE', 'TRANSFER')),
    amount NUMERIC(15,2) NOT NULL,
    currency currency_code NOT NULL DEFAULT 'USD',
    exchange_rate NUMERIC(10,4) DEFAULT 2850.0, -- Default CDF / USD rate
    category TEXT NOT NULL,
    description TEXT NOT NULL,
    receipt_url TEXT,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    validated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    requires_management_approval BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Trigger to flag transactions requiring management approval (> 5 000 USD or equivalent in CDF)
CREATE OR REPLACE FUNCTION public.check_management_approval_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF (NEW.currency = 'USD' AND NEW.amount >= 5000.0) OR
       (NEW.currency = 'CDF' AND NEW.amount >= (5000.0 * COALESCE(NEW.exchange_rate, 2850.0))) THEN
        NEW.requires_management_approval := true;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_cashbox_limit_check ON public.cashbox_transactions;
CREATE TRIGGER trg_cashbox_limit_check
    BEFORE INSERT OR UPDATE ON public.cashbox_transactions
    FOR EACH ROW EXECUTE FUNCTION public.check_management_approval_limit();

-- ==========================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==========================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_site_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.time_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.material_requisitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fleet_vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dispatch_missions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cashbox_transactions ENABLE ROW LEVEL SECURITY;

-- Helper policy: authenticated users can read all profiles
CREATE POLICY "Profiles viewable by authenticated users"
    ON public.profiles FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Users can update their own profile"
    ON public.profiles FOR UPDATE
    TO authenticated
    USING (auth.uid() = id);

-- Projects policies
CREATE POLICY "Projects viewable by authenticated users"
    ON public.projects FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Projects manageable by managers and admins"
    ON public.projects FOR ALL
    TO authenticated
    USING (
        public.get_user_role(auth.uid()) IN ('admin', 'company_management', 'site_manager')
    );

-- Project assignments policies
CREATE POLICY "Assignments viewable by authenticated users"
    ON public.project_assignments FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Assignments manageable by managers and admins"
    ON public.project_assignments FOR ALL
    TO authenticated
    USING (
        public.get_user_role(auth.uid()) IN ('admin', 'company_management', 'site_manager')
    );

-- Daily site reports policies
CREATE POLICY "Site reports viewable by authenticated users"
    ON public.daily_site_reports FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Supervisors and managers can insert/update site reports"
    ON public.daily_site_reports FOR ALL
    TO authenticated
    USING (
        public.get_user_role(auth.uid()) IN ('admin', 'company_management', 'site_manager', 'supervisor')
    );

-- Time entries policies
CREATE POLICY "Time entries viewable by authenticated users"
    ON public.time_entries FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Supervisors, HR and managers can manage time entries"
    ON public.time_entries FOR ALL
    TO authenticated
    USING (
        public.get_user_role(auth.uid()) IN ('admin', 'company_management', 'site_manager', 'supervisor', 'team_leader', 'hr_officer')
    );

-- Inventory & Stock policies
CREATE POLICY "Inventory viewable by authenticated users"
    ON public.inventory_items FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Warehouse keeper, stewardship and admins manage inventory"
    ON public.inventory_items FOR ALL
    TO authenticated
    USING (
        public.get_user_role(auth.uid()) IN ('admin', 'company_management', 'warehouse_keeper', 'stewardship')
    );

CREATE POLICY "Stock movements viewable by authenticated users"
    ON public.stock_movements FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Warehouse keepers and admins manage stock movements"
    ON public.stock_movements FOR ALL
    TO authenticated
    USING (
        public.get_user_role(auth.uid()) IN ('admin', 'company_management', 'warehouse_keeper', 'stewardship', 'mechanic')
    );

-- Material requisitions (DRI) policies
CREATE POLICY "Material requisitions viewable by authenticated users"
    ON public.material_requisitions FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Requisitions manageable by site personnel, managers and warehouse"
    ON public.material_requisitions FOR ALL
    TO authenticated
    USING (
        public.get_user_role(auth.uid()) IN ('admin', 'company_management', 'site_manager', 'supervisor', 'warehouse_keeper', 'accountant')
    );

-- Fleet & Dispatch policies
CREATE POLICY "Fleet viewable by authenticated users"
    ON public.fleet_vehicles FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Dispatch, mechanic and admins manage fleet"
    ON public.fleet_vehicles FOR ALL
    TO authenticated
    USING (
        public.get_user_role(auth.uid()) IN ('admin', 'company_management', 'dispatch', 'mechanic')
    );

CREATE POLICY "Dispatch missions viewable by authenticated users"
    ON public.dispatch_missions FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Dispatch and admins manage dispatch missions"
    ON public.dispatch_missions FOR ALL
    TO authenticated
    USING (
        public.get_user_role(auth.uid()) IN ('admin', 'company_management', 'dispatch')
    );

-- Cashbox policies
CREATE POLICY "Cashbox transactions viewable by authorized roles"
    ON public.cashbox_transactions FOR SELECT
    TO authenticated
    USING (
        public.get_user_role(auth.uid()) IN ('admin', 'company_management', 'accountant', 'site_manager')
    );

CREATE POLICY "Accountants and admins manage cashbox transactions"
    ON public.cashbox_transactions FOR ALL
    TO authenticated
    USING (
        public.get_user_role(auth.uid()) IN ('admin', 'company_management', 'accountant')
    );
