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

async function run() {
  const sql = fs.readFileSync('supabase_migration_v4.sql', 'utf-8');
  console.log('Applying Supabase migration V4...');

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
    console.error('Migration V4 failed:', JSON.stringify(result, null, 2));
    process.exit(1);
  }
  console.log('Migration V4 successfully applied!', result);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
