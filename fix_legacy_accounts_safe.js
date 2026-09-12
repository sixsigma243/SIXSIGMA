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
  console.log('=== REMISE EN ÉTAT SÉCURISÉE SANS ALTÉRATION DES MOTS DE PASSE ===\n');

  // Requête SQL de synchronisation sûre
  // Note architecturale importante :
  // Dans PostgreSQL / Supabase, 'confirmed_at' est une colonne générée (attgenerated = 's').
  // Tenter de lui assigner une valeur provoque l'erreur 428C9.
  // Mettre à jour 'email_confirmed_at' recalcule automatiquement 'confirmed_at'.
  // De plus, 'encrypted_password' est ABSOLUMENT INTACT pour préserver tous les mots de passe d'origine.
  const safeSql = `
DO $$ 
DECLARE   
  r RECORD; 
BEGIN   
  -- 1. Réparer auth.users SANS TOUCHER AU MOT DE PASSE (encrypted_password STRICTEMENT INTACT)
  -- On nettoie uniquement les tokens NULL pour éviter le bug de scan GoTrue
  UPDATE auth.users   
  SET      
    confirmation_token = COALESCE(confirmation_token, ''),     
    recovery_token = COALESCE(recovery_token, ''),     
    email_change_token_new = COALESCE(email_change_token_new, ''),     
    email_change = COALESCE(email_change, ''),     
    phone_change = COALESCE(phone_change, ''),     
    phone_change_token = COALESCE(phone_change_token, ''),     
    reauthentication_token = COALESCE(reauthentication_token, ''),     
    email_change_token_current = COALESCE(email_change_token_current, ''),     
    email_confirmed_at = COALESCE(email_confirmed_at, now()),     
    raw_app_meta_data = COALESCE(raw_app_meta_data, '{"provider":"email","providers":["email"]}'::jsonb),     
    updated_at = now()   
  WHERE confirmation_token IS NULL       
     OR recovery_token IS NULL       
     OR email_change_token_new IS NULL      
     OR email_confirmed_at IS NULL;    

  -- 2. Synchroniser auth.identities UNIQUEMENT pour les comptes où elle est manquante ou désynchronisée   
  FOR r IN      
    SELECT u.id, u.email      
    FROM auth.users u     
    LEFT JOIN auth.identities i ON i.user_id = u.id AND i.provider = 'email'     
    WHERE i.id IS NULL OR i.provider_id != lower(u.email)   
  LOOP     
    -- Nettoyer d'éventuels doublons orphelins     
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

  -- 3. Compléter les champs manquants dans public.profiles pour tous les comptes anciens   
  -- Sans écraser leurs rôles, noms ou paramètres existants   
  UPDATE public.profiles p   
  SET      
    is_active = COALESCE(p.is_active, true),     
    contract_type = COALESCE(p.contract_type, 'CDI'),     
    contract_end_date = COALESCE(p.contract_end_date, CURRENT_DATE + interval '1 year'),     
    id_expiry_date = COALESCE(p.id_expiry_date, CURRENT_DATE + interval '2 years'),     
    base_salary = COALESCE(p.base_salary, 0),     
    daily_rate = COALESCE(p.daily_rate, 0),     
    trade_category = COALESCE(p.trade_category, 'Cadre / Direction'),     
    sub_role = COALESCE(p.sub_role, 'Administration Générale'),     
    job_title = COALESCE(p.job_title, 'Collaborateur SIX SIGMA')   
  WHERE p.contract_type IS NULL       
     OR p.contract_end_date IS NULL       
     OR p.base_salary IS NULL;    

  -- 4. Pour le compte spécifique 'c.kafwimbi@sixsigma.cd' s'il a besoin d'un mot de passe dédié   
  -- Vérifier s'il existe dans public.profiles, et s'assurer que son profil est complet   
  INSERT INTO public.profiles (     
    id, email, full_name, role, sub_role, job_title, is_active, contract_type   
  )   
  SELECT      
    u.id,      
    u.email,      
    COALESCE(u.raw_user_meta_data->>'full_name', 'C. Kafwimbi'),      
    'hr_officer'::public.user_role,      
    'Ressources Humaines',      
    'Responsable RH',      
    true,      
    'CDI'   
  FROM auth.users u   
  WHERE u.email = 'c.kafwimbi@sixsigma.cd'     
    AND NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = u.id)   
  ON CONFLICT (id) DO NOTHING;  

  -- Harmonisation des intitulés pour les postes de direction et RH existants
  UPDATE public.profiles
  SET 
    sub_role = COALESCE(sub_role, 'Ressources Humaines'),
    job_title = COALESCE(job_title, 'Responsable RH')
  WHERE email = 'c.kafwimbi@sixsigma.cd';

  UPDATE public.profiles
  SET 
    sub_role = COALESCE(sub_role, 'Direction Générale'),
    job_title = COALESCE(job_title, 'Directeur Général')
  WHERE email = 'elyseemudimbi@sixsigma.cd';

END $$;
`;

  console.log('Exécution de la synchronisation sécurisée sur Supabase...');
  const res = await runQuery(safeSql);
  if (res && (res.error || res.message)) {
    console.error('Erreur SQL :', res.error || res.message);
    process.exit(1);
  }
  console.log('✓ Synchronisation exécutée avec succès (encrypted_password laissé 100% intact).\n');

  // Vérification de l'état des profils clés
  const checkSql = `
    SELECT 
      p.id, 
      p.email, 
      p.full_name, 
      p.role, 
      p.job_title, 
      p.sub_role,
      p.contract_type,
      p.is_active,
      i.provider_id,
      substring(u.encrypted_password from 1 for 7) as pwd_prefix
    FROM public.profiles p
    JOIN auth.users u ON u.id = p.id
    LEFT JOIN auth.identities i ON i.user_id = p.id
    WHERE p.email IN (
      'elyseemudimbi@sixsigma.cd',
      'c.kafwimbi@sixsigma.cd',
      'aaron.kabeya@sixsigma.cd',
      'thoms.ntambwe@sixsigma.cd',
      'alliance.mwape@sixsigma.cd'
    )
    ORDER BY p.role, p.email;
  `;

  const report = await runQuery(checkSql);
  console.log('=== RAPPORT DE CONTRÔLE DES COMPTES VÉRIFIÉS ===');
  console.table(report);

  console.log('\n=== OPÉRATION TERMINÉE SANS AUCUNE MODIFICATION DE MOTS DE PASSE ===');
}

main().catch(err => {
  console.error('Erreur fatale :', err);
  process.exit(1);
});
