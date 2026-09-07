-- ==========================================================
-- SIX SIGMA ERP - MIGRATION V2 (14 RÔLES & CONTRÔLES SoD)
-- Slogan : « La constance dans la qualité »
-- ==========================================================

-- 1. ÉVOLUTION DES ENUMS
DO $$ BEGIN
    -- Ajouter 'buyer' à user_role si inexistant
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        JOIN pg_type ON pg_enum.enumtypid = pg_type.oid 
        WHERE typname = 'user_role' AND enumlabel = 'buyer'
    ) THEN
        ALTER TYPE public.user_role ADD VALUE 'buyer';
    END IF;

    -- Enum epi_status
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'epi_status') THEN
        CREATE TYPE public.epi_status AS ENUM ('assigned', 'worn_out', 'lost', 'damaged');
    END IF;

    -- Enum or_status
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'or_status') THEN
        CREATE TYPE public.or_status AS ENUM ('draft', 'diagnosing', 'waiting_parts', 'in_repair', 'completed', 'cancelled');
    END IF;
END $$;

-- 2. TABLE DE RÉCONCILIATION RH (POINTEUR VS TEAM LEADER)
CREATE TABLE IF NOT EXISTS public.attendance_reconciliations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
    worker_name TEXT NOT NULL,
    worker_function TEXT,
    reconciliation_date DATE NOT NULL DEFAULT CURRENT_DATE,
    team_leader_status public.presence_status NOT NULL,
    pointer_status public.presence_status NOT NULL,
    arbitrated_status public.presence_status,
    supervisor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    arbitrated_at TIMESTAMPTZ,
    notes TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'resolved')),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS pour attendance_reconciliations
ALTER TABLE public.attendance_reconciliations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Reconciliations viewable by authorized roles" ON public.attendance_reconciliations;
CREATE POLICY "Reconciliations viewable by authorized roles"
    ON public.attendance_reconciliations FOR SELECT
    TO authenticated
    USING (
        public.get_user_role(auth.uid()) IN ('admin', 'company_management', 'site_manager', 'supervisor', 'hr_officer', 'team_leader')
    );

DROP POLICY IF EXISTS "Reconciliations arbitrable by supervisors and managers" ON public.attendance_reconciliations;
CREATE POLICY "Reconciliations arbitrable by supervisors and managers"
    ON public.attendance_reconciliations FOR ALL
    TO authenticated
    USING (
        public.get_user_role(auth.uid()) IN ('admin', 'site_manager', 'supervisor')
    );

-- 3. TRIGGERS DE CONTRÔLE DE GESTION & SoD

-- A. Interdiction du stock négatif et exigence de rattachement pour sortie
CREATE OR REPLACE FUNCTION public.fn_validate_stock_out()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_current_stock NUMERIC;
BEGIN
    IF NEW.movement_type = 'OUT' THEN
        -- Exigence de rattachement chantier obligatoire
        IF NEW.project_id IS NULL THEN
            RAISE EXCEPTION 'Sortie de stock obligatoirement rattachée à un chantier ou un engin précis.';
        END IF;

        -- Vérification du stock disponible dans inventory_items
        SELECT current_stock INTO v_current_stock
        FROM public.inventory_items
        WHERE id = NEW.item_id;

        IF v_current_stock IS NULL OR v_current_stock < NEW.quantity THEN
            RAISE EXCEPTION 'Stock insuffisant : Zéro stock négatif autorisé. Stock disponible : %, Quantité demandée : %', COALESCE(v_current_stock, 0), NEW.quantity;
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_stock_out ON public.stock_movements;
CREATE TRIGGER trg_validate_stock_out
    BEFORE INSERT ON public.stock_movements
    FOR EACH ROW EXECUTE FUNCTION public.fn_validate_stock_out();

-- B. Blocage dispatch si véhicule indisponible (atelier ou hors service)
CREATE OR REPLACE FUNCTION public.fn_validate_dispatch_vehicle()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_status public.vehicle_status;
BEGIN
    IF NEW.vehicle_id IS NOT NULL THEN
        SELECT status INTO v_status
        FROM public.fleet_vehicles
        WHERE id = NEW.vehicle_id;

        IF v_status IN ('under_maintenance', 'out_of_service') THEN
            RAISE EXCEPTION 'Véhicule indisponible (en atelier ou hors service) : affectation en mission bloquée.';
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_dispatch_vehicle ON public.dispatch_missions;
CREATE TRIGGER trg_validate_dispatch_vehicle
    BEFORE INSERT OR UPDATE ON public.dispatch_missions
    FOR EACH ROW EXECUTE FUNCTION public.fn_validate_dispatch_vehicle();

-- C. Séparation des pouvoirs (SoD) sur les caisses :
--    - Interdiction à l'admin de valider des dépenses
--    - Dépenses >= 5 000 USD validées UNIQUEMENT par company_management
CREATE OR REPLACE FUNCTION public.fn_enforce_sod_cashbox()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_validator_role public.user_role;
    v_limit_threshold NUMERIC;
BEGIN
    IF NEW.validated_by IS NOT NULL AND (OLD.validated_by IS NULL OR OLD.validated_by != NEW.validated_by) THEN
        v_validator_role := public.get_user_role(NEW.validated_by);

        -- Règle 1 : L'admin système ne valide aucune dépense financière
        IF v_validator_role = 'admin' THEN
            RAISE EXCEPTION 'Séparation des pouvoirs : L''administrateur système ne valide pas de dépenses financières.';
        END IF;

        -- Règle 2 : Dépenses >= 5000 USD réservées exclusivement à la Direction Générale
        IF (NEW.currency = 'USD' AND NEW.amount >= 5000.0) OR
           (NEW.currency = 'CDF' AND NEW.amount >= (5000.0 * COALESCE(NEW.exchange_rate, 2850.0))) THEN
            IF v_validator_role != 'company_management' THEN
                RAISE EXCEPTION 'Séparation des pouvoirs : Toute dépense >= 5 000 USD requiert obligatoirement le visa de la Direction Générale (company_management). Rôle actuel : %', v_validator_role;
            END IF;
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_sod_cashbox ON public.cashbox_transactions;
CREATE TRIGGER trg_enforce_sod_cashbox
    BEFORE UPDATE ON public.cashbox_transactions
    FOR EACH ROW EXECUTE FUNCTION public.fn_enforce_sod_cashbox();
