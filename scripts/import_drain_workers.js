const fs = require('fs');
const path = require('path');

const envPath = fs.existsSync('.env.local') ? '.env.local' : path.resolve(__dirname, '../.env.local');
const env = fs.readFileSync(envPath, 'utf-8');
const token = env.match(/SUPABASE_ACCESS_TOKEN=(.+)/)[1].trim();

const newWorkers = [
  // 1. MAÇONS (21)
  {"fn":"Josue","ln":"Kamanya Mutwamba","full":"KAMANYA MUTWAMBA JOSUE","role":"worker","sub":"Maçonnerie & Gros Œuvre","title":"Maçon","trade":"Maçon","rate":15,"salary":0,"ctype":"Journalier"},
  {"fn":"Billy","ln":"Katuka Tietie","full":"KATUKA TIETIE BILLY","role":"worker","sub":"Maçonnerie & Gros Œuvre","title":"Maçon","trade":"Maçon","rate":15,"salary":0,"ctype":"Journalier"},
  {"fn":"Chance","ln":"Nyembo Tshikwej","full":"NYEMBO TSHIKWEJ CHANCE","role":"worker","sub":"Maçonnerie & Gros Œuvre","title":"Maçon","trade":"Maçon","rate":15,"salary":0,"ctype":"Journalier"},
  {"fn":"Piere","ln":"Kamwanya Mwamba","full":"KAMWANYA MWAMBA PIERE","role":"worker","sub":"Maçonnerie & Gros Œuvre","title":"Maçon","trade":"Maçon","rate":15,"salary":0,"ctype":"Journalier"},
  {"fn":"Ibra","ln":"Mwema Mwimbi","full":"MWEMA MWIMBI IBRA","role":"worker","sub":"Maçonnerie & Gros Œuvre","title":"Maçon","trade":"Maçon","rate":15,"salary":0,"ctype":"Journalier"},
  {"fn":"Tshibez","ln":"Kanteng","full":"KANTENG TSHIBEZ","role":"worker","sub":"Maçonnerie & Gros Œuvre","title":"Maçon","trade":"Maçon","rate":15,"salary":0,"ctype":"Journalier"},
  {"fn":"Figo","ln":"Tshibangu Mutoka","full":"TSHIBANGU MUTOKA FIGO","role":"worker","sub":"Maçonnerie & Gros Œuvre","title":"Maçon","trade":"Maçon","rate":15,"salary":0,"ctype":"Journalier"},
  {"fn":"Gautier","ln":"Kanyinda Bukasa","full":"KANYINDA BUKASA GAUTIER","role":"worker","sub":"Maçonnerie & Gros Œuvre","title":"Maçon","trade":"Maçon","rate":15,"salary":0,"ctype":"Journalier"},
  {"fn":"Mario","ln":"Ngoy Mutshi","full":"NGOY MUTSHI MARIO","role":"worker","sub":"Maçonnerie & Gros Œuvre","title":"Maçon","trade":"Maçon","rate":15,"salary":0,"ctype":"Journalier"},
  {"fn":"Paty","ln":"Omba Mukiga","full":"OMBA MUKIGA PATY","role":"worker","sub":"Maçonnerie & Gros Œuvre","title":"Maçon","trade":"Maçon","rate":15,"salary":0,"ctype":"Journalier"},
  {"fn":"Mersegne","ln":"Kapafule Kyose","full":"KAPAFULE KYOSE MERSEGNE","role":"worker","sub":"Maçonnerie & Gros Œuvre","title":"Maçon","trade":"Maçon","rate":15,"salary":0,"ctype":"Journalier"},
  {"fn":"Alexis","ln":"Innabanza","full":"INNABANZA ALEXIS","role":"worker","sub":"Maçonnerie & Gros Œuvre","title":"Maçon","trade":"Maçon","rate":15,"salary":0,"ctype":"Journalier"},
  {"fn":"William","ln":"Ngoie Mwelwa","full":"NGOIE MWELWA WILLIAM","role":"worker","sub":"Maçonnerie & Gros Œuvre","title":"Maçon","trade":"Maçon","rate":15,"salary":0,"ctype":"Journalier"},
  {"fn":"Emma","ln":"Katunda Matanda","full":"KATUNDA MATANDA EMMA","role":"worker","sub":"Maçonnerie & Gros Œuvre","title":"Maçon","trade":"Maçon","rate":15,"salary":0,"ctype":"Journalier"},
  {"fn":"Dil","ln":"Mudahama Bisimwa","full":"MUDAHAMA BISIMWA DIL","role":"worker","sub":"Maçonnerie & Gros Œuvre","title":"Maçon","trade":"Maçon","rate":15,"salary":0,"ctype":"Journalier"},
  {"fn":"Mike","ln":"Kitenge Mbuya","full":"KITENGE MBUYA MIKE","role":"worker","sub":"Maçonnerie & Gros Œuvre","title":"Maçon","trade":"Maçon","rate":15,"salary":0,"ctype":"Journalier"},
  {"fn":"Jeanmarie","ln":"Mukeba Kalanda","full":"MUKEBA KALANDA JEANMARIE","role":"worker","sub":"Maçonnerie & Gros Œuvre","title":"Maçon","trade":"Maçon","rate":15,"salary":0,"ctype":"Journalier"},
  {"fn":"Jams","ln":"Kiteba Maskot","full":"KITEBA MASKOT JAMS","role":"worker","sub":"Maçonnerie & Gros Œuvre","title":"Maçon","trade":"Maçon","rate":15,"salary":0,"ctype":"Journalier"},
  {"fn":"Michel","ln":"Banze Katole","full":"BANZE KATOLE MICHEL","role":"worker","sub":"Maçonnerie & Gros Œuvre","title":"Maçon","trade":"Maçon","rate":15,"salary":0,"ctype":"Journalier"},
  {"fn":"Obed","ln":"Makonga Wa Banza","full":"MAKONGA WA BANZA OBED","role":"worker","sub":"Maçonnerie & Gros Œuvre","title":"Maçon","trade":"Maçon","rate":15,"salary":0,"ctype":"Journalier"},
  {"fn":"Mutombo","ln":"Ngweji","full":"NGWEJI MUTOMBO","role":"worker","sub":"Maçonnerie & Gros Œuvre","title":"Maçon","trade":"Maçon","rate":15,"salary":0,"ctype":"Journalier"},

  // 2. COFFREURS (18 - inclut MUTOMB KEL ELNAM retenu en Coffreur)
  {"fn":"Elnam","ln":"Mutomb Kel","full":"MUTOMB KEL ELNAM","role":"worker","sub":"Coffrage & Structure","title":"Coffreur","trade":"Coffreur","rate":15,"salary":0,"ctype":"Journalier"},
  {"fn":"Dimitri","ln":"Impanga Ilela","full":"IMPANGA ILELA DIMITRI","role":"worker","sub":"Coffrage & Structure","title":"Coffreur","trade":"Coffreur","rate":15,"salary":0,"ctype":"Journalier"},
  {"fn":"Patrick","ln":"Kasongo Majita","full":"KASONGO MAJITA PATRICK","role":"worker","sub":"Coffrage & Structure","title":"Coffreur","trade":"Coffreur","rate":15,"salary":0,"ctype":"Journalier"},
  {"fn":"Sami","ln":"Katemo Kimba","full":"KATEMO KIMBA SAMI","role":"worker","sub":"Coffrage & Structure","title":"Coffreur","trade":"Coffreur","rate":15,"salary":0,"ctype":"Journalier"},
  {"fn":"Bienvenu","ln":"Kabeya Kabeya","full":"KABEYA KABEYA BIENVENU","role":"worker","sub":"Coffrage & Structure","title":"Coffreur","trade":"Coffreur","rate":15,"salary":0,"ctype":"Journalier"},
  {"fn":"Jean","ln":"Ngoy Philemon","full":"NGOY PHILEMON JEAN","role":"worker","sub":"Coffrage & Structure","title":"Coffreur","trade":"Coffreur","rate":15,"salary":0,"ctype":"Journalier"},
  {"fn":"Raphael","ln":"Kapamba Tshisesu","full":"KAPAMBA TSHISESU RAPHAEL","role":"worker","sub":"Coffrage & Structure","title":"Coffreur","trade":"Coffreur","rate":15,"salary":0,"ctype":"Journalier"},
  {"fn":"Gloire","ln":"Kasongo Mwanapabo","full":"KASONGO MWANAPABO GLOIRE","role":"worker","sub":"Coffrage & Structure","title":"Coffreur","trade":"Coffreur","rate":15,"salary":0,"ctype":"Journalier"},
  {"fn":"Moise","ln":"Tshibambe Mwambi","full":"TSHIBAMBE MWAMBI MOISE","role":"worker","sub":"Coffrage & Structure","title":"Coffreur","trade":"Coffreur","rate":15,"salary":0,"ctype":"Journalier"},
  {"fn":"Patient","ln":"Mbala Mbayo","full":"MBALA MBAYO PATIENT","role":"worker","sub":"Coffrage & Structure","title":"Coffreur","trade":"Coffreur","rate":15,"salary":0,"ctype":"Journalier"},
  {"fn":"Janil","ln":"Makanda Mulongoy","full":"MAKANDA MULONGOY JANIL","role":"worker","sub":"Coffrage & Structure","title":"Coffreur","trade":"Coffreur","rate":15,"salary":0,"ctype":"Journalier"},
  {"fn":"Christian","ln":"Kianda Kasile","full":"KIANDA KASILE CHRISTIAN","role":"worker","sub":"Coffrage & Structure","title":"Coffreur","trade":"Coffreur","rate":15,"salary":0,"ctype":"Journalier"},
  {"fn":"Emma","ln":"Nsase Nsase","full":"NSASE NSASE EMMA","role":"worker","sub":"Coffrage & Structure","title":"Coffreur","trade":"Coffreur","rate":15,"salary":0,"ctype":"Journalier"},
  {"fn":"Saidi","ln":"Shimba Wa Nkulu","full":"SHIMBA WA NKULU SAIDI","role":"worker","sub":"Coffrage & Structure","title":"Coffreur","trade":"Coffreur","rate":15,"salary":0,"ctype":"Journalier"},
  {"fn":"Henry","ln":"Biamana Kalala","full":"BIAMANA KALALA HENRY","role":"worker","sub":"Coffrage & Structure","title":"Coffreur","trade":"Coffreur","rate":15,"salary":0,"ctype":"Journalier"},
  {"fn":"Crisostom","ln":"Kanyinda Diakudimu","full":"KANYINDA DIAKUDIMU CRISOSTOM","role":"worker","sub":"Coffrage & Structure","title":"Coffreur","trade":"Coffreur","rate":15,"salary":0,"ctype":"Journalier"},
  {"fn":"Serge","ln":"Ilunga Mpanga","full":"ILUNGA MPANGA SERGE","role":"worker","sub":"Coffrage & Structure","title":"Coffreur","trade":"Coffreur","rate":15,"salary":0,"ctype":"Journalier"},
  {"fn":"Jean","ln":"Umba Kazadi","full":"UMBA KAZADI JEAN","role":"worker","sub":"Coffrage & Structure","title":"Coffreur","trade":"Coffreur","rate":15,"salary":0,"ctype":"Journalier"},

  // 3. FERRAILLEURS (29 - inclut MUKALU MWEWA TSHULAY)
  {"fn":"Debaba","ln":"Ndala Lenge","full":"NDALA LENGE DEBABA","role":"worker","sub":"Ferraillage & Armatures","title":"Ferrailleur","trade":"Ferrailleur","rate":15,"salary":0,"ctype":"Journalier"},
  {"fn":"Jonas","ln":"Masangu Butombe","full":"MASANGU BUTOMBE JONAS","role":"worker","sub":"Ferraillage & Armatures","title":"Ferrailleur","trade":"Ferrailleur","rate":15,"salary":0,"ctype":"Journalier"},
  {"fn":"Heritier","ln":"Mpiana Mutombo","full":"MPIANA MUTOMBO HERITIER","role":"worker","sub":"Ferraillage & Armatures","title":"Ferrailleur","trade":"Ferrailleur","rate":15,"salary":0,"ctype":"Journalier"},
  {"fn":"Tharaise","ln":"Muloko Kayembe","full":"MULOKO KAYEMBE THARAISE","role":"worker","sub":"Ferraillage & Armatures","title":"Ferrailleur","trade":"Ferrailleur","rate":15,"salary":0,"ctype":"Journalier"},
  {"fn":"Habraham","ln":"Ndalamba Ngoy","full":"NDALAMBA NGOY HABRAHAM","role":"worker","sub":"Ferraillage & Armatures","title":"Ferrailleur","trade":"Ferrailleur","rate":15,"salary":0,"ctype":"Journalier"},
  {"fn":"Christian","ln":"Kisimba Ngosa","full":"KISIMBA NGOSA CHRISTIAN","role":"worker","sub":"Ferraillage & Armatures","title":"Ferrailleur","trade":"Ferrailleur","rate":15,"salary":0,"ctype":"Journalier"},
  {"fn":"David","ln":"Madika Ngoy","full":"MADIKA NGOY DAVID","role":"worker","sub":"Ferraillage & Armatures","title":"Ferrailleur","trade":"Ferrailleur","rate":15,"salary":0,"ctype":"Journalier"},
  {"fn":"Mechack","ln":"Muland Atshikemb","full":"MULAND ATSHIKEMB MECHACK","role":"worker","sub":"Ferraillage & Armatures","title":"Ferrailleur","trade":"Ferrailleur","rate":15,"salary":0,"ctype":"Journalier"},
  {"fn":"Tshulay","ln":"Mukalu Mwewa","full":"MUKALU MWEWA TSHULAY","role":"worker","sub":"Ferraillage & Armatures","title":"Ferrailleur","trade":"Ferrailleur","rate":15,"salary":0,"ctype":"Journalier"},
  {"fn":"Riskin","ln":"Shabanza Kasongo","full":"SHABANZA KASONGO RISKIN","role":"worker","sub":"Ferraillage & Armatures","title":"Ferrailleur","trade":"Ferrailleur","rate":15,"salary":0,"ctype":"Journalier"},
  {"fn":"Lambert","ln":"Nkulu Mayombo","full":"NKULU MAYOMBO LAMBERT","role":"worker","sub":"Ferraillage & Armatures","title":"Ferrailleur","trade":"Ferrailleur","rate":15,"salary":0,"ctype":"Journalier"},
  {"fn":"Lumiere","ln":"Banze Wa Kayumba","full":"BANZE WA KAYUMBA LUMIERE","role":"worker","sub":"Ferraillage & Armatures","title":"Ferrailleur","trade":"Ferrailleur","rate":15,"salary":0,"ctype":"Journalier"},
  {"fn":"Sezar","ln":"Kilumba Gedeon","full":"KILUMBA GEDEON SEZAR","role":"worker","sub":"Ferraillage & Armatures","title":"Ferrailleur","trade":"Ferrailleur","rate":15,"salary":0,"ctype":"Journalier"},
  {"fn":"Tonton","ln":"Misanu Kasamba","full":"MISANU KASAMBA TONTON","role":"worker","sub":"Ferraillage & Armatures","title":"Ferrailleur","trade":"Ferrailleur","rate":15,"salary":0,"ctype":"Journalier"},
  {"fn":"Serge","ln":"Tshimwang Nawej","full":"TSHIMWANG NAWEJ SERGE","role":"worker","sub":"Ferraillage & Armatures","title":"Ferrailleur","trade":"Ferrailleur","rate":15,"salary":0,"ctype":"Journalier"},
  {"fn":"Crispin","ln":"Kahozi Malisawa","full":"KAHOZI MALISAWA CRISPIN","role":"worker","sub":"Ferraillage & Armatures","title":"Ferrailleur","trade":"Ferrailleur","rate":15,"salary":0,"ctype":"Journalier"},
  {"fn":"Daniel","ln":"Bamwanya Tshipuita","full":"BAMWANYA TSHIPUITA DANIEL","role":"worker","sub":"Ferraillage & Armatures","title":"Ferrailleur","trade":"Ferrailleur","rate":15,"salary":0,"ctype":"Journalier"},
  {"fn":"Kayamba","ln":"Luponya","full":"LUPONYA KAYAMBA","role":"worker","sub":"Ferraillage & Armatures","title":"Ferrailleur","trade":"Ferrailleur","rate":15,"salary":0,"ctype":"Journalier"},
  {"fn":"Nevil","ln":"Mununga Kadima","full":"MUNUNGA KADIMA NEVIL","role":"worker","sub":"Ferraillage & Armatures","title":"Ferrailleur","trade":"Ferrailleur","rate":15,"salary":0,"ctype":"Journalier"},
  {"fn":"Exode","ln":"Mwanza Kashama","full":"MWANZA KASHAMA EXODE","role":"worker","sub":"Ferraillage & Armatures","title":"Ferrailleur","trade":"Ferrailleur","rate":15,"salary":0,"ctype":"Journalier"},
  {"fn":"Lebon","ln":"Ngoy Banza","full":"NGOY BANZA LEBON","role":"worker","sub":"Ferraillage & Armatures","title":"Ferrailleur","trade":"Ferrailleur","rate":15,"salary":0,"ctype":"Journalier"},
  {"fn":"Machack","ln":"Muland Atshikemb","full":"MULAND ATSHIKEMB MACHACK","role":"worker","sub":"Ferraillage & Armatures","title":"Ferrailleur","trade":"Ferrailleur","rate":15,"salary":0,"ctype":"Journalier"},
  {"fn":"Alain","ln":"Ngoy Kasongo","full":"NGOY KASONGO ALAIN","role":"worker","sub":"Ferraillage & Armatures","title":"Ferrailleur","trade":"Ferrailleur","rate":15,"salary":0,"ctype":"Journalier"},
  {"fn":"Boanerge","ln":"Mwenze Buta","full":"MWENZE BUTA BOANERGE","role":"worker","sub":"Ferraillage & Armatures","title":"Ferrailleur","trade":"Ferrailleur","rate":15,"salary":0,"ctype":"Journalier"},
  {"fn":"Mbuyamba","ln":"Mwamba","full":"MWAMBA MBUYAMBA","role":"worker","sub":"Ferraillage & Armatures","title":"Ferrailleur","trade":"Ferrailleur","rate":15,"salary":0,"ctype":"Journalier"},
  {"fn":"Chritient","ln":"Tshitangu Mafanda","full":"TSHITANGU MAFANDA CHRITIENT","role":"worker","sub":"Ferraillage & Armatures","title":"Ferrailleur","trade":"Ferrailleur","rate":15,"salary":0,"ctype":"Journalier"},
  {"fn":"Jean","ln":"Lumingu","full":"LUMINGU JEAN","role":"worker","sub":"Ferraillage & Armatures","title":"Ferrailleur","trade":"Ferrailleur","rate":15,"salary":0,"ctype":"Journalier"},
  {"fn":"Nikson","ln":"Ilunga Wa Ngoy","full":"ILUNGA WA NGOY NIKSON","role":"worker","sub":"Ferraillage & Armatures","title":"Ferrailleur","trade":"Ferrailleur","rate":15,"salary":0,"ctype":"Journalier"},
  {"fn":"Delphin","ln":"Kamwanya Numbi","full":"KAMWANYA NUMBI DELPHIN","role":"worker","sub":"Ferraillage & Armatures","title":"Ferrailleur","trade":"Ferrailleur","rate":15,"salary":0,"ctype":"Journalier"}
];

const sql = `
DO $$
DECLARE
  pwd_hash text;
  new_uid uuid;
  v_email text;
  v_user_id uuid;
  r RECORD;
  workers_json CONSTANT jsonb := '${JSON.stringify(newWorkers).replace(/'/g, "''")}'::jsonb;
BEGIN
  pwd_hash := crypt('Sixsigma2026!', gen_salt('bf', 10));

  FOR r IN SELECT * FROM jsonb_to_recordset(workers_json) AS x(
    fn text, ln text, "full" text, role text, sub text, title text, trade text, rate numeric, salary numeric, ctype text
  )
  LOOP
    v_email := lower(regexp_replace(r."full", '[^a-zA-Z0-9]', '', 'g')) || '@worker.sixsigma.local';
    
    -- Vérification préalable d'existence : ne JAMAIS écraser un compte existant
    SELECT id INTO v_user_id FROM auth.users WHERE email = v_email LIMIT 1;
    
    IF v_user_id IS NULL THEN
      SELECT id INTO v_user_id FROM public.profiles WHERE lower(full_name) = lower(r."full") LIMIT 1;
    END IF;

    -- Injection uniquement si le compte n'existe pas encore
    IF v_user_id IS NULL THEN
      new_uid := gen_random_uuid();
      
      INSERT INTO auth.users (
        id, instance_id, email, encrypted_password, email_confirmed_at,
        raw_app_meta_data, raw_user_meta_data, confirmation_token, recovery_token,
        email_change_token_new, email_change, phone_change, phone_change_token,
        reauthentication_token, email_change_token_current, created_at, updated_at, role, aud
      ) VALUES (
        new_uid,
        '00000000-0000-0000-0000-000000000000',
        v_email,
        pwd_hash,
        now(),
        '{"provider":"email","providers":["email"]}'::jsonb,
        json_build_object('full_name', r."full", 'first_name', r.fn, 'last_name', r.ln, 'role', r.role),
        '', '', '', '', '', '', '', '',
        now(), now(), 'authenticated', 'authenticated'
      );

      -- Insertion dans auth.identities requise par GoTrue
      INSERT INTO auth.identities (
        id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at
      ) VALUES (
        gen_random_uuid(),
        new_uid,
        jsonb_build_object('sub', new_uid::text, 'email', v_email),
        'email',
        new_uid::text,
        now(),
        now(),
        now()
      ) ON CONFLICT (provider, provider_id) DO NOTHING;

      -- Création du profil ouvrier journalier
      INSERT INTO public.profiles (
        id, first_name, last_name, full_name, email,
        role, sub_role, job_title, trade_category,
        daily_rate, base_salary, contract_type, is_active,
        contract_end_date, id_expiry_date
      ) VALUES (
        new_uid,
        r.fn,
        r.ln,
        r."full",
        NULL,
        r.role::public.user_role,
        r.sub,
        r.title,
        r.trade,
        r.rate,
        r.salary,
        r.ctype,
        true,
        CURRENT_DATE + interval '1 year',
        CURRENT_DATE + interval '2 years'
      )
      ON CONFLICT (id) DO NOTHING;
    END IF;
  END LOOP;
END $$;
`;

async function run() {
  console.log(`=== DÉBUT DE L INJECTION DES NOUVEAUX OUVRIERS DRAIN.XLSX (${newWorkers.length} profils) ===\n`);

  const res = await fetch('https://api.supabase.com/v1/projects/tulxrodafhodmxcftpfr/database/query', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: sql })
  });

  const result = await res.json();
  if (!res.ok || (result && result.message && result.message.startsWith('Failed to run sql query'))) {
    console.error('Erreur migration :', result);
    process.exit(1);
  }
  console.log('✓ Migration exécutée avec succès !');

  // Rapport de vérification des effectifs ouvriers consolidés
  const checkRes = await fetch('https://api.supabase.com/v1/projects/tulxrodafhodmxcftpfr/database/query', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query: `
        SELECT 
          trade_category, 
          count(*) as total_ouvriers,
          avg(daily_rate) as taux_journalier_moyen,
          count(employee_id) as matricules_generes
        FROM public.profiles 
        WHERE role = 'worker'
        GROUP BY trade_category
        ORDER BY total_ouvriers DESC;
      `
    })
  });

  const stats = await checkRes.json();
  console.log('\n=== STATISTIQUES CONSOLIDÉES DES OUVRIERS EN BASE ===');
  console.table(stats);

  const totalRes = await fetch('https://api.supabase.com/v1/projects/tulxrodafhodmxcftpfr/database/query', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query: `
        SELECT 
          count(*) as total_effectif_entreprise,
          count(*) FILTER (WHERE role = 'worker') as total_ouvriers,
          count(*) FILTER (WHERE role != 'worker') as total_staff_cadres
        FROM public.profiles;
      `
    })
  });

  const totalStats = await totalRes.json();
  console.log('\n=== EFFECTIF TOTAL SIX SIGMA SARL ===');
  console.table(totalStats);
}

run().catch(console.error);
