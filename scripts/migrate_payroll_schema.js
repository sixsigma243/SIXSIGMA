const fs = require('fs');
const path = require('path');

let token = process.env.SUPABASE_ACCESS_TOKEN;
const envPath = fs.existsSync('.env.local') ? '.env.local' : path.resolve(__dirname, '../.env.local');
if (!token && fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  const match = envContent.match(/SUPABASE_ACCESS_TOKEN=(.+)/);
  if (match) token = match[1].trim();
}

async function runQuery(sql, name) {
  console.log(`Exécution: ${name}...`);
  const response = await fetch('https://api.supabase.com/v1/projects/tulxrodafhodmxcftpfr/database/query', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ query: sql })
  });

  const result = await response.json();
  if (!response.ok || (result && result.message && result.message.startsWith('Failed to run sql query'))) {
    console.error(`Erreur sur ${name}:`, result);
    throw new Error(result.message || 'Error');
  }
  console.log(`✓ ${name} réussi !`);
  return result;
}

async function main() {
  const step1 = `
    ALTER TABLE public.payroll_items 
    ADD COLUMN IF NOT EXISTS calculation_mode text DEFAULT 'monthly_fixed',
    ADD COLUMN IF NOT EXISTS absence_days integer DEFAULT 0,
    ADD COLUMN IF NOT EXISTS notes text;
  `;
  await runQuery(step1, 'Ajout des colonnes calculation_mode, absence_days, notes sur payroll_items');

  const step2 = `
    DO $DO$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'payroll_items_period_profile_unique'
      ) THEN
        ALTER TABLE public.payroll_items ADD CONSTRAINT payroll_items_period_profile_unique UNIQUE (period_id, profile_id);
      END IF;
    END $DO$;
  `;
  await runQuery(step2, 'Contrainte unique (period_id, profile_id)');

  // Initialisation d'une première période de paie si aucune n'existe (ex: Septembre 2026)
  const step3 = `
    INSERT INTO public.payroll_periods (
      id,
      period_name,
      start_date,
      end_date,
      is_locked,
      currency,
      status,
      created_at
    )
    SELECT 
      gen_random_uuid(),
      'Septembre 2026',
      '2026-09-01',
      '2026-09-30',
      false,
      'USD',
      'draft',
      now()
    WHERE NOT EXISTS (
      SELECT 1 FROM public.payroll_periods WHERE period_name = 'Septembre 2026'
    );
  `;
  await runQuery(step3, 'Période initiale Septembre 2026');

  console.log('\n=== MIGRATION PAYROLL COMPLÉTÉE AVEC SUCCÈS ===');
}

main().catch(console.error);
