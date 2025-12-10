import { sql } from '../src/lib/db';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';

async function migrate() {
  const migrationPath = path.join(process.cwd(), 'migrations/001_init.sql');
  const sqlText = fs.readFileSync(migrationPath, 'utf-8');
  await sql`${sqlText}`;
}

async function seed() {
  const pwd = await bcrypt.hash('Passw0rd!', 10);
  await sql`insert into roles (name) values ('admin'),('hod'),('staff') on conflict do nothing;`;
  await sql`insert into departments (name, year) values ('Computer Science', 2025) on conflict do nothing;`;
  await sql`insert into users (department_id, name, email, password_hash, role)
            values (1, 'Admin User', 'admin@dept.test', ${pwd}, 'admin')
            on conflict (email) do nothing;`;
  await sql`insert into categories (name) values
    ('Infrastructure'),('Hardware'),('Software'),('Workshops'),('Events'),('Misc')
    on conflict do nothing;`;
  await sql`insert into activity_events (department_id, name, type, start_date, end_date) values
    (1, 'AI Workshop', 'Workshop', '2025-01-10', '2025-01-11'),
    (1, 'Tech Fest', 'Event', '2025-02-20', '2025-02-21')
    on conflict do nothing;`;
  await sql`insert into budget_plans (department_id, fiscal_year, proposed_amount, notes)
            values (1, '2025', 1000000, 'Initial proposal')
            on conflict do nothing;`;
  await sql`insert into budget_allotments (department_id, fiscal_year, allotted_amount, notes)
            values (1, '2025', 900000, 'Allotted')
            on conflict do nothing;`;
  await sql`insert into expenses (department_id, category_id, event_id, amount, vendor, expense_date, description, status)
            values (1, 4, 1, 50000, 'ABC Events', '2025-01-11', 'AI Workshop honorarium', 'approved')
            on conflict do nothing;`;
}

const migrateOnly = process.argv.includes('--migrate-only');

(async () => {
  await migrate();
  if (!migrateOnly) {
    await seed();
  }
  console.log('Done');
  process.exit(0);
})();