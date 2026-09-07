const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const envContent = fs.readFileSync('.env.local', 'utf-8');
const SUPABASE_URL = envContent.match(/NEXT_PUBLIC_SUPABASE_URL=(.+)/)[1].trim();
const SERVICE_ROLE_KEY = envContent.match(/SUPABASE_SERVICE_ROLE_KEY=(.+)/)[1].trim();
const MANAGEMENT_TOKEN = envContent.match(/SUPABASE_ACCESS_TOKEN=(.+)/)[1].trim();
const ANON_KEY = envContent.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.+)/)[1].trim();

async function runQuery(sql) {
  const r = await fetch('https://api.supabase.com/v1/projects/tulxrodafhodmxcftpfr/database/query', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${MANAGEMENT_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ query: sql })
  });
  return r.json();
}

async function cleanAndSeed() {
  console.log('--- SIX SIGMA ERP : Purge & Amorçage du Super-Admin Racine ---');

  // 1. Truncate transactional tables
  console.log('1. Nettoyage des tables transactionnelles et des anciens utilisateurs...');
  const cleanSql = `
    TRUNCATE TABLE public.attendance_reconciliations CASCADE;
    TRUNCATE TABLE public.time_entries CASCADE;
    TRUNCATE TABLE public.daily_site_reports CASCADE;
    TRUNCATE TABLE public.material_requisitions CASCADE;
    TRUNCATE TABLE public.stock_movements CASCADE;
    TRUNCATE TABLE public.dispatch_missions CASCADE;
    TRUNCATE TABLE public.cashbox_transactions CASCADE;
    TRUNCATE TABLE public.project_assignments CASCADE;

    DELETE FROM auth.identities;
    DELETE FROM auth.users;
    DELETE FROM public.profiles;
  `;
  await runQuery(cleanSql);

  // 2. Create the root Super-Admin via GoTrue Admin API
  console.log('2. Création du compte Super-Admin racine (elyseemudimbi@sixsigma.cd)...');
  const res = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
    method: 'POST',
    headers: {
      'apikey': SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      email: 'elyseemudimbi@sixsigma.cd',
      password: 'Elyseemud1',
      email_confirm: true,
      user_metadata: {
        first_name: 'Elysée',
        last_name: 'Mudimbi',
        full_name: 'Elysée Mudimbi',
        role: 'admin'
      }
    })
  });

  const createdUser = await res.json();
  if (!res.ok) {
    console.error('Erreur création admin:', createdUser);
    process.exit(1);
  }
  const rootAdminId = createdUser.id;
  console.log(`✅ Compte Super-Admin créé avec succès : ID=${rootAdminId}, Email=${createdUser.email}`);

  // 3. Update public.profiles & reference projects
  console.log('3. Mise à jour du profil racine et réinsertion des chantiers de référence RDC...');
  const setupSql = `
    UPDATE public.profiles
    SET first_name = 'Elysée',
        last_name = 'Mudimbi',
        full_name = 'Elysée Mudimbi',
        role = 'admin',
        is_active = true,
        contract_end_date = CURRENT_DATE + INTERVAL '5 years',
        id_expiry_date = CURRENT_DATE + INTERVAL '5 years'
    WHERE id = '${rootAdminId}';

    -- Insertion / Préservation des 4 chantiers majeurs de référence
    INSERT INTO public.projects (id, code, title, client_name, location, budget, currency, status, description)
    VALUES 
      ('11111111-1111-1111-1111-111111111111', 'PRJ-TFM-001', 'Plateforme Logistique TFM Fungurume', 'Tenke Fungurume Mining S.A.', 'Fungurume, Lualaba, RDC', 450000.00, 'USD', 'in_progress', 'Construction de voiries lourdes et plateforme logistique de stockage de réactifs miniers.')
    ON CONFLICT (id) DO UPDATE SET
      title = EXCLUDED.title,
      budget = EXCLUDED.budget;

    INSERT INTO public.projects (id, code, title, client_name, location, budget, currency, status, description)
    VALUES 
      ('22222222-2222-2222-2222-222222222222', 'PRJ-KM-002', 'Base-Vie Kamoa Kolwezi', 'Kamoa Copper S.A.', 'Kolwezi, Lualaba, RDC', 320000.00, 'USD', 'in_progress', 'Génie civil et structures métalliques pour les logements des cadres et cantine industrielle.')
    ON CONFLICT (id) DO UPDATE SET
      title = EXCLUDED.title,
      budget = EXCLUDED.budget;

    INSERT INTO public.projects (id, code, title, client_name, location, budget, currency, status, description)
    VALUES 
      ('33333333-3333-3333-3333-333333333333', 'PRJ-LSH-003', 'Voirie Urbaine Av. M''siri Lubumbashi', 'Hôtel de Ville de Lubumbashi', 'Lubumbashi, Haut-Katanga, RDC', 125000000.00, 'CDF', 'in_progress', 'Asphaltage, caniveaux de drainage et pose de bordures en béton armé.')
    ON CONFLICT (id) DO UPDATE SET
      title = EXCLUDED.title,
      budget = EXCLUDED.budget;

    INSERT INTO public.projects (id, code, title, client_name, location, budget, currency, status, description)
    VALUES 
      ('44444444-4444-4444-4444-444444444444', 'PRJ-KIN-004', 'Génie Civil Pont Nsele Kinshasa', 'Office des Routes / Min. ITP', 'Kinshasa / Maluku, RDC', 280000.00, 'USD', 'in_progress', 'Réhabilitation des culées et renforcement métallique de la structure portante.')
    ON CONFLICT (id) DO UPDATE SET
      title = EXCLUDED.title,
      budget = EXCLUDED.budget;

    -- Traçabilité audit
    INSERT INTO public.audit_logs (table_name, record_id, action, new_data, performed_by)
    VALUES (
      'profiles',
      '${rootAdminId}',
      'INITIALIZE_ROOT_SUPER_ADMIN',
      jsonb_build_object('email', 'elyseemudimbi@sixsigma.cd', 'role', 'admin', 'name', 'Elysée Mudimbi'),
      '${rootAdminId}'
    );
  `;
  await runQuery(setupSql);

  // 4. Test client authentication
  console.log('4. Vérification du flux d\'authentification avec le compte racine...');
  const supabase = createClient(SUPABASE_URL, ANON_KEY);
  const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
    email: 'elyseemudimbi@sixsigma.cd',
    password: 'Elyseemud1'
  });

  if (loginError) {
    console.error('❌ Échec du test d\'authentification:', loginError.message);
    process.exit(1);
  }

  console.log('🎉 AUTHENTIFICATION RÉUSSIE avec le compte racine :', {
    id: loginData.user.id,
    email: loginData.user.email,
    role: loginData.user.user_metadata.role
  });

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', loginData.user.id)
    .single();

  console.log('👤 Profil en base vérifié :', profile);
  console.log('✨ Opération de purge et d\'initialisation terminée avec 100% de succès !');
}

cleanAndSeed().catch(err => {
  console.error(err);
  process.exit(1);
});
