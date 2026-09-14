/**
 * MIGRATION SQL — Workflow Réquisition à 4 Étapes
 * SIX SIGMA ERP — Phase 2
 */

const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '..', '.env.local');
const env = fs.readFileSync(envPath, 'utf-8');

const getEnvVar = (name) => {
  const match = env.match(new RegExp(`${name}=(.+)`));
  return match ? match[1].trim() : null;
};

const ACCESS_TOKEN = getEnvVar('SUPABASE_ACCESS_TOKEN');
const PROJECT_REF = getEnvVar('SUPABASE_PROJECT_REF');

const API_URL = `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`;

async function runSQL(sql, label) {
  console.log(`\n⏳ Exécution : ${label}...`);
  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ACCESS_TOKEN}`,
      },
      body: JSON.stringify({ query: sql }),
    });

    const text = await res.text();
    let data;
    try { data = JSON.parse(text); } catch { data = text; }

    if (!res.ok) {
      const errMsg = typeof data === 'object' ? JSON.stringify(data) : data;
      if (errMsg.includes('already exists') || errMsg.includes('duplicate') || errMsg.includes('cannot add')) {
        console.log(`   ⚠️  [${label}] Déjà existant (ignoré)`);
        return true;
      }
      console.error(`   ❌ Échec [${label}]: ${errMsg.substring(0, 200)}`);
      return false;
    }

    console.log(`   ✅ Succès: ${label}`);
    return true;
  } catch (err) {
    console.error(`   ❌ Erreur réseau [${label}]:`, err.message);
    return false;
  }
}

async function migrate() {
  console.log('🚀 === MIGRATION PHASE 2 — WORKFLOW RÉQUISITION 4 ÉTAPES ===');
  console.log(`📡 Projet Supabase: ${PROJECT_REF}`);

  const steps = [
    // STEP 1: treasury_officer dans user_role
    { label: "Ajout treasury_officer à user_role", sql: `ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'treasury_officer';` },

    // STEP 2: Nouveaux statuts workflow réquisition
    { label: "Statut pending_admin", sql: `ALTER TYPE public.requisition_status ADD VALUE IF NOT EXISTS 'pending_admin';` },
    { label: "Statut admin_approved", sql: `ALTER TYPE public.requisition_status ADD VALUE IF NOT EXISTS 'admin_approved';` },
    { label: "Statut disbursed", sql: `ALTER TYPE public.requisition_status ADD VALUE IF NOT EXISTS 'disbursed';` },
    { label: "Statut purchased", sql: `ALTER TYPE public.requisition_status ADD VALUE IF NOT EXISTS 'purchased';` },
    { label: "Statut received", sql: `ALTER TYPE public.requisition_status ADD VALUE IF NOT EXISTS 'received';` },
    { label: "Statut cancelled", sql: `ALTER TYPE public.requisition_status ADD VALUE IF NOT EXISTS 'cancelled';` },

    // STEP 3: Colonnes traçabilité Étape 2 (Admin)
    { label: "Colonne admin_validated_by", sql: `ALTER TABLE public.material_requisitions ADD COLUMN IF NOT EXISTS admin_validated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;` },
    { label: "Colonne admin_validated_at", sql: `ALTER TABLE public.material_requisitions ADD COLUMN IF NOT EXISTS admin_validated_at timestamptz;` },
    { label: "Colonne admin_comment", sql: `ALTER TABLE public.material_requisitions ADD COLUMN IF NOT EXISTS admin_comment text;` },
    { label: "Colonne estimated_amount", sql: `ALTER TABLE public.material_requisitions ADD COLUMN IF NOT EXISTS estimated_amount numeric(14,2) DEFAULT 0;` },

    // STEP 4: Colonnes traçabilité Étape 3 (Décaissement)
    { label: "Colonne disbursed_by", sql: `ALTER TABLE public.material_requisitions ADD COLUMN IF NOT EXISTS disbursed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;` },
    { label: "Colonne disbursed_at", sql: `ALTER TABLE public.material_requisitions ADD COLUMN IF NOT EXISTS disbursed_at timestamptz;` },
    { label: "Colonne disbursement_amount", sql: `ALTER TABLE public.material_requisitions ADD COLUMN IF NOT EXISTS disbursement_amount numeric(14,2);` },
    { label: "Colonne disbursement_ref", sql: `ALTER TABLE public.material_requisitions ADD COLUMN IF NOT EXISTS disbursement_ref text;` },
    { label: "Colonne disbursement_currency", sql: `ALTER TABLE public.material_requisitions ADD COLUMN IF NOT EXISTS disbursement_currency text DEFAULT 'USD';` },

    // STEP 5: Colonnes traçabilité Étape 4 (Achat & Réception)
    { label: "Colonne purchased_by", sql: `ALTER TABLE public.material_requisitions ADD COLUMN IF NOT EXISTS purchased_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;` },
    { label: "Colonne purchased_at", sql: `ALTER TABLE public.material_requisitions ADD COLUMN IF NOT EXISTS purchased_at timestamptz;` },
    { label: "Colonne received_by", sql: `ALTER TABLE public.material_requisitions ADD COLUMN IF NOT EXISTS received_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;` },
    { label: "Colonne received_at", sql: `ALTER TABLE public.material_requisitions ADD COLUMN IF NOT EXISTS received_at timestamptz;` },
    { label: "Colonne reception_notes", sql: `ALTER TABLE public.material_requisitions ADD COLUMN IF NOT EXISTS reception_notes text;` },
    { label: "Colonne final_amount", sql: `ALTER TABLE public.material_requisitions ADD COLUMN IF NOT EXISTS final_amount numeric(14,2);` },

    // STEP 6: Index performance
    { label: "Index idx_req_status_workflow", sql: `CREATE INDEX IF NOT EXISTS idx_req_status_workflow ON public.material_requisitions(status);` },
    { label: "Index idx_req_project_status", sql: `CREATE INDEX IF NOT EXISTS idx_req_project_status ON public.material_requisitions(project_id, status);` },
    { label: "Index idx_req_requested_by", sql: `CREATE INDEX IF NOT EXISTS idx_req_requested_by ON public.material_requisitions(requested_by);` },

    // STEP 7: Trigger SoD décaissement
    {
      label: "Trigger SoD Décaissement (fn_enforce_disbursement_sod)",
      sql: `
CREATE OR REPLACE FUNCTION public.fn_enforce_disbursement_sod()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  actor_role text;
BEGIN
  SELECT role INTO actor_role FROM public.profiles WHERE id = auth.uid();

  IF NEW.status = 'disbursed' AND OLD.status = 'admin_approved' THEN
    IF actor_role NOT IN ('treasury_officer', 'accountant', 'admin', 'company_management') THEN
      RAISE EXCEPTION 'ACCÈS REFUSÉ: Seul le Trésorier peut enregistrer un décaissement.';
    END IF;
    NEW.disbursed_by := auth.uid();
    NEW.disbursed_at := now();
  END IF;

  IF NEW.status = 'admin_approved' AND OLD.status = 'pending_admin' THEN
    IF actor_role NOT IN ('admin', 'company_management') THEN
      RAISE EXCEPTION 'ACCÈS REFUSÉ: Seule la Direction peut approuver une DRI.';
    END IF;
    NEW.admin_validated_by := auth.uid();
    NEW.admin_validated_at := now();
  END IF;

  IF NEW.status = 'received' AND OLD.status IN ('purchased', 'disbursed') THEN
    NEW.received_by := auth.uid();
    NEW.received_at := now();
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_disbursement_sod ON public.material_requisitions;
CREATE TRIGGER trg_enforce_disbursement_sod
  BEFORE UPDATE ON public.material_requisitions
  FOR EACH ROW EXECUTE FUNCTION public.fn_enforce_disbursement_sod();
      `
    },
  ];

  let success = 0;
  let failed = 0;

  for (const step of steps) {
    const ok = await runSQL(step.sql, step.label);
    if (ok) success++; else failed++;
    await new Promise(r => setTimeout(r, 350));
  }

  console.log('\n═══════════════════════════════════════════════');
  console.log(`✅ Migration terminée: ${success} succès / ${failed} échecs`);
  console.log('═══════════════════════════════════════════════\n');
  if (failed > 0) process.exit(1);
  else console.log('🎉 Base de données Phase 2 prête !');
}

migrate().catch(err => {
  console.error('💥 Erreur fatale:', err);
  process.exit(1);
});
