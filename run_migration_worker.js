const fs = require('fs');

let token = process.env.SUPABASE_ACCESS_TOKEN;
if (!token && fs.existsSync('.env.local')) {
  const envContent = fs.readFileSync('.env.local', 'utf-8');
  const match = envContent.match(/SUPABASE_ACCESS_TOKEN=(.+)/);
  if (match) token = match[1].trim();
}

if (!token) {
  console.error('SUPABASE_ACCESS_TOKEN is required');
  process.exit(1);
}

const step1 = `
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'worker';
`;

const step2 = `
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS daily_rate numeric(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS trade_category text DEFAULT 'Manœuvre';

CREATE INDEX IF NOT EXISTS idx_profiles_role_worker ON public.profiles(role) WHERE role = 'worker';
CREATE INDEX IF NOT EXISTS idx_profiles_trade_category ON public.profiles(trade_category);
`;

async function executeQuery(sql, stepName) {
  console.log(`Applying: ${stepName}...`);
  const response = await fetch('https://api.supabase.com/v1/projects/tulxrodafhodmxcftpfr/database/query', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ query: sql })
  });

  const result = await response.json();
  if (!response.ok) {
    console.error(`Failed at ${stepName}:`, JSON.stringify(result, null, 2));
    throw new Error(`Failed at ${stepName}`);
  }
  console.log(`${stepName} applied successfully!`, result);
}

async function run() {
  await executeQuery(step1, 'Step 1: ALTER TYPE user_role ADD VALUE worker');
  await executeQuery(step2, 'Step 2: Add columns & indexes');
  console.log('ALL STEPS COMPLETED SUCCESSFULLY!');
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
