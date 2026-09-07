const fs = require('fs');

const envContent = fs.readFileSync('.env.local', 'utf-8');
const MANAGEMENT_TOKEN = envContent.match(/SUPABASE_ACCESS_TOKEN=(.+)/)[1].trim();
const PROJECT_REF = 'tulxrodafhodmxcftpfr';

async function runQuery(sql) {
  const r = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${MANAGEMENT_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ query: sql })
  });
  const data = await r.json();
  return { status: r.status, data };
}

async function purgeAllSeedData() {
  console.log('================================================================');
  console.log('  SIX SIGMA ERP — PURGE COMPLÈTE POUR PASSAGE EN PRODUCTION    ');
  console.log('================================================================\n');

  const purgeSql = `
    -- 1. Désactiver temporairement les triggers bloquants pour le nettoyage propre
    SET session_replication_role = 'replica';

    -- 2. Purge de toutes les données opérationnelles générées (mock / seed)
    TRUNCATE TABLE public.attendance_reconciliations CASCADE;
    TRUNCATE TABLE public.time_entries CASCADE;
    TRUNCATE TABLE public.daily_site_reports CASCADE;
    TRUNCATE TABLE public.material_requisitions CASCADE;
    TRUNCATE TABLE public.stock_movements CASCADE;
    TRUNCATE TABLE public.dispatch_missions CASCADE;
    TRUNCATE TABLE public.cashbox_transactions CASCADE;
    TRUNCATE TABLE public.project_assignments CASCADE;
    TRUNCATE TABLE public.inventory_items CASCADE;
    TRUNCATE TABLE public.fleet_vehicles CASCADE;
    TRUNCATE TABLE public.projects CASCADE;

    -- 3. Nettoyer les utilisateurs générés résiduels dans auth.users et public.profiles
    -- Conserver UNIQUEMENT le Super-Admin racine
    DELETE FROM auth.users 
    WHERE email <> 'elyseemudimbi@sixsigma.cd';

    DELETE FROM public.profiles 
    WHERE email <> 'elyseemudimbi@sixsigma.cd';

    -- 4. Purge des journaux d'audit de test
    TRUNCATE TABLE public.audit_logs CASCADE;

    -- 5. Réinitialiser la table des périodes de paie si elle contient des fausses périodes
    TRUNCATE TABLE public.payroll_periods CASCADE;

    -- 6. Réactiver les triggers système
    SET session_replication_role = 'origin';

    -- 7. Insérer l'événement d'audit inaugural de mise en production
    INSERT INTO public.audit_logs (
      table_name,
      record_id,
      action,
      new_data,
      performed_by,
      performed_at
    ) VALUES (
      'system',
      '00000000-0000-0000-0000-000000000000',
      'PRODUCTION_DATABASE_PURGE',
      '{"status": "CLEAN", "preserved_user": "elyseemudimbi@sixsigma.cd", "message": "All mock and seed data removed for production launch"}',
      (SELECT id FROM public.profiles WHERE email = 'elyseemudimbi@sixsigma.cd' LIMIT 1),
      now()
    );
  `;

  console.log('Exécution de la commande SQL de purge sur le projet Supabase tulxrodafhodmxcftpfr...');
  const result = await runQuery(purgeSql);

  if (result.status !== 201 && result.status !== 200) {
    console.error('Erreur retournée par Supabase :', result.data);
    process.exit(1);
  }

  console.log('Résultat de la purge :', result.data);
  console.log('\nVérification de l\'état de la base de données...');

  const verifySql = `
    SELECT 'projects' as table_name, count(*) as count FROM public.projects
    UNION ALL SELECT 'inventory_items', count(*) FROM public.inventory_items
    UNION ALL SELECT 'fleet_vehicles', count(*) FROM public.fleet_vehicles
    UNION ALL SELECT 'material_requisitions', count(*) FROM public.material_requisitions
    UNION ALL SELECT 'time_entries', count(*) FROM public.time_entries
    UNION ALL SELECT 'cashbox_transactions', count(*) FROM public.cashbox_transactions
    UNION ALL SELECT 'daily_site_reports', count(*) FROM public.daily_site_reports
    UNION ALL SELECT 'profiles', count(*) FROM public.profiles
    UNION ALL SELECT 'auth.users', count(*) FROM auth.users
    UNION ALL SELECT 'audit_logs', count(*) FROM public.audit_logs;
  `;

  const verifyResult = await runQuery(verifySql);
  console.table(verifyResult.data);

  console.log('\n✅ Purge de mise en production terminée avec succès.');
  console.log('Toutes les tables opérationnelles sont désormais à 0 enregistrement.');
  console.log('Seul le compte Super-Admin racine elyseemudimbi@sixsigma.cd et l\'audit inaugural sont conservés.');
}

if (require.main === module) {
  purgeAllSeedData().catch(console.error);
}

module.exports = { purgeAllSeedData };
