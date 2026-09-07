const fs = require('fs');

let SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
let MANAGEMENT_TOKEN = process.env.SUPABASE_ACCESS_TOKEN;
let SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://tulxrodafhodmxcftpfr.supabase.co';

if ((!SERVICE_ROLE_KEY || !MANAGEMENT_TOKEN) && fs.existsSync('.env.local')) {
  const envContent = fs.readFileSync('.env.local', 'utf-8');
  const srMatch = envContent.match(/SUPABASE_SERVICE_ROLE_KEY=(.+)/);
  if (srMatch && !SERVICE_ROLE_KEY) SERVICE_ROLE_KEY = srMatch[1].trim();
  const tokenMatch = envContent.match(/SUPABASE_ACCESS_TOKEN=(.+)/);
  if (tokenMatch && !MANAGEMENT_TOKEN) MANAGEMENT_TOKEN = tokenMatch[1].trim();
  const urlMatch = envContent.match(/NEXT_PUBLIC_SUPABASE_URL=(.+)/);
  if (urlMatch) SUPABASE_URL = urlMatch[1].trim();
}

const DB_QUERY_URL = `https://api.supabase.com/v1/projects/${process.env.SUPABASE_PROJECT_REF || 'tulxrodafhodmxcftpfr'}/database/query`;

const usersToSeed = [
  {
    email: 'admin@sixsigma.cd',
    full_name: 'Fabrice Mukendi',
    first_name: 'Fabrice',
    last_name: 'Mukendi',
    role: 'admin',
    phone: '+243 81 000 0001'
  },
  {
    email: 'direction@sixsigma.cd',
    full_name: 'Patrick Kalala (DG)',
    first_name: 'Patrick',
    last_name: 'Kalala',
    role: 'company_management',
    phone: '+243 81 000 0002'
  },
  {
    email: 'conducteur.travaux@sixsigma.cd',
    full_name: 'Ing. Michel Tshilombo',
    first_name: 'Michel',
    last_name: 'Tshilombo',
    role: 'site_manager',
    phone: '+243 81 000 0003'
  },
  {
    email: 'chef.chantier@sixsigma.cd',
    full_name: 'Dieudonné Kasongo',
    first_name: 'Dieudonné',
    last_name: 'Kasongo',
    role: 'supervisor',
    phone: '+243 81 000 0004'
  },
  {
    email: 'chef.equipe@sixsigma.cd',
    full_name: 'Alain Mbuyi',
    first_name: 'Alain',
    last_name: 'Mbuyi',
    role: 'team_leader',
    phone: '+243 81 000 0005'
  },
  {
    email: 'rh@sixsigma.cd',
    full_name: 'Nathalie Kapinga',
    first_name: 'Nathalie',
    last_name: 'Kapinga',
    role: 'hr_officer',
    sub_role: 'payroll',
    phone: '+243 81 000 0006'
  },
  {
    email: 'compta@sixsigma.cd',
    full_name: 'Serge Ilunga',
    first_name: 'Serge',
    last_name: 'Ilunga',
    role: 'accountant',
    phone: '+243 81 000 0007'
  },
  {
    email: 'magasinier@sixsigma.cd',
    full_name: 'Junior Kabeya',
    first_name: 'Junior',
    last_name: 'Kabeya',
    role: 'warehouse_keeper',
    phone: '+243 81 000 0008'
  },
  {
    email: 'intendance@sixsigma.cd',
    full_name: 'Béatrice Mwamba',
    first_name: 'Béatrice',
    last_name: 'Mwamba',
    role: 'stewardship',
    phone: '+243 81 000 0009'
  },
  {
    email: 'mecanique@sixsigma.cd',
    full_name: 'David Lubamba',
    first_name: 'David',
    last_name: 'Lubamba',
    role: 'mechanic',
    phone: '+243 81 000 0010'
  },
  {
    email: 'dispatch@sixsigma.cd',
    full_name: 'Gaston Banza',
    first_name: 'Gaston',
    last_name: 'Banza',
    role: 'dispatch',
    phone: '+243 81 000 0011'
  },
  {
    email: 'qhse@sixsigma.cd',
    full_name: 'Sandrine Luvualu',
    first_name: 'Sandrine',
    last_name: 'Luvualu',
    role: 'safety_officer',
    phone: '+243 81 000 0012'
  },
  {
    email: 'commercial@sixsigma.cd',
    full_name: 'Eric Mulamba',
    first_name: 'Eric',
    last_name: 'Mulamba',
    role: 'commercial',
    phone: '+243 81 000 0013'
  }
];

async function runQuery(sql) {
  const r = await fetch(DB_QUERY_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${MANAGEMENT_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ query: sql })
  });
  return r.json();
}

async function main() {
  console.log('Cleaning existing test users...');
  await runQuery(`
    TRUNCATE public.project_assignments, public.daily_site_reports, public.time_entries,
             public.material_requisitions, public.dispatch_missions, public.cashbox_transactions CASCADE;
    DELETE FROM auth.users;
    DELETE FROM public.profiles;
  `);

  console.log('Creating auth users via Supabase Admin API...');
  const createdProfiles = {};

  for (const u of usersToSeed) {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
      method: 'POST',
      headers: {
        'apikey': SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: u.email,
        password: 'SixSigma2026!',
        email_confirm: true,
        user_metadata: {
          full_name: u.full_name,
          first_name: u.first_name,
          last_name: u.last_name,
          role: u.role,
          sub_role: u.sub_role || null
        }
      })
    });

    const data = await res.json();
    if (!res.ok) {
      console.error(`Failed to create ${u.email}:`, data);
      continue;
    }

    createdProfiles[u.role] = { id: data.id, ...u };
    console.log(`Created ${u.email} -> ${data.id} (${u.role})`);

    // Ensure profile has phone and sub_role
    await runQuery(`
      UPDATE public.profiles
      SET phone = '${u.phone}', sub_role = ${u.sub_role ? `'${u.sub_role}'` : 'NULL'}
      WHERE id = '${data.id}';
    `);
  }

  const siteManagerId = createdProfiles['site_manager']?.id;
  const supervisorId = createdProfiles['supervisor']?.id;
  const teamLeaderId = createdProfiles['team_leader']?.id;
  const accountantId = createdProfiles['accountant']?.id;
  const managementId = createdProfiles['company_management']?.id;

  console.log('Seeding relational BTP project data...');

  const projectsSql = `
    INSERT INTO public.projects (id, code, title, client_name, location, budget, currency, site_manager_id, status, start_date, end_date, description)
    VALUES
      ('22222222-2222-4222-8222-222222222201', 'PRJ-2026-001', 'Construction Pont & Ouvrages Hydrauliques Nsele', 'Ministère des ITPR / ACGT', 'Kinshasa - Nsele', 1450000.00, 'USD', '${siteManagerId}', 'in_progress', '2026-01-15', '2026-11-30', 'Ouvrage d''art mixte béton armé et tablier métallique pour franchissement fluvial.'),
      ('22222222-2222-4222-8222-222222222202', 'PRJ-2026-002', 'Aménagement & Voirie Urbaine Gombe', 'Hôtel de Ville de Kinshasa', 'Kinshasa - Gombe', 820000.00, 'USD', '${siteManagerId}', 'in_progress', '2026-02-01', '2026-08-30', 'Réfection de 3.8 km de voiries avec caniveaux bétonnés et pose de pavés autobloquants.'),
      ('22222222-2222-4222-8222-222222222203', 'PRJ-2026-003', 'Hangar Industriel & Charpente Métallique Maluku', 'Société Industrielle Agro-BTP', 'Kinshasa - Maluku', 540000.00, 'USD', '${siteManagerId}', 'in_progress', '2026-03-10', '2026-10-15', 'Structure métallique en IPE/HEA portée 30m avec bardage bac alu et dallage lourd.')
    ON CONFLICT (id) DO UPDATE SET site_manager_id = EXCLUDED.site_manager_id;

    INSERT INTO public.project_assignments (project_id, supervisor_id, team_leader_id)
    VALUES
      ('22222222-2222-4222-8222-222222222201', '${supervisorId}', '${teamLeaderId}'),
      ('22222222-2222-4222-8222-222222222202', '${supervisorId}', '${teamLeaderId}')
    ON CONFLICT DO NOTHING;

    INSERT INTO public.daily_site_reports (project_id, supervisor_id, report_date, weather, workforce_count, activities_summary, issues_and_delays, safety_observations, status, validated_by, validation_notes, validated_at)
    VALUES
      ('22222222-2222-4222-8222-222222222201', '${supervisorId}', CURRENT_DATE, 'Ensoleillé (31°C)', 34, 'Coulage du béton de propreté sur la pile P2. Ferraillage de la culée rive droite terminé à 100%. Réception des armatures Ø16mm.', 'Léger retard de 45 minutes sur la livraison de la toupie à béton en raison des embouteillages Boulevard Lumumba.', 'Quart d''heure de sécurité QHSE tenu à 07h30. Port des harnais vérifié pour les travaux sur échafaudages.', 'submitted', NULL, NULL, NULL),
      ('22222222-2222-4222-8222-222222222202', '${supervisorId}', CURRENT_DATE - INTERVAL '1 day', 'Nuageux avec éclaircies', 22, 'Terrassement de la plateforme PK 1+200 à 1+600. Pose des bordures T2 sur 150 mètres linéaires.', 'Aucun incident majeur.', 'Balisage de la zone de chantier conforme et signaleurs présents.', 'validated', '${siteManagerId}', 'Travaux conformes au planning. Continuer le compactage par couches successives.', now() - INTERVAL '12 hours')
    ON CONFLICT DO NOTHING;

    INSERT INTO public.time_entries (project_id, profile_id, worker_name, worker_function, entry_date, status, check_in, check_out, overtime_hours, supervisor_id, notes)
    VALUES
      ('22222222-2222-4222-8222-222222222201', NULL, 'Kabongo Mwamba', 'Ferrailleur principal', CURRENT_DATE, 'present', '07:30', '16:30', 1.5, '${supervisorId}', 'Heures sup pour finalisation ferraillage culée'),
      ('22222222-2222-4222-8222-222222222201', NULL, 'Kasalu Jean-Claude', 'Coffreur bois/métal', CURRENT_DATE, 'present', '07:25', '16:00', 1.0, '${supervisorId}', 'Montage coffrage pile P2'),
      ('22222222-2222-4222-8222-222222222201', NULL, 'Bokungu Eric', 'Opérateur grue / Grutier', CURRENT_DATE, 'present', '07:15', '16:00', 0.5, '${supervisorId}', 'Déchargement des fers et paniers d''armature'),
      ('22222222-2222-4222-8222-222222222201', NULL, 'Mbuyi Tshimanga', 'Manœuvre polyvalent', CURRENT_DATE, 'late', '08:15', '16:00', 0.0, '${supervisorId}', 'Arrivée 45 min retard suite panne taxi-bus'),
      ('22222222-2222-4222-8222-222222222201', NULL, 'Lutumba Roger', 'Soudeur qualifié TIG/Arc', CURRENT_DATE, 'present', '07:30', '16:00', 2.0, '${supervisorId}', 'Soudure des plaques d''ancrage métallique'),
      ('22222222-2222-4222-8222-222222222202', NULL, 'Banyingela Paul', 'Conducteur compacteur', CURRENT_DATE, 'present', '07:30', '16:00', 0.0, '${supervisorId}', 'Compactage plateforme')
    ON CONFLICT DO NOTHING;

    INSERT INTO public.material_requisitions (requisition_number, project_id, requested_by, site_manager_id, status, items, urgent, supervisor_comment, validation_comment, approved_at)
    VALUES
      ('DRI-2026-001', '22222222-2222-4222-8222-222222222201', '${supervisorId}', '${siteManagerId}', 'submitted', '[{"item_name":"Ciment Gris CPJ 42.5","quantity":200,"unit":"sac","justification":"Coulage massif pile P2 prévu ce jeudi"},{"item_name":"Gasoil Engins","quantity":500,"unit":"litre","justification":"Alimentation pelleteuse et groupe électrogène"}]'::jsonb, true, 'Urgent pour respecter la date de coulage du radier.', NULL, NULL),
      ('DRI-2026-002', '22222222-2222-4222-8222-222222222202', '${supervisorId}', '${siteManagerId}', 'site_manager_approved', '[{"item_name":"Bordures béton T2","quantity":300,"unit":"ml","justification":"Linéaire caniveaux tronçon 2"},{"item_name":"Gilet haute visibilité","quantity":15,"unit":"pièce","justification":"Renouvellement équipe voirie"}]'::jsonb, false, 'Demande de réapprovisionnement standard.', 'Validé après vérification du métré par Ing. Michel Tshilombo.', now() - INTERVAL '6 hours')
    ON CONFLICT (requisition_number) DO NOTHING;

    INSERT INTO public.cashbox_transactions (cashbox_type, project_id, transaction_type, amount, currency, exchange_rate, category, description, created_by, validated_by, requires_management_approval)
    VALUES
      ('site', '22222222-2222-4222-8222-222222222201', 'EXPENSE', 1250.00, 'USD', 2850.0, 'Pièces de rechange', 'Remplacement flexible hydraulique haute pression sur pelleteuse CAT 320', '${supervisorId}', '${siteManagerId}', false),
      ('site', '22222222-2222-4222-8222-222222222201', 'EXPENSE', 1425000.00, 'CDF', 2850.0, 'Main d''œuvre locale', 'Paie hebdomadaire de 10 manœuvres journaliers de Nsele (équiv. 500 USD)', '${supervisorId}', '${siteManagerId}', false),
      ('central', NULL, 'INCOME', 25000.00, 'USD', 2850.0, 'Acompte client', 'Encaissement acompte démarrage PRJ-2026-003 Charpente Maluku', '${accountantId}', '${managementId}', false),
      ('central', '22222222-2222-4222-8222-222222222201', 'EXPENSE', 7200.00, 'USD', 2850.0, 'Matériel lourd', 'Achat groupe électrogène insonorisé SDMO 100kVA pour centrale à béton', '${accountantId}', NULL, true);
  `;

  await runQuery(projectsSql);
  console.log('All users and relational seed data successfully created!');
}

main().catch(console.error);
