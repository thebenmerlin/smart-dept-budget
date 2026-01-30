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

  // Create budgets table (new unified budgets)
  await sql`
    CREATE TABLE IF NOT EXISTS budgets (
      id SERIAL PRIMARY KEY,
      department_id INT REFERENCES departments(id) ON DELETE CASCADE,
      category_id INT REFERENCES categories(id) ON DELETE SET NULL,
      name VARCHAR(255) NOT NULL,
      amount DECIMAL(15, 2) NOT NULL DEFAULT 0,
      description TEXT,
      source VARCHAR(255),
      payment_method VARCHAR(50) DEFAULT 'cash' CHECK (payment_method IN ('cash', 'cheque', 'online', 'other')),
      budget_date DATE NOT NULL DEFAULT CURRENT_DATE,
      fiscal_year VARCHAR(20) NOT NULL,
      status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
      created_by INT REFERENCES users(id),
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;

  // Create budget_breakdowns table
  await sql`
    CREATE TABLE IF NOT EXISTS budget_breakdowns (
      id SERIAL PRIMARY KEY,
      budget_id INT REFERENCES budgets(id) ON DELETE CASCADE,
      name VARCHAR(255) NOT NULL,
      amount DECIMAL(15, 2) NOT NULL,
      payment_method VARCHAR(50) DEFAULT 'cash' CHECK (payment_method IN ('cash', 'cheque', 'online', 'other')),
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;

  // Create expenses table (updated)
  await sql`
    CREATE TABLE IF NOT EXISTS expenses_new (
      id SERIAL PRIMARY KEY,
      department_id INT REFERENCES departments(id) ON DELETE CASCADE,
      budget_id INT REFERENCES budgets(id) ON DELETE SET NULL,
      category_id INT REFERENCES categories(id) ON DELETE SET NULL,
      name VARCHAR(255) NOT NULL,
      amount DECIMAL(15, 2) NOT NULL,
      description TEXT,
      spender VARCHAR(255),
      payment_method VARCHAR(50) DEFAULT 'cash' CHECK (payment_method IN ('cash', 'cheque', 'online', 'other')),
      expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
      status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
      rejection_reason TEXT,
      created_by INT REFERENCES users(id),
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;

  // Create expense_breakdowns table
  await sql`
    CREATE TABLE IF NOT EXISTS expense_breakdowns (
      id SERIAL PRIMARY KEY,
      expense_id INT REFERENCES expenses_new(id) ON DELETE CASCADE,
      name VARCHAR(255) NOT NULL,
      amount DECIMAL(15, 2) NOT NULL,
      breakdown_date DATE,
      payment_method VARCHAR(50) DEFAULT 'cash' CHECK (payment_method IN ('cash', 'cheque', 'online', 'other')),
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;

  // Create expense_receipts table
  await sql`
    CREATE TABLE IF NOT EXISTS expense_receipts_new (
      id SERIAL PRIMARY KEY,
      expense_id INT REFERENCES expenses_new(id) ON DELETE CASCADE,
      file_name VARCHAR(255) NOT NULL,
      file_url TEXT NOT NULL,
      file_type VARCHAR(100),
      file_size INT,
      uploaded_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;

  // Create semesters table
  await sql`
    CREATE TABLE IF NOT EXISTS semesters (
      id SERIAL PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      semester_number INT NOT NULL CHECK (semester_number IN (1, 2)),
      academic_year VARCHAR(20) NOT NULL,
      start_date DATE NOT NULL,
      end_date DATE NOT NULL,
      is_active BOOLEAN DEFAULT false,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(semester_number, academic_year)
    )
  `;

  console.log('Tables created');
}

async function resetDatabase() {
  console.log('Resetting database...');
  try {
    await sql`DROP TABLE IF EXISTS expense_receipts_new CASCADE`;
    await sql`DROP TABLE IF EXISTS expense_breakdowns CASCADE`;
    await sql`DROP TABLE IF EXISTS expenses_new CASCADE`;
    await sql`DROP TABLE IF EXISTS budget_breakdowns CASCADE`;
    await sql`DROP TABLE IF EXISTS budgets CASCADE`;
    await sql`DROP TABLE IF EXISTS semesters CASCADE`;
    console.log('Tables dropped');
  } catch (error: any) {
    console.error('Reset error:', error.message);
  }
}

async function seed() {
  console.log('Creating department...');
  await sql`
    INSERT INTO departments (id, name, code, academic_year)
    VALUES (1, 'Computer Science and Business Systems', 'CSBS', '2024-25')
    ON CONFLICT (id) DO UPDATE SET academic_year = '2024-25'
  `;

  console.log('Creating categories...');
  const categories = [
    { id: 1, name: 'Infrastructure', desc: 'Lab setup, repairs, furniture' },
    { id: 2, name: 'Hardware', desc: 'Computers, servers, networking equipment' },
    { id: 3, name: 'Software', desc: 'Licenses, subscriptions, tools' },
    { id: 4, name: 'Workshops & FDPs', desc: 'Faculty development programs' },
    { id: 5, name: 'Expert Sessions', desc: 'Guest lectures, honorarium' },
    { id: 6, name: 'Technical Events', desc: 'Hackathons, competitions, seminars' },
    { id: 7, name: 'Student Activities', desc: 'Club activities, projects' },
    { id: 8, name: 'Miscellaneous', desc: 'Stationery, printing, utilities' },
  ];

  for (const cat of categories) {
    await sql`
      INSERT INTO categories (id, name, description, is_active)
      VALUES (${cat.id}, ${cat.name}, ${cat.desc}, true)
      ON CONFLICT (id) DO UPDATE SET name = ${cat.name}, description = ${cat.desc}
    `;
  }

  console.log('Creating users...');
  const passwordHash = await bcrypt.hash('Admin@123', 12);
  const users = [
    { id: 1, name: 'System Administrator', email: 'admin@rscoe.edu.in', role: 'admin' },
    { id: 2, name: 'Dr. Kavita Moholkar', email: 'hod@rscoe.edu.in', role: 'hod' },
    { id: 3, name: 'Prof. Rahul Sharma', email: 'staff@rscoe.edu.in', role: 'staff' },
  ];

  for (const u of users) {
    await sql`
      INSERT INTO users (id, department_id, name, email, password_hash, role, is_active)
      VALUES (${u.id}, 1, ${u.name}, ${u.email}, ${passwordHash}, ${u.role}, true)
      ON CONFLICT (id) DO UPDATE SET password_hash = ${passwordHash}, is_active = true, name = ${u.name}
    `;
    console.log('  Created: ' + u.email);
  }

  console.log('Creating semesters...');
  await sql`
    INSERT INTO semesters (name, semester_number, academic_year, start_date, end_date, is_active)
    VALUES 
      ('Semester 1 (2025-26)', 1, '2025-26', '2025-07-01', '2025-12-31', true),
      ('Semester 2 (2025-26)', 2, '2025-26', '2026-01-01', '2026-06-30', false),
      ('Semester 1 (2024-25)', 1, '2024-25', '2024-07-01', '2024-12-31', false),
      ('Semester 2 (2024-25)', 2, '2024-25', '2025-01-01', '2025-06-30', false)
  `;
  console.log('  Created 4 semesters');

  const fiscalYear = '2025-26';

  console.log('Creating comprehensive budgets...');
  const budgetResults = await sql`
    INSERT INTO budgets (department_id, category_id, name, amount, description, source, payment_method, budget_date, fiscal_year, status, created_by)
    VALUES 
      (1, 2, 'Lab Computer Upgrade', 250000, 'Purchase of 20 new Dell OptiPlex computers for Lab 3 with monitors and peripherals', 'College Fund', 'cheque', '2025-08-15', ${fiscalYear}, 'active', 2),
      (1, 6, 'TechFest Hackathon 2025', 75000, 'Annual department hackathon with cash prizes, food, and certificates', 'Industry Sponsorship', 'online', '2025-09-01', ${fiscalYear}, 'active', 2),
      (1, 3, 'Annual Software Licenses', 120000, 'MATLAB, Microsoft Office 365, and JetBrains IDE licenses for faculty and students', 'Department Budget', 'online', '2025-07-10', ${fiscalYear}, 'active', 1),
      (1, 4, 'AI/ML Faculty Development Program', 85000, '5-day FDP on Artificial Intelligence and Machine Learning for faculty members', 'AICTE Grant', 'cheque', '2025-10-01', ${fiscalYear}, 'active', 2),
      (1, 1, 'Seminar Hall Renovation', 150000, 'New furniture, projector, and sound system for the department seminar hall', 'College Fund', 'cheque', '2025-11-01', ${fiscalYear}, 'completed', 1)
    RETURNING id, name
  `;

  // Add breakdowns for Hackathon budget
  const hackathonBudget = budgetResults.find((b: any) => b.name === 'TechFest Hackathon 2025');
  if (hackathonBudget) {
    await sql`
      INSERT INTO budget_breakdowns (budget_id, name, amount, payment_method)
      VALUES 
        (${hackathonBudget.id}, 'Prize Pool (1st, 2nd, 3rd)', 35000, 'online'),
        (${hackathonBudget.id}, 'Food & Refreshments for 100 participants', 20000, 'cash'),
        (${hackathonBudget.id}, 'Marketing Materials & Posters', 8000, 'cash'),
        (${hackathonBudget.id}, 'Certificates & Swag Kits', 12000, 'cheque')
    `;
    console.log('  Added breakdowns for Hackathon budget');
  }

  // Add breakdowns for Lab Computer budget
  const labBudget = budgetResults.find((b: any) => b.name === 'Lab Computer Upgrade');
  if (labBudget) {
    await sql`
      INSERT INTO budget_breakdowns (budget_id, name, amount, payment_method)
      VALUES 
        (${labBudget.id}, '20x Dell OptiPlex 7080 CPU Units', 160000, 'cheque'),
        (${labBudget.id}, '20x Dell 24" LED Monitors', 60000, 'cheque'),
        (${labBudget.id}, '20x Keyboard & Mouse Combo', 15000, 'cash'),
        (${labBudget.id}, 'Networking & Installation Charges', 15000, 'cash')
    `;
    console.log('  Added breakdowns for Lab Computer budget');
  }

  // Add breakdowns for FDP budget
  const fdpBudget = budgetResults.find((b: any) => b.name === 'AI/ML Faculty Development Program');
  if (fdpBudget) {
    await sql`
      INSERT INTO budget_breakdowns (budget_id, name, amount, payment_method)
      VALUES 
        (${fdpBudget.id}, 'Resource Person Honorarium (2 experts x 5 days)', 50000, 'cheque'),
        (${fdpBudget.id}, 'Tea & Lunch for 30 participants x 5 days', 25000, 'cash'),
        (${fdpBudget.id}, 'Certificates & Study Materials', 10000, 'cash')
    `;
    console.log('  Added breakdowns for FDP budget');
  }

  console.log('Creating expenses linked to budgets...');

  // Expenses linked to Lab Computer budget
  const expense1 = await sql`
    INSERT INTO expenses_new (department_id, budget_id, category_id, name, amount, description, spender, payment_method, expense_date, status, created_by)
    VALUES (1, ${labBudget?.id || null}, 2, 'Dell OptiPlex Computers - Batch 1', 120000, 'First batch of 12 Dell OptiPlex 7080 systems with monitors', 'Admin Office', 'cheque', '2025-09-15', 'approved', 3)
    RETURNING id, name
  `;

  // Add breakdown for computer expense
  if (expense1[0]) {
    await sql`
      INSERT INTO expense_breakdowns (expense_id, name, amount, breakdown_date, payment_method)
      VALUES 
        (${expense1[0].id}, '12x Dell OptiPlex 7080 CPU', 80000, '2025-09-15', 'cheque'),
        (${expense1[0].id}, '12x Dell 24" Monitors', 32000, '2025-09-15', 'cheque'),
        (${expense1[0].id}, '12x Keyboard & Mouse Combo', 8000, '2025-09-16', 'cash')
    `;
    console.log('  Added breakdowns for Dell Computers expense');
  }

  // Expense linked to Hackathon budget
  const expense2 = await sql`
    INSERT INTO expenses_new (department_id, budget_id, category_id, name, amount, description, spender, payment_method, expense_date, status, created_by)
    VALUES (1, ${hackathonBudget?.id || null}, 6, 'Hackathon Prize Distribution', 35000, 'Cash prizes for Top 3 teams', 'Event Coordinator Prof. Sharma', 'online', '2025-09-25', 'approved', 3)
    RETURNING id
  `;

  // Expense pending approval
  await sql`
    INSERT INTO expenses_new (department_id, budget_id, category_id, name, amount, description, spender, payment_method, expense_date, status, created_by)
    VALUES (1, ${hackathonBudget?.id || null}, 6, 'Hackathon Refreshments', 18000, 'Tea, snacks, and lunch for 100 participants during the 24-hour hackathon', 'Student Committee', 'cash', '2025-09-24', 'pending', 3)
  `;
  console.log('  Created pending expense for approval demo');

  // Expense that was rejected
  await sql`
    INSERT INTO expenses_new (department_id, budget_id, category_id, name, amount, description, spender, payment_method, expense_date, status, rejection_reason, created_by)
    VALUES (1, NULL, 1, 'Premium Office Chairs', 95000, 'Executive ergonomic chairs for faculty cabins', 'Admin Office', 'cheque', '2025-10-05', 'rejected', 'Budget exceeded for infrastructure this quarter. Please resubmit in next quarter with revised quotation.', 3)
  `;
  console.log('  Created rejected expense with reason');

  // Standalone approved expense (no linked budget)
  await sql`
    INSERT INTO expenses_new (department_id, category_id, name, amount, description, spender, payment_method, expense_date, status, created_by)
    VALUES (1, 5, 'Industry Expert Guest Lecture', 15000, 'Honorarium for Mr. Rajesh Kumar from TCS for session on Cloud Computing', 'HOD Office', 'cheque', '2025-10-15', 'approved', 2)
  `;

  // Software license expense
  const softwareBudget = budgetResults.find((b: any) => b.name === 'Annual Software Licenses');
  await sql`
    INSERT INTO expenses_new (department_id, budget_id, category_id, name, amount, description, spender, payment_method, expense_date, status, created_by)
    VALUES (1, ${softwareBudget?.id || null}, 3, 'MATLAB Academic License', 45000, 'Annual MATLAB license for 50 seats', 'IT Department', 'online', '2025-08-01', 'approved', 1)
  `;

  console.log('\n✅ Database seeded successfully!');
  console.log('\n📊 Data Summary:');
  console.log('  • 1 Department (CSBS)');
  console.log('  • 8 Categories');
  console.log('  • 3 Users (Admin, HOD, Staff)');
  console.log('  • 4 Semesters (2 academic years)');
  console.log('  • 5 Budgets with breakdowns');
  console.log('  • 6 Expenses (approved, pending, rejected)');
  console.log('\n🔐 Login credentials (all passwords: Admin@123):');
  console.log('  • admin@rscoe.edu.in (Admin - full access)');
  console.log('  • hod@rscoe.edu.in (HOD - can approve/reject)');
  console.log('  • staff@rscoe.edu.in (Staff - can create only)');
}

async function main() {
  const shouldReset = process.argv.includes('--reset') || process.argv.includes('-r');

  try {
    if (shouldReset) {
      await resetDatabase();
    }
    await createTables();
    await seed();
  } catch (error) {
    console.error('Seed failed:', error);
    process.exit(1);
  }

  process.exit(0);
}

main();