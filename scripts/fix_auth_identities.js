const fs = require('fs');
const path = require('path');

let MANAGEMENT_TOKEN = process.env.SUPABASE_ACCESS_TOKEN;
let SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://tulxrodafhodmxcftpfr.supabase.co';
let SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const envPath = fs.existsSync('.env.local') ? '.env.local' : path.resolve(__dirname, '../.env.local');

if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  const tokenMatch = envContent.match(/SUPABASE_ACCESS_TOKEN=(.+)/);
  if (tokenMatch && !MANAGEMENT_TOKEN) MANAGEMENT_TOKEN = tokenMatch[1].trim();

  const urlMatch = envContent.match(/NEXT_PUBLIC_SUPABASE_URL=(.+)/);
  if (urlMatch) SUPABASE_URL = urlMatch[1].trim();

  const anonMatch = envContent.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.+)/);
  if (anonMatch) SUPABASE_ANON_KEY = anonMatch[1].trim();
}

const DB_QUERY_URL = `https://api.supabase.com/v1/projects/tulxrodafhodmxcftpfr/database/query`;

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
  console.log('=== SYNCHRONISATION AUTHENTIFICATION (GoTrue / Supabase) ===\n');

  const fixSql = `
DO $$ 
DECLARE   
  r RECORD;   
  pwd_hash text; 
BEGIN   
  -- Hachage standard bcrypt (cost factor 10) attendu par GoTrue
  pwd_hash := crypt('Sixsigma2026!', gen_salt('bf', 10));    

  FOR r IN      
    SELECT u.id, u.email      
    FROM auth.users u     
    JOIN public.profiles p ON p.id = u.id     
    WHERE p.role != 'worker' -- Uniquement les encadrants, chefs d'équipe et staff avec accès ERP
  LOOP     
    -- 1. Mise à jour du mot de passe, confirmation immédiate et initialisation des tokens attendus par GoTrue
    UPDATE auth.users     
    SET encrypted_password = pwd_hash,         
        email_confirmed_at = COALESCE(email_confirmed_at, now()),
        confirmation_token = COALESCE(confirmation_token, ''),
        recovery_token = COALESCE(recovery_token, ''),
        email_change_token_new = COALESCE(email_change_token_new, ''),
        email_change = COALESCE(email_change, ''),
        phone_change = COALESCE(phone_change, ''),
        phone_change_token = COALESCE(phone_change_token, ''),
        reauthentication_token = COALESCE(reauthentication_token, ''),
        email_change_token_current = COALESCE(email_change_token_current, ''),
        updated_at = now()     
    WHERE id = r.id;      

    -- 2. Création ou resynchronisation de l'identité GoTrue obligatoire
    DELETE FROM auth.identities WHERE user_id = r.id;

    INSERT INTO auth.identities (       
      id,       
      user_id,       
      identity_data,       
      provider,       
      provider_id,       
      last_sign_in_at,       
      created_at,       
      updated_at     
    ) VALUES (       
      r.id,       
      r.id,       
      json_build_object('sub', r.id::text, 'email', lower(r.email)),       
      'email',       
      lower(r.email),       
      now(),       
      now(),       
      now()     
    )     
    ON CONFLICT (provider, provider_id) DO UPDATE SET       
      identity_data = EXCLUDED.identity_data,       
      updated_at = now();   
  END LOOP; 
END $$;
`;

  console.log('Exécution de la synchronisation SQL dans Supabase...');
  const res = await runQuery(fixSql);
  if (res && (res.error || res.message)) {
    console.error('Erreur SQL :', res.error || res.message);
    process.exit(1);
  }
  console.log('✓ Synchronisation SQL exécutée avec succès dans auth.users et auth.identities.');

  // Rapport de vérification des comptes cadres et staff
  const checkSql = `
    SELECT u.id, u.email, p.role, p.job_title,
           substring(u.encrypted_password from 1 for 7) as bcrypt_prefix,
           i.provider, i.provider_id
    FROM auth.users u
    JOIN public.profiles p ON p.id = u.id
    JOIN auth.identities i ON i.user_id = u.id
    WHERE p.role != 'worker'
    ORDER BY p.role, u.email;
  `;
  const report = await runQuery(checkSql);
  console.log(`\n=== RAPPORT DES IDENTITÉS SYNCHRONISÉES (${report.length} comptes staff actifs) ===`);
  console.table(report);

  // Tests d'authentification réels sur l'API GoTrue
  console.log('\n=== VALIDATION DES CONNEXIONS SUR L API GOTRUE (/auth/v1/token) ===');
  const testUsers = [
    { email: 'aaron.kabeya@sixsigma.cd', role: "Chef d'Équipe" },
    { email: 'thoms.ntambwe@sixsigma.cd', role: 'Site Manager / Conducteur' },
    { email: 'alliance.mwape@sixsigma.cd', role: 'Admin Chantier' },
    { email: 'c.kafwimbi@sixsigma.cd', role: 'Responsable RH' },
    { email: 'dieumerci.banze@sixsigma.cd', role: 'Responsable HSE' },
    { email: 'david.kaimbo@sixsigma.cd', role: 'Magasinier' },
    { email: 'emanuel.kalume@sixsigma.cd', role: 'Agent Dispatch' },
    { email: 'valentin.luakila@sixsigma.cd', role: "Chef d'Équipe" }
  ];

  let successCount = 0;
  for (const tu of testUsers) {
    const authRes = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: tu.email,
        password: 'Sixsigma2026!'
      })
    });

    const authData = await authRes.json();
    if (authData.access_token) {
      console.log(`✓ SUCCÈS [${tu.role}] : ${tu.email} -> Token JWT délivré (ID: ${authData.user.id})`);
      successCount++;
    } else {
      console.error(`✗ ÉCHEC [${tu.role}] pour ${tu.email} :`, authData);
    }
  }

  console.log(`\n=== RÉSULTAT : ${successCount}/${testUsers.length} tests de connexion réussis ===`);
}

main().catch(err => {
  console.error('Erreur inattendue :', err);
  process.exit(1);
});
