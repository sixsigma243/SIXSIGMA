-- ====================================================================
-- SIX SIGMA ERP - MIGRATION V4 : GOUVERNANCE RH, WORKFLOW COMMERCIAL,
-- CLOISONNEMENT SITE MANAGERS, RESTRICTIONS DRI & SÉPARATION DES TÂCHES
-- ====================================================================

-- 1. ADAPTATION DE LA TABLE PROJECTS (STATUT & SOUMISSION COMMERCIALE)
ALTER TABLE public.projects 
ADD COLUMN IF NOT EXISTS approval_status text DEFAULT 'approved',
ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id);

-- Mise à jour des projets existants pour garantir la visibilité des projets déjà en cours
UPDATE public.projects 
SET approval_status = 'approved' 
WHERE approval_status IS NULL;

-- 2. CORRECTION RLS SUR LA TABLE PROJECTS
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Commercial can create draft projects" ON public.projects;
DROP POLICY IF EXISTS "Site managers see assigned projects" ON public.projects;
DROP POLICY IF EXISTS "Global projects access for executive and admin" ON public.projects;
DROP POLICY IF EXISTS "Public or authenticated view projects" ON public.projects;
DROP POLICY IF EXISTS "Projects manageable by managers and admins" ON public.projects;
DROP POLICY IF EXISTS "Projects viewable by authenticated users" ON public.projects;
DROP POLICY IF EXISTS "Projects viewable by authorized users" ON public.projects;
DROP POLICY IF EXISTS "admin_manage_projects" ON public.projects;
DROP POLICY IF EXISTS "Commercial view projects" ON public.projects;
DROP POLICY IF EXISTS "Site managers update assigned projects" ON public.projects;

-- Politique A : L'Admin et la Direction Générale voient et modifient TOUS les projets
CREATE POLICY "Global projects access for executive and admin" 
ON public.projects FOR ALL 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('admin', 'company_management')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('admin', 'company_management')
  )
);

-- Politique B : Le commercial peut insérer des projets (Statut initial forcé en attente, sans conducteur)
CREATE POLICY "Commercial can create draft projects" 
ON public.projects FOR INSERT 
TO authenticated 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
      AND profiles.role = 'commercial'
  )
  AND (site_manager_id IS NULL)
  AND (approval_status = 'pending_approval')
);

-- Politique C : Le commercial voit les projets qu'il a initiés et les projets validés
CREATE POLICY "Commercial view projects" 
ON public.projects FOR SELECT 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
      AND profiles.role = 'commercial'
  )
  AND (created_by = auth.uid() OR approval_status = 'approved')
);

-- Politique D : Le chef de chantier / conducteur ne voit QUE les chantiers qui lui sont assignés
CREATE POLICY "Site managers see assigned projects" 
ON public.projects FOR SELECT 
TO authenticated 
USING (
  (site_manager_id = auth.uid() AND approval_status = 'approved')
  OR EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('admin', 'company_management', 'accountant', 'hr_officer', 'warehouse_keeper', 'buyer', 'supervisor', 'safety_officer', 'dispatch', 'mechanic', 'stewardship', 'team_leader')
  )
  OR EXISTS (
    SELECT 1 FROM public.project_assignments pa
    WHERE pa.project_id = projects.id 
      AND (pa.supervisor_id = auth.uid() OR pa.team_leader_id = auth.uid())
  )
);

-- Politique E : Les conducteurs de travaux peuvent mettre à jour les chantiers qui leur sont assignés
CREATE POLICY "Site managers update assigned projects" 
ON public.projects FOR UPDATE 
TO authenticated 
USING (site_manager_id = auth.uid() AND approval_status = 'approved')
WITH CHECK (site_manager_id = auth.uid() AND approval_status = 'approved');

-- ====================================================================
-- 3. RESTRICTION SUR LES RÉQUISITIONS DRI (MASQUER POUR LE COMMERCIAL)
-- ====================================================================

-- Protection sur material_requisitions (table réelle des DRI)
ALTER TABLE IF EXISTS public.material_requisitions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Material requisitions viewable by authenticated users" ON public.material_requisitions;
DROP POLICY IF EXISTS "Requisitions viewable by authorized" ON public.material_requisitions;
DROP POLICY IF EXISTS "DRI access policy excluding commercial" ON public.material_requisitions;
DROP POLICY IF EXISTS "Admin manage DRI" ON public.material_requisitions;
DROP POLICY IF EXISTS "admin_manage_requisitions" ON public.material_requisitions;
DROP POLICY IF EXISTS "Commercial cannot access DRI" ON public.material_requisitions;

CREATE POLICY "DRI access policy excluding commercial" 
ON public.material_requisitions FOR SELECT 
TO authenticated 
USING (
  NOT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
      AND profiles.role = 'commercial'
  )
);

CREATE POLICY "Admin manage DRI" 
ON public.material_requisitions FOR ALL 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
  )
);

-- Protection conditionnelle si la table dri_requisitions existe
DO $$ 
BEGIN 
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'dri_requisitions') THEN 
    EXECUTE 'ALTER TABLE public.dri_requisitions ENABLE ROW LEVEL SECURITY;';
    EXECUTE 'DROP POLICY IF EXISTS "Commercial cannot access DRI" ON public.dri_requisitions;';
    EXECUTE 'DROP POLICY IF EXISTS "Authenticated can view DRI" ON public.dri_requisitions;';
    EXECUTE 'DROP POLICY IF EXISTS "DRI access policy excluding commercial" ON public.dri_requisitions;';
    EXECUTE 'DROP POLICY IF EXISTS "Admin manage DRI" ON public.dri_requisitions;';
    EXECUTE 'CREATE POLICY "DRI access policy excluding commercial" ON public.dri_requisitions FOR SELECT TO authenticated USING (NOT EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = ''commercial''));';
    EXECUTE 'CREATE POLICY "Admin manage DRI" ON public.dri_requisitions FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = ''admin''));';
  END IF; 
END $$;

-- ====================================================================
-- 4. GOUVERNANCE RH : BOÎTE DE RÉCEPTION, REQUÊTES & SIGNALEMENTS INTERNES
-- ====================================================================

CREATE TABLE IF NOT EXISTS public.hr_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid NOT NULL REFERENCES auth.users(id),
  target_user_id uuid REFERENCES auth.users(id),
  type text NOT NULL CHECK (type IN ('sanction', 'recruitment', 'promotion', 'contract_termination', 'inquiry')),
  subject text NOT NULL,
  description text NOT NULL,
  hr_opinion text,
  decision_report text,
  status text NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted', 'under_review', 'approved', 'rejected')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.hr_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "HR and Admin full access hr_requests" ON public.hr_requests;
DROP POLICY IF EXISTS "Staff can insert hr_requests" ON public.hr_requests;
DROP POLICY IF EXISTS "Staff can view own submitted hr_requests" ON public.hr_requests;

-- Les RH et Admins voient et traitent toutes les demandes
CREATE POLICY "HR and Admin full access hr_requests" 
ON public.hr_requests FOR ALL 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('hr_officer', 'admin', 'company_management')
  )
);

-- Tout employé authentifié peut soumettre une requête aux RH
CREATE POLICY "Staff can insert hr_requests" 
ON public.hr_requests FOR INSERT 
TO authenticated 
WITH CHECK (sender_id = auth.uid());

-- L'employé émetteur peut suivre l'état de ses propres demandes
CREATE POLICY "Staff can view own submitted hr_requests" 
ON public.hr_requests FOR SELECT 
TO authenticated 
USING (sender_id = auth.uid());

-- ====================================================================
-- 5. MATRICULE EMPLOYÉ AUTOMATIQUE & COLONNES RH ÉTENDUES
-- ====================================================================

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS employee_id text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS job_title text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS base_salary numeric DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS id_card_number text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS contract_type text DEFAULT 'CDI';

CREATE SEQUENCE IF NOT EXISTS public.employee_id_seq START 1001;

CREATE OR REPLACE FUNCTION public.generate_employee_matricule()
RETURNS trigger AS $$
BEGIN
  IF NEW.employee_id IS NULL OR NEW.employee_id = '' THEN
    NEW.employee_id := 'SS-RH-' || to_char(CURRENT_DATE, 'YYYY') || '-' || lpad(nextval('public.employee_id_seq')::text, 4, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_generate_employee_matricule ON public.profiles;
CREATE TRIGGER trg_generate_employee_matricule
BEFORE INSERT ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.generate_employee_matricule();

-- Attribution d'un matricule aux profils existants n'en ayant pas encore
UPDATE public.profiles 
SET employee_id = 'SS-RH-2026-' || lpad(sub.rn::text, 4, '0')
FROM (
  SELECT id, row_number() over (order by created_at) as rn 
  FROM public.profiles 
  WHERE employee_id IS NULL
) sub
WHERE public.profiles.id = sub.id AND public.profiles.employee_id IS NULL;

-- ====================================================================
-- 6. PÔLE COMMERCIAL : JOURNAL D'ACTIVITÉS ET RAPPORTS DE PROSPECTION
-- ====================================================================

CREATE TABLE IF NOT EXISTS public.commercial_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  commercial_id uuid NOT NULL REFERENCES auth.users(id),
  client_name text NOT NULL,
  contact_person text,
  contact_phone text,
  contact_email text,
  activity_type text NOT NULL CHECK (activity_type IN ('call', 'meeting', 'site_visit', 'proposal_sent', 'follow_up', 'negotiation')),
  subject text NOT NULL,
  notes text NOT NULL,
  estimated_deal_value numeric DEFAULT 0,
  currency text DEFAULT 'USD',
  next_follow_up_date date,
  status text NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'won', 'lost', 'postponed')),
  project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.commercial_activities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Commercial and Admin manage activities" ON public.commercial_activities;

CREATE POLICY "Commercial and Admin manage activities"
ON public.commercial_activities FOR ALL
TO authenticated 
USING (
  commercial_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'company_management')
  )
);

-- ====================================================================
-- 7. PAIEMENT & TRANSMISSION SALAIRES (GÉNÉRATION PAIE -> CAISSE)
-- ====================================================================

ALTER TABLE public.payroll_periods
ADD COLUMN IF NOT EXISTS total_gross numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_net numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_deductions numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS currency text DEFAULT 'USD',
ADD COLUMN IF NOT EXISTS status text DEFAULT 'draft',
ADD COLUMN IF NOT EXISTS transmitted_at timestamptz,
ADD COLUMN IF NOT EXISTS finance_transaction_id uuid REFERENCES public.cashbox_transactions(id);

CREATE TABLE IF NOT EXISTS public.payroll_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  period_id uuid NOT NULL REFERENCES public.payroll_periods(id) ON DELETE CASCADE,
  profile_id uuid NOT NULL REFERENCES public.profiles(id),
  worker_name text NOT NULL,
  days_worked integer DEFAULT 0,
  base_salary numeric DEFAULT 0,
  overtime_pay numeric DEFAULT 0,
  bonuses numeric DEFAULT 0,
  deductions numeric DEFAULT 0,
  net_salary numeric DEFAULT 0,
  currency text DEFAULT 'USD',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.payroll_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "HR, Finance, Admin access payroll_items" ON public.payroll_items;

CREATE POLICY "HR, Finance, Admin access payroll_items" 
ON public.payroll_items FOR ALL 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('hr_officer', 'admin', 'company_management', 'accountant')
  )
);
