const fs = require('fs');
const path = require('path');

const envPath = fs.existsSync('.env.local') ? '.env.local' : path.resolve(__dirname, '../.env.local');
const env = fs.readFileSync(envPath, 'utf-8');
const token = env.match(/SUPABASE_ACCESS_TOKEN=(.+)/)[1].trim();

async function run() {
  const query = `
    SELECT 
      c.relname as table_name,
      c.relrowsecurity as rls_enabled,
      c.relforcerowsecurity as rls_forced,
      count(p.polname) as policy_count
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    LEFT JOIN pg_policy p ON p.polrelid = c.oid
    WHERE n.nspname = 'public' 
      AND c.relkind = 'r'
      AND c.relname IN ('payroll_items', 'payroll_periods', 'profiles', 'audit_logs', 'cashbox_transactions', 'material_requisitions', 'time_entries', 'projects', 'system_settings')
    GROUP BY c.relname, c.relrowsecurity, c.relforcerowsecurity
    ORDER BY c.relname;
  `;

  const res = await fetch('https://api.supabase.com/v1/projects/tulxrodafhodmxcftpfr/database/query', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query })
  });

  const tables = await res.json();
  console.log('=== TABLE RLS STATUS ===');
  console.table(tables);

  const policiesQuery = `
    SELECT tablename, policyname, roles, cmd, qual, with_check 
    FROM pg_policies 
    WHERE schemaname = 'public'
      AND tablename IN ('payroll_items', 'payroll_periods', 'profiles', 'audit_logs', 'cashbox_transactions', 'material_requisitions', 'time_entries')
    ORDER BY tablename, policyname;
  `;

  const resPolicies = await fetch('https://api.supabase.com/v1/projects/tulxrodafhodmxcftpfr/database/query', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: policiesQuery })
  });

  const policies = await resPolicies.json();
  console.log('\n=== POLICIES ===');
  console.log(JSON.stringify(policies, null, 2));
}

run().catch(console.error);
