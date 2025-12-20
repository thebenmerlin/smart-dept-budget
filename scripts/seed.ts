import { neon } from '@neondatabase/serverless';
import bcrypt from 'bcryptjs';

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error('DATABASE_URL not set');
  console.error('Run:  npx dotenv -e .env.local -- npx tsx scripts/seed.ts --reset');
  process.exit(1);
}

const sql = neon(databaseUrl);

async function createTables() {
  console.log('Creating tables if not exist...');

  // Create sub_budgets table
  await sql`
    CREATE TABLE IF NOT EXISTS sub_budgets (
      id SERIAL PRIMARY KEY,
      department_id INT REFERENCES departments(id) ON DELETE CASCADE,
      category_id INT REFERENCES categories(id) ON DELETE CASCADE,
      fiscal_year VARCHAR(20) NOT NULL,
      name VARCHAR(255) NOT NULL,
      description TEXT,
      amount DECIMAL(15, 2) NOT NULL DEFAULT 0,
      budget_type VARCHAR(50) DEFAULT 'category' CHECK (budget_type IN ('category', 'independent')),
      status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
      created_by INT REFERENCES users(id),
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;

  // Create sub_expenses table
  await sql`
    CREATE TABLE IF NOT EXISTS sub_expenses (
      id SERIAL PRIMARY KEY,
      expense_id INT REFERENCES expenses(id) ON DELETE CASCADE,
      name VARCHAR(255) NOT NULL,
      amount DECIMAL(15, 2) NOT NULL,
      description TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;

  console.log('  Tables created');
}

async function resetDatabase() {
  console.log('Resetting database...');

  try {
    await sql`DELETE FROM sub_expenses`;
    await sql`DELETE FROM sub_budgets`;
    await sql`DELETE FROM expense_receipts`;
    await sql`DELETE FROM expenses`;
    await sql`DELETE FROM budget_allotments`;
    await sql`DELETE FROM budget_plans`;
    await sql`DELETE FROM activity_events`;
    await sql`DELETE FROM audit_logs`;
    await sql`DELETE FROM sessions`;
    await sql`DELETE FROM users`;
    await sql`DELETE FROM categories`;
    await sql`DELETE FROM departments`;
    console.log('  Tables cleared');
  } catch (error:  any) {
    console.error('  Reset error:', error. message);
  }
}

async function seed() {
  // Department
  console.log('Creating department...');
  await sql`
    INSERT INTO departments (id, name, code, academic_year)
    VALUES (1, 'Computer Science and Business Systems', 'CSBS', '2024-25')
    ON CONFLICT (id) DO NOTHING
  `;

  // Categories
  console.log('Creating categories...');
  const categories = [
    { id: 1, name: 'Infrastructure', desc: 'Lab setup, repairs, furniture' },
    { id: 2, name: 'Hardware', desc: 'Computers, servers, networking' },
    { id: 3, name: 'Software', desc: 'Licenses, subscriptions' },
    { id: 4, name: 'Workshops & FDPs', desc: 'Faculty development programs' },
    { id: 5, name: 'Expert Sessions', desc: 'Guest lectures, honorarium' },
    { id: 6, name: 'Technical Events', desc: 'Hackathons, competitions' },
    { id: 7, name: 'Student Activities', desc: 'Club activities, projects' },
    { id: 8, name: 'Miscellaneous', desc:  'Stationery, printing' },
  ];

  for (const cat of categories) {
    await sql`
      INSERT INTO categories (id, name, description, is_active)
      VALUES (${cat. id}, ${cat. name}, ${cat. desc}, true)
      ON CONFLICT (id) DO UPDATE SET name = ${cat.name}
    `;
  }

  // Users
  console.log('Creating users...');
  const passwordHash = await bcrypt.hash('Admin@123', 12);

  const users = [
    { id: 1, name: 'System Administrator', email: 'admin@rscoe.edu.in', role: 'admin' },
    { id: 2, name: 'Dr. Kavita Moholkar', email: 'hod@rscoe.edu.in', role: 'hod' },
    { id: 3, name: 'CSBS Staff', email: 'staff@rscoe.edu.in', role: 'staff' },
  ];

  for (const u of users) {
    await sql`
      INSERT INTO users (id, department_id, name, email, password_hash, role, is_active)
      VALUES (${u. id}, 1, ${u. name}, ${u. email}, ${passwordHash}, ${u.role}, true)
      ON CONFLICT (id) DO UPDATE SET password_hash = ${passwordHash}, is_active = true
    `;
    console.log('  Created:  ' + u.email);
  }

  // Budget plans & allotments
  console.log('Creating budgets...');
  const fiscalYear = '2024-25';
  const budgets = [
    { cat: 1, proposed: 300000, allotted: 280000 },
    { cat: 2, proposed: 250000, allotted: 230000 },
    { cat: 3, proposed: 150000, allotted: 140000 },
    { cat: 4, proposed: 100000, allotted: 90000 },
    { cat: 5, proposed: 50000, allotted: 45000 },
    { cat: 6, proposed: 75000, allotted: 70000 },
    { cat: 7, proposed: 40000, allotted: 35000 },
    { cat: 8, proposed: 35000, allotted: 30000 },
  ];

  for (const b of budgets) {
    await sql`
      INSERT INTO budget_plans (department_id, category_id, fiscal_year, proposed_amount, created_by, status)
      VALUES (1, ${b. cat}, ${fiscalYear}, ${b. proposed}, 1, 'approved')
      ON CONFLICT (department_id, category_id, fiscal_year) DO UPDATE SET proposed_amount = ${b.proposed}
    `;
    await sql`
      INSERT INTO budget_allotments (department_id, category_id, fiscal_year, allotted_amount, approved_by, approved_at)
      VALUES (1, ${b.cat}, ${fiscalYear}, ${b.allotted}, 2, NOW())
      ON CONFLICT (department_id, category_id, fiscal_year) DO UPDATE SET allotted_amount = ${b.allotted}
    `;
  }

  // Sample sub-budgets
  console.log('Creating sub-budgets...');
  await sql`
    INSERT INTO sub_budgets (department_id, category_id, fiscal_year, name, description, amount, budget_type, created_by)
    VALUES 
      (1, 2, ${fiscalYear}, 'New Lab PCs', 'Purchase of 10 new computers for Lab 3', 150000, 'category', 2),
      (1, 6, ${fiscalYear}, 'Hackathon 2024', 'Annual department hackathon', 35000, 'category', 2),
      (1, NULL, ${fiscalYear}, 'Emergency Fund', 'Reserve for unexpected expenses', 50000, 'independent', 1),
      (1, NULL, ${fiscalYear}, 'Industry Collaboration', 'MoU signing and events', 75000, 'independent', 2)
  `;

  // Sample expenses
  console. log('Creating sample expenses...');
  const expenses = [
    { cat: 2, amount: 85000, vendor: 'Dell Technologies', date: '2024-06-15', desc: 'OptiPlex systems', status: 'approved' },
    { cat: 3, amount: 45000, vendor: 'Microsoft', date: '2024-07-01', desc:  'Azure credits', status: 'approved' },
    { cat: 4, amount: 35000, vendor: 'IIT Bombay', date: '2024-07-20', desc: 'FDP registration', status: 'approved' },
    { cat: 5, amount: 15000, vendor: 'Guest Speaker', date: '2024-08-10', desc: 'Lecture honorarium', status: 'pending' },
    { cat: 6, amount: 50000, vendor: 'Event Co', date: '2024-09-15', desc: 'Hackathon prizes', status: 'pending' },
    { cat: 1, amount: 120000, vendor: 'Godrej', date: '2024-10-01', desc: 'Lab furniture', status: 'rejected' },
  ];

  for (const e of expenses) {
    const result = await sql`
      INSERT INTO expenses (department_id, category_id, amount, vendor, expense_date, description, status, created_by)
      VALUES (1, ${e.cat}, ${e.amount}, ${e.vendor}, ${e.date}, ${e.desc}, ${e.status}, 3)
      RETURNING id
    `;
    console.log('  Expense:  ' + e.vendor + ' (' + e.status + ')');

    // Add sub-expenses for the hackathon expense
    if (e.vendor === 'Event Co') {
      const expenseId = result[0].id;
      await sql`
        INSERT INTO sub_expenses (expense_id, name, amount, description)
        VALUES 
          (${expenseId}, 'Prize Money - 1st Place', 20000, 'Winner team'),
          (${expenseId}, 'Prize Money - 2nd Place', 15000, 'Runner up'),
          (${expenseId}, 'Refreshments', 8000, 'Food and beverages'),
          (${expenseId}, 'Certificates & Trophies', 7000, 'Printing and awards')
      `;
      console.log('    Added sub-expenses');
    }
  }

  console.log('\nDatabase seeded successfully!');
  console.log('\nLogin credentials:');
  console.log('  admin@rscoe.edu.in / Admin@123');
  console.log('  hod@rscoe.edu.in / Admin@123');
  console.log('  staff@rscoe.edu.in / Admin@123');
}

async function main() {
  const shouldReset = process.argv.includes('--reset') || process.argv. includes('-r');

  try {
    await createTables();
    if (shouldReset) {
      await resetDatabase();
    }
    await seed();
  } catch (error) {
    console.error('Seed failed:', error);
    process.exit(1);
  }

  process.exit(0);
}

main();