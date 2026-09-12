const fs = require('fs');
const XLSX = require('xlsx');

// 1. Récupération des jetons d'accès Supabase
let MANAGEMENT_TOKEN = process.env.SUPABASE_ACCESS_TOKEN;
if (!MANAGEMENT_TOKEN && fs.existsSync('.env.local')) {
  const envContent = fs.readFileSync('.env.local', 'utf-8');
  const tokenMatch = envContent.match(/SUPABASE_ACCESS_TOKEN=(.+)/);
  if (tokenMatch) MANAGEMENT_TOKEN = tokenMatch[1].trim();
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

// 2. Fonctions utilitaires de nettoyage
function normalizeName(name) {
  return name.trim().toUpperCase().replace(/\s+/g, ' ');
}

function cleanStringForEmail(str) {
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function parseFullName(fullName) {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 1) {
    return { firstName: parts[0], lastName: parts[0] };
  }
  const firstName = parts[parts.length - 1];
  const lastName = parts.slice(0, parts.length - 1).join(' ');
  return { firstName, lastName };
}

function generateOfficialEmail(fullName) {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 1) {
    return `${cleanStringForEmail(parts[0])}@sixsigma.cd`;
  }
  const prenom = cleanStringForEmail(parts[parts.length - 1]);
  const nom = cleanStringForEmail(parts[0]);
  return `${prenom}.${nom}@sixsigma.cd`;
}

function generateTechnicalWorkerEmail(fullName, index) {
  const slug = cleanStringForEmail(fullName);
  return `${slug || 'worker'}_${index}@worker.sixsigma.local`;
}

function escapeSql(str) {
  if (str === null || str === undefined) return 'NULL';
  return `'${str.replace(/'/g, "''")}'`;
}

async function main() {
  console.log('=== DÉBUT DU PROCESSUS D IMPORT DES AGENTS SIX SIGMA ===\n');

  // 1. Lecture du fichier Excel
  const filePath = 'C:\\Users\\acer_PC\\Downloads\\LISTE DES AGENTS SIX SIGMA.xlsx';
  if (!fs.existsSync(filePath)) {
    throw new Error(`Fichier introuvable à l'emplacement : ${filePath}`);
  }

  const workbook = XLSX.readFile(filePath);
  console.log('Feuilles chargées :', workbook.SheetNames);

  // Consolidation de toutes les feuilles
  const allAgentsMap = new Map();

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.length === 0) continue;
      if (row.includes('NOM') || row.includes('FONCTION')) continue;

      const rawNom = row[1];
      const rawFonction = row[2];
      const rawObs = row[3];

      if (rawNom && typeof rawNom === 'string' && rawNom.trim().length > 1) {
        const norm = normalizeName(rawNom);
        const f = (rawFonction || '').toString().trim().toUpperCase();
        const o = (rawObs || '').toString().trim().toUpperCase();

        if (!allAgentsMap.has(norm)) {
          allAgentsMap.set(norm, {
            rawNom: rawNom.trim(),
            fonction: f,
            obs: o,
            sheets: [sheetName]
          });
        } else {
          const existing = allAgentsMap.get(norm);
          existing.sheets.push(sheetName);
          if (o && !existing.obs) existing.obs = o;
          if (
            o.includes('TEAM') ||
            f.includes('TEAM') ||
            f.includes('SUPERVISEUR') ||
            f.includes('SAFETY') ||
            f.includes('SITE') ||
            f.includes('ADMIN') ||
            f.includes('DISTACH') ||
            f.includes('MAGAZINIER') ||
            f.includes('POINTEUR') ||
            f.includes('CLEANNER')
          ) {
            if (f && f !== existing.fonction) existing.fonction = f;
            if (o && !existing.obs) existing.obs = o;
          }
        }
      }
    }
  }

  console.log(`Nombre total d'agents uniques consolidés : ${allAgentsMap.size}`);

  // 2. Mappage selon les règles métier
  const mappedAgents = [];
  let workerIdx = 1;

  for (const [normName, data] of allAgentsMap.entries()) {
    const { rawNom, fonction, obs } = data;
    const f = fonction.toUpperCase();
    const o = obs.toUpperCase();
    const { firstName, lastName } = parseFullName(rawNom);

    let mapped = null;

    // 1. Site Manager
    if (f === 'SITE MANAGER' || normName === 'NTAMBWE NGOIE THOMS') {
      mapped = {
        fullName: rawNom,
        firstName,
        lastName,
        role: 'site_manager',
        sub_role: 'Génie Civil & Chantiers',
        job_title: 'Conducteur de Travaux / Site Manager',
        contract_type: 'CDI',
        base_salary: 1200,
        daily_rate: 0,
        trade_category: null,
        authEmail: 'thoms.ntambwe@sixsigma.cd',
        profileEmail: 'thoms.ntambwe@sixsigma.cd',
      };
    }
    // 2. Superviseurs
    else if (
      f === 'SUPERVISEUR' ||
      normName === 'BADIBANGA MUDIKONKE NICOLAS' ||
      normName === 'KALUNGA YAONE EBEN' ||
      normName === 'MONJI KALWANI THIERY' ||
      normName === 'MUVUM MULAND FRANCOIS' ||
      normName === 'TSHIBANGU KABONGO JIMMY'
    ) {
      let officialEmail = generateOfficialEmail(rawNom);
      if (normName === 'MONJI KALWANI THIERY') officialEmail = 'thiery.monji@sixsigma.cd';
      if (normName === 'KALUNGA YAONE EBEN') officialEmail = 'eben.kalunga@sixsigma.cd';
      if (normName === 'BADIBANGA MUDIKONKE NICOLAS') officialEmail = 'nicolas.badibanga@sixsigma.cd';
      if (normName === 'MUVUM MULAND FRANCOIS') officialEmail = 'francois.muvum@sixsigma.cd';
      if (normName === 'TSHIBANGU KABONGO JIMMY') officialEmail = 'jimmy.tshibangu@sixsigma.cd';

      mapped = {
        fullName: rawNom,
        firstName,
        lastName,
        role: 'supervisor',
        sub_role: 'Opérations Terrain',
        job_title: 'Superviseur de Chantier',
        contract_type: 'CDI',
        base_salary: 800,
        daily_rate: 0,
        trade_category: null,
        authEmail: officialEmail,
        profileEmail: officialEmail,
      };
    }
    // 3. Chefs d'équipe
    else if (
      f === 'TEAM LEADER' ||
      o.includes('TEAM LEADER') ||
      o.includes('TEAM LEADE') ||
      normName === 'KABEYA LUKOMBO AARON' ||
      normName === 'MUBI TSHIFUTSHI' ||
      normName === 'NGELEZA MWANAVITA CEDRICK' ||
      normName === 'MUTOMBO KANJIMANA ALEXANDRE' ||
      normName === 'LUAKILA MUKOMBO VALENTIN'
    ) {
      let subRole = 'Opérations Chantier';
      let tradeCat = 'Coffreur';
      if (f === 'MACON' || o.includes('MACON')) {
        subRole = 'Maçonnerie';
        tradeCat = 'Maçon';
      } else if (f === 'COFFREUR' || o.includes('COFFREUR')) {
        subRole = 'Coffrage & Structure';
        tradeCat = 'Coffreur';
      } else if (f === 'FERRAILLEUR' || o.includes('FERRAILLEUR')) {
        subRole = 'Ferraillage & Armatures';
        tradeCat = 'Ferrailleur';
      }

      let officialEmail = generateOfficialEmail(rawNom);
      if (normName === 'KABEYA LUKOMBO AARON') officialEmail = 'aaron.kabeya@sixsigma.cd';
      if (normName === 'MUBI TSHIFUTSHI') officialEmail = 'tshifutshi.mubi@sixsigma.cd';
      if (normName === 'NGELEZA MWANAVITA CEDRICK') officialEmail = 'cedrick.ngeleza@sixsigma.cd';
      if (normName === 'MUTOMBO KANJIMANA ALEXANDRE') officialEmail = 'alexandre.mutombo@sixsigma.cd';
      if (normName === 'LUAKILA MUKOMBO VALENTIN') officialEmail = 'valentin.luakila@sixsigma.cd';

      mapped = {
        fullName: rawNom,
        firstName,
        lastName,
        role: 'team_leader',
        sub_role: subRole,
        job_title: "Chef d'Équipe",
        contract_type: 'CDD',
        base_salary: 0,
        daily_rate: 25,
        trade_category: tradeCat,
        authEmail: officialEmail,
        profileEmail: officialEmail,
      };
    }
    // 4. Pointeurs RH
    else if (f === 'POINTEUR' || normName === 'LUTUMBA MUKUNA DAN' || normName === 'KAPALANG MBAL HERNESTINE') {
      let officialEmail = generateOfficialEmail(rawNom);
      if (normName === 'LUTUMBA MUKUNA DAN') officialEmail = 'dan.lutumba@sixsigma.cd';
      if (normName === 'KAPALANG MBAL HERNESTINE') officialEmail = 'hernestine.kapalang@sixsigma.cd';

      mapped = {
        fullName: rawNom,
        firstName,
        lastName,
        role: 'hr_officer',
        sub_role: 'RH & Pointage',
        job_title: 'Pointeur de Chantier',
        contract_type: 'CDD',
        base_salary: 500,
        daily_rate: 0,
        trade_category: null,
        authEmail: officialEmail,
        profileEmail: officialEmail,
      };
    }
    // 5. Magasinier
    else if (f === 'MAGAZINIER' || f === 'MAGASINIER' || normName === 'KAIMBO TSHIFUNGA DAVID') {
      mapped = {
        fullName: rawNom,
        firstName,
        lastName,
        role: 'warehouse_keeper',
        sub_role: 'Logistique & Stock',
        job_title: 'Magasinier Chantier',
        contract_type: 'CDD',
        base_salary: 550,
        daily_rate: 0,
        trade_category: null,
        authEmail: 'david.kaimbo@sixsigma.cd',
        profileEmail: 'david.kaimbo@sixsigma.cd',
      };
    }
    // 6. Sécurité / HSE
    else if (f === 'SAFETY' || normName === 'BANZE MULEDI DIEU-MERCI' || normName === 'KITENGE KALUMBA HENRY') {
      let officialEmail = generateOfficialEmail(rawNom);
      if (normName === 'BANZE MULEDI DIEU-MERCI') officialEmail = 'dieumerci.banze@sixsigma.cd';
      if (normName === 'KITENGE KALUMBA HENRY') officialEmail = 'henry.kitenge@sixsigma.cd';

      mapped = {
        fullName: rawNom,
        firstName,
        lastName,
        role: 'safety_officer',
        sub_role: 'Hygiène & Sécurité',
        job_title: 'Responsable HSE / Sécurité',
        contract_type: 'CDI',
        base_salary: 750,
        daily_rate: 0,
        trade_category: null,
        authEmail: officialEmail,
        profileEmail: officialEmail,
      };
    }
    // 7. Dispatch & Charroi
    else if (f === 'DISTACH' || f === 'DISPATCH' || normName === 'KALUME TWITE EMANUEL') {
      mapped = {
        fullName: rawNom,
        firstName,
        lastName,
        role: 'dispatch',
        sub_role: 'Charroi Roulant',
        job_title: 'Agent de Dispatch & Charroi',
        contract_type: 'CDD',
        base_salary: 600,
        daily_rate: 0,
        trade_category: null,
        authEmail: 'emanuel.kalume@sixsigma.cd',
        profileEmail: 'emanuel.kalume@sixsigma.cd',
      };
    }
    // 8. Admin / Gestion Chantier
    else if (f === 'ADMIN' || normName === 'MWAPE MUTEBA ALLIANCE') {
      mapped = {
        fullName: rawNom,
        firstName,
        lastName,
        role: 'admin',
        sub_role: 'Administration Chantier',
        job_title: 'Gestionnaire / Admin Chantier',
        contract_type: 'CDI',
        base_salary: 700,
        daily_rate: 0,
        trade_category: null,
        authEmail: 'alliance.mwape@sixsigma.cd',
        profileEmail: 'alliance.mwape@sixsigma.cd',
      };
    }
    // 9. Intendance / Nettoyage
    else if (f === 'CLEANNER' || f === 'CLEANER' || normName === 'MWANANGWA KASONGO PARFAITE') {
      mapped = {
        fullName: rawNom,
        firstName,
        lastName,
        role: 'stewardship',
        sub_role: 'Services Généraux',
        job_title: "Agent d'Entretien / Intendance",
        contract_type: 'Journalier',
        base_salary: 0,
        daily_rate: 10,
        trade_category: 'Intendance',
        authEmail: 'parfaite.mwanangwa@sixsigma.cd',
        profileEmail: 'parfaite.mwanangwa@sixsigma.cd',
      };
    }
    // 10. Ouvriers Passifs & Journaliers (worker)
    else {
      let tradeCat = 'Manœuvre';
      let dailyRate = 10;
      if (f === 'MACON') {
        tradeCat = 'Maçon';
        dailyRate = 15;
      } else if (f === 'FERRAILLEUR') {
        tradeCat = 'Ferrailleur';
        dailyRate = 15;
      } else if (f === 'COFFREUR') {
        tradeCat = 'Coffreur';
        dailyRate = 15;
      } else {
        tradeCat = 'Manœuvre';
        dailyRate = 10;
      }

      mapped = {
        fullName: rawNom,
        firstName,
        lastName,
        role: 'worker',
        sub_role: tradeCat,
        job_title: tradeCat === 'Manœuvre' ? 'Manœuvre Chantier' : `Ouvrier Spécialisé (${tradeCat})`,
        contract_type: 'Journalier',
        base_salary: 0,
        daily_rate: dailyRate,
        trade_category: tradeCat,
        authEmail: generateTechnicalWorkerEmail(rawNom, workerIdx++),
        profileEmail: null,
      };
    }

    mappedAgents.push(mapped);
  }

  console.log(`Agents prêts pour injection : ${mappedAgents.length}`);

  // 3. Construction du script SQL d'injection par blocs
  // On découpe en 2 blocs pour éviter tout timeout HTTP
  const chunkSize = 75;
  for (let c = 0; c < mappedAgents.length; c += chunkSize) {
    const chunk = mappedAgents.slice(c, c + chunkSize);
    console.log(`\nPréparation et exécution du bloc ${Math.floor(c / chunkSize) + 1} (${chunk.length} agents)...`);

    let sql = `
DO $$
DECLARE
  pwd_hash text := crypt('Sixsigma2026!', gen_salt('bf'));
  v_user_id uuid;
BEGIN
`;

    for (const agent of chunk) {
      sql += `
  -- Traitement de : ${agent.fullName.replace(/'/g, "''")} (${agent.role})
  v_user_id := NULL;
  
  -- 1. Recherche utilisateur existant
  SELECT id INTO v_user_id 
  FROM auth.users 
  WHERE lower(email) = lower(${escapeSql(agent.authEmail)})
  LIMIT 1;

  IF v_user_id IS NULL AND ${escapeSql(agent.profileEmail)} IS NOT NULL THEN
    SELECT id INTO v_user_id 
    FROM auth.users 
    WHERE lower(email) = lower(${escapeSql(agent.profileEmail)})
    LIMIT 1;
  END IF;

  IF v_user_id IS NULL THEN
    SELECT id INTO v_user_id 
    FROM public.profiles 
    WHERE lower(full_name) = lower(${escapeSql(agent.fullName)})
    LIMIT 1;
  END IF;

  -- 2. Création ou mise à jour auth.users
  IF v_user_id IS NULL THEN
    v_user_id := gen_random_uuid();

    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      v_user_id,
      'authenticated',
      'authenticated',
      ${escapeSql(agent.authEmail)},
      pwd_hash,
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      jsonb_build_object(
        'full_name', ${escapeSql(agent.fullName)},
        'first_name', ${escapeSql(agent.firstName)},
        'last_name', ${escapeSql(agent.lastName)},
        'role', ${escapeSql(agent.role)}
      ),
      now(),
      now()
    );

    INSERT INTO auth.identities (
      id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at
    ) VALUES (
      gen_random_uuid(),
      v_user_id,
      jsonb_build_object('sub', v_user_id::text, 'email', ${escapeSql(agent.authEmail)}),
      'email',
      v_user_id::text,
      now(),
      now(),
      now()
    ) ON CONFLICT (provider, provider_id) DO NOTHING;

  ELSE
    UPDATE auth.users
    SET 
      email = ${escapeSql(agent.authEmail)},
      raw_user_meta_data = jsonb_build_object(
        'full_name', ${escapeSql(agent.fullName)},
        'first_name', ${escapeSql(agent.firstName)},
        'last_name', ${escapeSql(agent.lastName)},
        'role', ${escapeSql(agent.role)}
      ),
      updated_at = now()
    WHERE id = v_user_id;
  END IF;

  -- 3. Mise à jour / Création public.profiles
  INSERT INTO public.profiles (
    id, first_name, last_name, full_name, email, role, sub_role,
    job_title, contract_type, base_salary, daily_rate, trade_category,
    is_active, updated_at
  ) VALUES (
    v_user_id,
    ${escapeSql(agent.firstName)},
    ${escapeSql(agent.lastName)},
    ${escapeSql(agent.fullName)},
    ${escapeSql(agent.profileEmail)},
    ${escapeSql(agent.role)}::user_role,
    ${escapeSql(agent.sub_role)},
    ${escapeSql(agent.job_title)},
    ${escapeSql(agent.contract_type)},
    ${agent.base_salary},
    ${agent.daily_rate},
    ${escapeSql(agent.trade_category)},
    true,
    now()
  )
  ON CONFLICT (id) DO UPDATE
  SET
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    full_name = EXCLUDED.full_name,
    email = EXCLUDED.email,
    role = EXCLUDED.role,
    sub_role = EXCLUDED.sub_role,
    job_title = EXCLUDED.job_title,
    contract_type = EXCLUDED.contract_type,
    base_salary = EXCLUDED.base_salary,
    daily_rate = EXCLUDED.daily_rate,
    trade_category = EXCLUDED.trade_category,
    is_active = true,
    updated_at = now();
`;
    }

    sql += `
END $$;
`;

    const res = await runQuery(sql);
    if (res && res.error) {
      console.error(`Erreur SQL dans le bloc ${Math.floor(c / chunkSize) + 1}:`, res.error);
      throw new Error(res.error);
    }
    console.log(`Bloc ${Math.floor(c / chunkSize) + 1} injecté avec succès.`);
  }

  // 4. Requête SQL de contrôle
  console.log('\n=== EXÉCUTION DE LA REQUÊTE DE CONTRÔLE SUR SUPABASE ===');
  const checkSql = `
    SELECT role, COALESCE(trade_category, 'N/A') as trade_category, count(*) as count
    FROM public.profiles 
    GROUP BY role, trade_category 
    ORDER BY count DESC;
  `;
  const stats = await runQuery(checkSql);
  console.table(stats);

  const totalCountRes = await runQuery(`SELECT count(*) as total_profiles FROM public.profiles;`);
  console.log('\nNombre total de profils dans public.profiles :', totalCountRes[0]?.total_profiles);

  // Vérification de quelques matricules générés
  const matriculesRes = await runQuery(`
    SELECT employee_id, full_name, role, job_title, daily_rate, base_salary 
    FROM public.profiles 
    WHERE role != 'worker' 
    LIMIT 10;
  `);
  console.log('\nExemples de matricules et profils encadrants :');
  console.table(matriculesRes);

  console.log('\n=== IMPORTATION TERMINÉE AVEC SUCCÈS ===');
}

main().catch(err => {
  console.error('ERREUR FATALE :', err);
  process.exit(1);
});
