-- ==========================================================
-- SIX SIGMA ERP - MIGRATION V3 (GOUVERNANCE, AUDIT & CONFORMITÉ RH/DISPATCH)
-- Slogan : « La constance dans la qualité »
-- ==========================================================

-- 1. ÉVOLUTION DES TABLES PROFILES, DISPATCH_MISSIONS & CRÉATION DES TABLES AUDIT_LOGS ET PAYROLL_PERIODS

-- A. Renforcement de public.profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS contract_end_date DATE DEFAULT (CURRENT_DATE + INTERVAL '1 year');
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS id_expiry_date DATE DEFAULT (CURRENT_DATE + INTERVAL '2 years');

-- S'assurer que tous les profils existants sont actifs avec des dates valides
UPDATE public.profiles 
SET is_active = true,
    contract_end_date = COALESCE(contract_end_date, CURRENT_DATE + INTERVAL '1 year'),
    id_expiry_date = COALESCE(id_expiry_date, CURRENT_DATE + INTERVAL '2 years')
WHERE is_active IS NULL OR contract_end_date IS NULL OR id_expiry_date IS NULL;

-- B. Table d'Audit Centralisée public.audit_logs
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    table_name TEXT NOT NULL,
    record_id TEXT NOT NULL,
    action TEXT NOT NULL,
    old_data JSONB,
    new_data JSONB,
    performed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    performed_at TIMESTAMPTZ DEFAULT now()
);

-- C. Table des Périodes de Paie public.payroll_periods
CREATE TABLE IF NOT EXISTS public.payroll_periods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    period_name TEXT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    is_locked BOOLEAN NOT NULL DEFAULT false,
    locked_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    locked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- D. Renforcement de dispatch_missions
ALTER TABLE public.dispatch_missions ADD COLUMN IF NOT EXISTS driver_license_expiry DATE DEFAULT (CURRENT_DATE + INTERVAL '1 year');
ALTER TABLE public.dispatch_missions ADD COLUMN IF NOT EXISTS driver_profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

-- 2. VISIBILITÉ UNIVERSELLE DE L'ADMIN SUR TOUTES LES TABLES (RLS SELECT)

-- A. Profiles
DROP POLICY IF EXISTS "Profiles viewable by all authenticated" ON public.profiles;
CREATE POLICY "Profiles viewable by all authenticated"
    ON public.profiles FOR SELECT
    TO authenticated
    USING (public.get_user_role(auth.uid()) = 'admin' OR true);

-- B. Projects
DROP POLICY IF EXISTS "Projects viewable by authorized users" ON public.projects;
CREATE POLICY "Projects viewable by authorized users"
    ON public.projects FOR SELECT
    TO authenticated
    USING (public.get_user_role(auth.uid()) = 'admin' OR true);

-- C. Daily Site Reports
DROP POLICY IF EXISTS "Daily reports viewable by role" ON public.daily_site_reports;
CREATE POLICY "Daily reports viewable by role"
    ON public.daily_site_reports FOR SELECT
    TO authenticated
    USING (
        public.get_user_role(auth.uid()) IN ('admin', 'company_management', 'site_manager', 'supervisor', 'safety_officer')
    );

-- D. Time Entries
DROP POLICY IF EXISTS "Time entries viewable by authorized roles" ON public.time_entries;
CREATE POLICY "Time entries viewable by authorized roles"
    ON public.time_entries FOR SELECT
    TO authenticated
    USING (
        public.get_user_role(auth.uid()) IN ('admin', 'company_management', 'site_manager', 'supervisor', 'team_leader', 'hr_officer', 'accountant')
    );

-- E. Attendance Reconciliations
DROP POLICY IF EXISTS "Reconciliations viewable by authorized roles" ON public.attendance_reconciliations;
CREATE POLICY "Reconciliations viewable by authorized roles"
    ON public.attendance_reconciliations FOR SELECT
    TO authenticated
    USING (
        public.get_user_role(auth.uid()) IN ('admin', 'company_management', 'site_manager', 'supervisor', 'hr_officer', 'team_leader')
    );

-- F. Inventory Items
DROP POLICY IF EXISTS "Inventory viewable by authorized" ON public.inventory_items;
CREATE POLICY "Inventory viewable by authorized"
    ON public.inventory_items FOR SELECT
    TO authenticated
    USING (
        public.get_user_role(auth.uid()) IN ('admin', 'company_management', 'site_manager', 'supervisor', 'warehouse_keeper', 'buyer', 'stewardship', 'mechanic')
    );

-- G. Stock Movements
DROP POLICY IF EXISTS "Stock movements viewable by authorized" ON public.stock_movements;
CREATE POLICY "Stock movements viewable by authorized"
    ON public.stock_movements FOR SELECT
    TO authenticated
    USING (
        public.get_user_role(auth.uid()) IN ('admin', 'company_management', 'site_manager', 'warehouse_keeper', 'buyer', 'accountant')
    );

-- H. Material Requisitions
DROP POLICY IF EXISTS "Requisitions viewable by authorized" ON public.material_requisitions;
CREATE POLICY "Requisitions viewable by authorized"
    ON public.material_requisitions FOR SELECT
    TO authenticated
    USING (
        public.get_user_role(auth.uid()) IN ('admin', 'company_management', 'site_manager', 'supervisor', 'buyer', 'warehouse_keeper', 'accountant')
    );

-- I. Cashbox Transactions
DROP POLICY IF EXISTS "Cashbox transactions viewable by finance & management" ON public.cashbox_transactions;
CREATE POLICY "Cashbox transactions viewable by finance & management"
    ON public.cashbox_transactions FOR SELECT
    TO authenticated
    USING (
        public.get_user_role(auth.uid()) IN ('admin', 'company_management', 'site_manager', 'accountant')
    );

-- J. Fleet Vehicles & Dispatch Missions
DROP POLICY IF EXISTS "Fleet vehicles viewable by authorized" ON public.fleet_vehicles;
CREATE POLICY "Fleet vehicles viewable by authorized"
    ON public.fleet_vehicles FOR SELECT
    TO authenticated
    USING (
        public.get_user_role(auth.uid()) IN ('admin', 'company_management', 'site_manager', 'dispatch', 'mechanic')
    );

DROP POLICY IF EXISTS "Dispatch missions viewable by authorized" ON public.dispatch_missions;
CREATE POLICY "Dispatch missions viewable by authorized"
    ON public.dispatch_missions FOR SELECT
    TO authenticated
    USING (
        public.get_user_role(auth.uid()) IN ('admin', 'company_management', 'site_manager', 'dispatch', 'mechanic')
    );

-- K. Audit Logs & Payroll Periods RLS
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Audit logs viewable by admin and management" ON public.audit_logs;
CREATE POLICY "Audit logs viewable by admin and management"
    ON public.audit_logs FOR SELECT
    TO authenticated
    USING (public.get_user_role(auth.uid()) IN ('admin', 'company_management'));

ALTER TABLE public.payroll_periods ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Payroll periods viewable by authorized" ON public.payroll_periods;
CREATE POLICY "Payroll periods viewable by authorized"
    ON public.payroll_periods FOR SELECT
    TO authenticated
    USING (public.get_user_role(auth.uid()) IN ('admin', 'company_management', 'site_manager', 'hr_officer', 'accountant'));

DROP POLICY IF EXISTS "Payroll periods manageable by admin and hr" ON public.payroll_periods;
CREATE POLICY "Payroll periods manageable by admin and hr"
    ON public.payroll_periods FOR ALL
    TO authenticated
    USING (public.get_user_role(auth.uid()) IN ('admin', 'hr_officer', 'company_management'));


-- 3. TRIGGERS DE SÉCURITÉ MÉTIER & CONFORMITÉ

-- A. Trigger d'Audit Automatique sur les modifications sensibles
CREATE OR REPLACE FUNCTION public.fn_audit_log_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_record_id TEXT;
    v_old JSONB := NULL;
    v_new JSONB := NULL;
BEGIN
    IF TG_OP = 'INSERT' THEN
        v_record_id := NEW.id::TEXT;
        v_new := to_jsonb(NEW);
    ELSIF TG_OP = 'UPDATE' THEN
        v_record_id := NEW.id::TEXT;
        v_old := to_jsonb(OLD);
        v_new := to_jsonb(NEW);
    ELSIF TG_OP = 'DELETE' THEN
        v_record_id := OLD.id::TEXT;
        v_old := to_jsonb(OLD);
    END IF;

    INSERT INTO public.audit_logs (table_name, record_id, action, old_data, new_data, performed_by, performed_at)
    VALUES (TG_TABLE_NAME, v_record_id, TG_OP, v_old, v_new, v_user_id, now());

    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$;

-- Attacher aux profils (rôles & statuts)
DROP TRIGGER IF EXISTS trg_audit_profiles ON public.profiles;
CREATE TRIGGER trg_audit_profiles
    AFTER UPDATE OF role, is_active ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.fn_audit_log_change();

-- Attacher aux caisses (validations financières)
DROP TRIGGER IF EXISTS trg_audit_cashbox ON public.cashbox_transactions;
CREATE TRIGGER trg_audit_cashbox
    AFTER UPDATE OF validated_by, amount ON public.cashbox_transactions
    FOR EACH ROW EXECUTE FUNCTION public.fn_audit_log_change();

-- Attacher aux réconciliations présences
DROP TRIGGER IF EXISTS trg_audit_reconciliations ON public.attendance_reconciliations;
CREATE TRIGGER trg_audit_reconciliations
    AFTER UPDATE OF status, arbitrated_status ON public.attendance_reconciliations
    FOR EACH ROW EXECUTE FUNCTION public.fn_audit_log_change();

-- Attacher aux périodes de paie
DROP TRIGGER IF EXISTS trg_audit_payroll_periods ON public.payroll_periods;
CREATE TRIGGER trg_audit_payroll_periods
    AFTER UPDATE OF is_locked ON public.payroll_periods
    FOR EACH ROW EXECUTE FUNCTION public.fn_audit_log_change();


-- B. Règle Clôture Journal de Chantier avant 19h00 (Heure RDC / UTC+2)
CREATE OR REPLACE FUNCTION public.fn_enforce_daily_report_cutoff()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_current_time_rdc TIME;
    v_role public.user_role;
BEGIN
    -- Heure courante en République Démocratique du Congo (Africa/Lubumbashi UTC+2)
    v_current_time_rdc := (CURRENT_TIMESTAMP AT TIME ZONE 'Africa/Lubumbashi')::TIME;
    v_role := public.get_user_role(auth.uid());

    -- Si le rapport concerne la journée courante
    IF (NEW.report_date = CURRENT_DATE) THEN
        IF v_current_time_rdc > '19:00:00'::TIME THEN
            -- Dérogation réservée exclusivement à l'administrateur
            IF v_role != 'admin' THEN
                RAISE EXCEPTION 'Clôture obligatoire : Le journal de chantier doit être clôturé et soumis chaque jour avant 19h00 (Heure RDC). Heure actuelle : %', to_char(v_current_time_rdc, 'HH24:MI');
            END IF;
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_daily_report_cutoff ON public.daily_site_reports;
CREATE TRIGGER trg_enforce_daily_report_cutoff
    BEFORE INSERT OR UPDATE ON public.daily_site_reports
    FOR EACH ROW EXECUTE FUNCTION public.fn_enforce_daily_report_cutoff();


-- C. Règle Conformité RH (Contrat ou Pièce d'Identité Expiré)
CREATE OR REPLACE FUNCTION public.fn_validate_worker_compliance_on_time_entry()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_contract_end DATE;
    v_id_expiry DATE;
    v_is_active BOOLEAN;
BEGIN
    IF NEW.profile_id IS NOT NULL THEN
        SELECT contract_end_date, id_expiry_date, is_active
        INTO v_contract_end, v_id_expiry, v_is_active
        FROM public.profiles
        WHERE id = NEW.profile_id;

        IF v_is_active = false THEN
            RAISE EXCEPTION 'Conformité RH violée : L''employé sélectionné est inactif / désactivé.';
        END IF;

        IF (v_contract_end IS NOT NULL AND v_contract_end < CURRENT_DATE) OR
           (v_id_expiry IS NOT NULL AND v_id_expiry < CURRENT_DATE) THEN
            RAISE EXCEPTION 'Conformité RH violée : Impossible d''enregistrer le pointage d''un employé dont le contrat de travail ou la pièce d''identité est expiré(e). (Fin contrat: %, Expiration pièce: %)', v_contract_end, v_id_expiry;
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_worker_compliance_on_time_entry ON public.time_entries;
CREATE TRIGGER trg_validate_worker_compliance_on_time_entry
    BEFORE INSERT ON public.time_entries
    FOR EACH ROW EXECUTE FUNCTION public.fn_validate_worker_compliance_on_time_entry();


-- D. Règle Dispatch & Permis de Conduire Expiré
CREATE OR REPLACE FUNCTION public.fn_validate_dispatch_vehicle()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_status public.vehicle_status;
    v_mission_date DATE;
BEGIN
    -- 1. Contrôle statut de l'engin dans fleet_vehicles
    IF NEW.vehicle_id IS NOT NULL THEN
        SELECT status INTO v_status
        FROM public.fleet_vehicles
        WHERE id = NEW.vehicle_id;

        IF v_status IN ('under_maintenance', 'out_of_service') THEN
            RAISE EXCEPTION 'Véhicule indisponible (en atelier ou hors service) : affectation en mission bloquée.';
        END IF;
    END IF;

    -- 2. Contrôle de validité du permis de conduire
    v_mission_date := COALESCE(NEW.departure_date, CURRENT_DATE);
    IF NEW.driver_license_expiry IS NOT NULL AND NEW.driver_license_expiry < v_mission_date THEN
        RAISE EXCEPTION 'Règle Dispatch violée : Impossible d''affecter un chauffeur dont le permis de conduire est expiré (Date d''expiration : %, Date mission : %).', NEW.driver_license_expiry, v_mission_date;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_dispatch_vehicle ON public.dispatch_missions;
CREATE TRIGGER trg_validate_dispatch_vehicle
    BEFORE INSERT OR UPDATE ON public.dispatch_missions
    FOR EACH ROW EXECUTE FUNCTION public.fn_validate_dispatch_vehicle();


-- E. Période de Paie Verrouillée (Payroll Lock)
CREATE OR REPLACE FUNCTION public.fn_enforce_payroll_period_lock()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_is_locked BOOLEAN := false;
    v_period_name TEXT;
    v_user_role public.user_role;
BEGIN
    -- Vérifier si la date d'entrée tombe dans une période verrouillée
    SELECT true, period_name INTO v_is_locked, v_period_name
    FROM public.payroll_periods
    WHERE OLD.entry_date BETWEEN start_date AND end_date
      AND is_locked = true
    LIMIT 1;

    IF v_is_locked THEN
        v_user_role := public.get_user_role(auth.uid());
        IF v_user_role != 'admin' THEN
            RAISE EXCEPTION 'Période de paie verrouillée : Impossible de modifier ou supprimer un pointage sur la période de paie clôturée (%).', v_period_name;
        ELSE
            -- Pour l'administrateur, modification tracée dans les logs d'audit
            INSERT INTO public.audit_logs (table_name, record_id, action, old_data, new_data, performed_by, performed_at)
            VALUES ('time_entries', OLD.id::TEXT, TG_OP || '_PAYROLL_OVERRIDE', to_jsonb(OLD), CASE WHEN TG_OP = 'UPDATE' THEN to_jsonb(NEW) ELSE NULL END, auth.uid(), now());
        END IF;
    END IF;

    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_payroll_period_lock ON public.time_entries;
CREATE TRIGGER trg_enforce_payroll_period_lock
    BEFORE UPDATE OR DELETE ON public.time_entries
    FOR EACH ROW EXECUTE FUNCTION public.fn_enforce_payroll_period_lock();


-- 4. DONNÉES INITIALES POUR PAYROLL_PERIODS & AUDIT INITIAL
INSERT INTO public.payroll_periods (period_name, start_date, end_date, is_locked, locked_at)
VALUES 
    ('Août 2026', '2026-08-01', '2026-08-31', true, '2026-08-31 23:59:59+02'),
    ('Septembre 2026', '2026-09-01', '2026-09-30', false, NULL)
ON CONFLICT DO NOTHING;

-- Enregistrer un log d'audit système
INSERT INTO public.audit_logs (table_name, record_id, action, new_data, performed_at)
VALUES (
    'system_configuration',
    'v3_migration',
    'INIT_V3',
    jsonb_build_object(
        'version', 'V3',
        'description', 'Renforcement gouvernance, visibilité admin universelle, SoD, conformité RH & Dispatch',
        'timestamp', now()
    ),
    now()
);
