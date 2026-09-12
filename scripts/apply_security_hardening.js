const fs = require('fs');
const path = require('path');

const envPath = fs.existsSync('.env.local') ? '.env.local' : path.resolve(__dirname, '../.env.local');
const env = fs.readFileSync(envPath, 'utf-8');
const token = env.match(/SUPABASE_ACCESS_TOKEN=(.+)/)[1].trim();

async function run() {
  console.log('=== APPLICATION DU RENFORCEMENT DE SÉCURITÉ POSTGRESQL ===\n');

  const sql = `
  -- 1. Trigger de protection des champs sensibles sur public.profiles
  -- Empêche toute élévation de privilèges ou falsification des taux par des non-admins
  CREATE OR REPLACE FUNCTION public.fn_protect_profile_sensitive_fields()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
  AS $$
  BEGIN
    -- Seul un administrateur système authentifié (ou les migrations de service) peut modifier ces colonnes critiques
    IF (NEW.role IS DISTINCT FROM OLD.role 
        OR NEW.is_active IS DISTINCT FROM OLD.is_active
        OR NEW.daily_rate IS DISTINCT FROM OLD.daily_rate
        OR NEW.base_salary IS DISTINCT FROM OLD.base_salary
        OR NEW.employee_id IS DISTINCT FROM OLD.employee_id) THEN
      
      IF (auth.uid() IS NOT NULL AND public.get_user_role(auth.uid()) != 'admin'::public.user_role) THEN
        RAISE EXCEPTION 'Accès refusé [Sécurité RLS] : Seul le Super-Administrateur peut modifier le rôle, statut, matricule ou rémunération d''un agent.';
      END IF;
    END IF;
    RETURN NEW;
  END;
  $$;

  DROP TRIGGER IF EXISTS trg_protect_profile_sensitive_fields ON public.profiles;
  CREATE TRIGGER trg_protect_profile_sensitive_fields
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.fn_protect_profile_sensitive_fields();

  -- 2. Séparation des Tâches Caisse (SoD) sur public.cashbox_transactions
  -- Empêche strictement l'auto-validation d'un décaissement par son propre créateur
  CREATE OR REPLACE FUNCTION public.fn_enforce_cashbox_sod()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
  AS $$
  BEGIN
    IF (NEW.status = 'approved' AND OLD.status != 'approved') THEN
      IF (NEW.validated_by IS NOT NULL AND NEW.validated_by = OLD.created_by) THEN
        RAISE EXCEPTION 'Violation de Séparation des Tâches (SoD) : Le créateur d''une opération de caisse ne peut pas l''approuver lui-même.';
      END IF;
    END IF;
    RETURN NEW;
  END;
  $$;

  DROP TRIGGER IF EXISTS trg_enforce_cashbox_sod ON public.cashbox_transactions;
  CREATE TRIGGER trg_enforce_cashbox_sod
    BEFORE UPDATE ON public.cashbox_transactions
    FOR EACH ROW EXECUTE FUNCTION public.fn_enforce_cashbox_sod();

  -- 3. Vérification des index sur time_entries pour maximiser la performance des requêtes paie
  CREATE INDEX IF NOT EXISTS idx_time_entries_dates_status ON public.time_entries(entry_date, status);
  CREATE INDEX IF NOT EXISTS idx_time_entries_profile_date ON public.time_entries(profile_id, entry_date);
  `;

  const res = await fetch('https://api.supabase.com/v1/projects/tulxrodafhodmxcftpfr/database/query', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: sql })
  });

  const result = await res.json();
  if (!res.ok || (result && result.message && result.message.startsWith('Failed to run sql query'))) {
    console.error('Erreur migration sécurité :', result);
    process.exit(1);
  }

  console.log('✓ Triggers de sécurité et index de performance appliqués avec succès !');
}

run().catch(console.error);
