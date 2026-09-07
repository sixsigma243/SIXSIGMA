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
  console.log('Seeding Buyer role and DRC Mining/BTP projects...');

  // 1. Create or ensure buyer user in Supabase Auth
  const buyerUser = {
    email: 'buyer@sixsigma.cd',
    password: 'SixSigma2026!',
    full_name: 'Olivier Malela',
    first_name: 'Olivier',
    last_name: 'Malela',
    role: 'buyer',
    phone: '+243 81 000 0014'
  };

  const res = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
    method: 'POST',
    headers: {
      'apikey': SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      email: buyerUser.email,
      password: buyerUser.password,
      email_confirm: true,
      user_metadata: {
        full_name: buyerUser.full_name,
        first_name: buyerUser.first_name,
        last_name: buyerUser.last_name,
        role: buyerUser.role
      }
    })
  });

  let buyerId;
  if (res.ok) {
    const data = await res.json();
    buyerId = data.id;
    console.log(`Created Buyer auth user: ${buyerId}`);
  } else {
    // Already exists or fetch id
    const lookup = await runQuery(`SELECT id FROM auth.users WHERE email = '${buyerUser.email}' LIMIT 1;`);
    if (lookup && lookup[0]) {
      buyerId = lookup[0].id;
      console.log(`Found existing Buyer auth user: ${buyerId}`);
    }
  }

  if (buyerId) {
    await runQuery(`
      INSERT INTO public.profiles (id, email, full_name, first_name, last_name, phone, role)
      VALUES ('${buyerId}', '${buyerUser.email}', '${buyerUser.full_name}', '${buyerUser.first_name}', '${buyerUser.last_name}', '${buyerUser.phone}', 'buyer')
      ON CONFLICT (id) DO UPDATE SET
        full_name = EXCLUDED.full_name,
        role = 'buyer',
        phone = EXCLUDED.phone;
    `);
  }

  // 2. Update projects to real DRC sites
  console.log('Updating DRC Projects (Fungurume, Kolwezi, Lubumbashi, Kinshasa)...');
  const drcProjectsSql = `
    INSERT INTO public.projects (id, code, title, client_name, location, budget, currency, status, start_date, end_date, description)
    VALUES
      ('22222222-2222-4222-8222-222222222201', 'PRJ-2026-001', 'Plateforme Logistique & Terrassement TFM', 'Tenke Fungurume Mining (TFM)', 'Lualaba - Fungurume', 1850000.00, 'USD', 'in_progress', '2026-01-10', '2026-12-15', 'Terrassement lourd de 45 000 m², plateforme de concassage et voirie d''accès aux carrières minières.'),
      ('22222222-2222-4222-8222-222222222202', 'PRJ-2026-002', 'Construction Base-Vie & Ateliers Kamoa Copper', 'Kamoa Copper SA / Ivanhoe', 'Lualaba - Kolwezi', 2400000.00, 'USD', 'in_progress', '2026-02-01', '2026-11-30', 'Ouvrages de génie civil, dallages renforcés pour maintenance des engins de mine et modules d''hébergement.'),
      ('22222222-2222-4222-8222-222222222203', 'PRJ-2026-003', 'Réhabilitation Voirie Boulevard M''siri & Ouvrages', 'Gouvernorat du Haut-Katanga', 'Lubumbashi - Centre', 950000.00, 'USD', 'in_progress', '2026-03-01', '2026-09-30', 'Réfection de 4.2 km de chaussée lourde avec pose d''enrobés à chaud et canalisations béton armé.'),
      ('22222222-2222-4222-8222-222222222204', 'PRJ-2026-004', 'Construction Pont & Ouvrages Fluviaux Nsele', 'Ministère des ITPR / ACGT', 'Kinshasa - Nsele', 1450000.00, 'USD', 'in_progress', '2026-01-15', '2026-10-31', 'Ouvrage d''art mixte béton armé et tablier métallique pour franchissement fluvial.')
    ON CONFLICT (id) DO UPDATE SET
      title = EXCLUDED.title,
      client_name = EXCLUDED.client_name,
      location = EXCLUDED.location,
      budget = EXCLUDED.budget,
      description = EXCLUDED.description;
  `;
  await runQuery(drcProjectsSql);

  // 3. Seed Attendance Reconciliations
  console.log('Seeding Attendance Reconciliations (Team Leader vs Pointeur)...');
  await runQuery(`
    DELETE FROM public.attendance_reconciliations;
    INSERT INTO public.attendance_reconciliations (project_id, worker_name, worker_function, reconciliation_date, team_leader_status, pointer_status, status, notes)
    VALUES
      (
        '22222222-2222-4222-8222-222222222201',
        'Kikuni Mukendi',
        'Ferrailleur principal',
        CURRENT_DATE,
        'present',
        'absent',
        'pending',
        'Présence physique confirmée sur le coulage pile P2 par Alain Mbuyi (Team Leader) mais badge non scanné à la guérite principale (oubli de badge).'
      ),
      (
        '22222222-2222-4222-8222-222222222202',
        'Tshibangu Patient',
        'Opérateur compacteur',
        CURRENT_DATE,
        'late',
        'present',
        'pending',
        'Badgé à 07h15 au portail de la base-vie mais arrivé sur la zone d''excavation PK 1+200 à 08h30 sans justificatif.'
      ),
      (
        '22222222-2222-4222-8222-222222222201',
        'Lutumba Roger',
        'Soudeur qualifié TIG',
        CURRENT_DATE,
        'present',
        'leave',
        'pending',
        'Congé annuel enregistré en RH mais l''ouvrier a été rappelé en urgence sur le chantier pour la soudure de la culée métallique.'
      );
  `);

  console.log('Seed V2 successfully completed!');
}

main().catch(console.error);
