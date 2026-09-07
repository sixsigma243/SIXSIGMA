const fs = require('fs');

let token = process.env.SUPABASE_ACCESS_TOKEN;
if (!token && fs.existsSync('.env.local')) {
  const envContent = fs.readFileSync('.env.local', 'utf-8');
  const match = envContent.match(/SUPABASE_ACCESS_TOKEN=(.+)/);
  if (match) token = match[1].trim();
}

const DB_QUERY_URL = 'https://api.supabase.com/v1/projects/tulxrodafhodmxcftpfr/database/query';

async function runSql(sql) {
  const r = await fetch(DB_QUERY_URL, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: sql })
  });
  return r.json();
}

async function main() {
  console.log('Testing V3 Business Rules & Triggers...\n');

  // Test 1: Verify audit_logs table
  const auditLogs = await runSql('SELECT * FROM public.audit_logs ORDER BY performed_at DESC LIMIT 5;');
  console.log('1. Audit Logs check:', auditLogs);

  // Test 2: Verify payroll_periods table
  const periods = await runSql('SELECT * FROM public.payroll_periods ORDER BY start_date;');
  console.log('\n2. Payroll Periods check:', periods);

  // Test 3: Test HR compliance trigger (Expired contract / ID)
  console.log('\n3. Testing HR Compliance trigger (Expired contract)...');
  // Create dummy profile with expired contract
  const dummyId = '00000000-0000-0000-0000-000000000099';
  await runSql(`
    INSERT INTO public.profiles (id, full_name, email, role, contract_end_date, id_expiry_date)
    VALUES ('${dummyId}', 'Test Expire', 'test.expire@sixsigma.cd', 'supervisor', '2025-01-01', '2026-12-31')
    ON CONFLICT (id) DO UPDATE SET contract_end_date = '2025-01-01';
  `);
  
  const insertTime = await runSql(`
    INSERT INTO public.time_entries (profile_id, worker_name, entry_date, status)
    VALUES ('${dummyId}', 'Test Expire', CURRENT_DATE, 'present');
  `);
  console.log('Insert time with expired contract result (Should fail):', insertTime);

  // Test 4: Test Dispatch trigger (Expired driver license)
  console.log('\n4. Testing Dispatch trigger (Expired driver license)...');
  const insertMission = await runSql(`
    INSERT INTO public.dispatch_missions (destination, driver_name, driver_license_expiry, departure_date, status)
    VALUES ('Kolwezi Mine', 'Chauffeur Test', '2025-01-01', CURRENT_DATE, 'planned');
  `);
  console.log('Insert mission with expired driver license result (Should fail):', insertMission);

  // Clean up dummy profile
  await runSql(`DELETE FROM public.profiles WHERE id = '${dummyId}';`);

  console.log('\nAll V3 trigger checks completed!');
}

main().catch(console.error);
