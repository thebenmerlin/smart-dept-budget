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
    console.log('Tables dropped');
  } catch (error:  any) {
    console.error('Reset error:', error. message);
  }
}

async function seed() {
  console.log('Creating department...');
  await sql`
    INSERT INTO departments (id, name, code, academic_year)
    VALUES (1, 'Computer Science and Business Systems', 'CSBS', '2024-25')
    ON CONFLICT (id) DO NOTHING
  `;

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

  console.log('Creating users...');
  const passwordHash = await bcrypt.hash('Admin@123', 12);
  const users = [
    { id: 1, name: 'System Administrator', email: 'admin@rscoe.edu.in', role: 'admin' },
    { id: 2, name: 'Dr.  Kavita Moholkar', email: 'hod@rscoe.edu.in', role: 'hod' },
    { id: 3, name: 'CSBS Staff', email: 'staff@rscoe.edu.in', role: 'staff' },
  ];

  for (const u of users) {
    await sql`
      INSERT INTO users (id, department_id, name, email, password_hash, role, is_active)
      VALUES (${u. id}, 1, ${u. name}, ${u. email}, ${passwordHash}, ${u.role}, true)
      ON CONFLICT (id) DO UPDATE SET password_hash = ${passwordHash}, is_active = true
    `;
    console.log('Created:  ' + u.email);
  }

  const fiscalYear = '2024-25';

  console.log('Creating sample budgets...');
  const budgetResults = await sql`
    INSERT INTO budgets (department_id, category_id, name, amount, description, source, payment_method, budget_date, fiscal_year, created_by)
    VALUES 
      (1, 2, 'Lab Computer Upgrade', 250000, 'Purchase of 20 new computers for Lab 3', 'College Fund', 'cheque', '2024-04-15', ${fiscalYear}, 2),
      (1, 6, 'Hackathon 2024', 75000, 'Annual department hackathon event', 'Sponsorship', 'online', '2024-05-01', ${fiscalYear}, 2),
      (1, 3, 'Software Licenses', 150000, 'Annual software licenses renewal', 'Department Budget', 'online', '2024-04-01', ${fiscalYear}, 1),
      (1, 4, 'Faculty Development Program', 100000, 'FDP on AI/ML', 'AICTE Grant', 'cheque', '2024-06-15', ${fiscalYear}, 2),
      (1, 1, 'Lab Furniture', 180000, 'New furniture for seminar hall', 'College Fund', 'cheque', '2024-07-01', ${fiscalYear}, 1)
    RETURNING id, name
  `;

  // Add breakdowns for Hackathon budget
  const hackathonBudget = budgetResults.find((b: any) => b.name === 'Hackathon 2024');
  if (hackathonBudget) {
    await sql`
      INSERT INTO budget_breakdowns (budget_id, name, amount, payment_method)
      VALUES 
        (${hackathonBudget.id}, 'Prize Pool', 30000, 'online'),
        (${hackathonBudget.id}, 'Food & Refreshments', 20000, 'cash'),
        (${hackathonBudget.id}, 'Marketing & Posters', 10000, 'cash'),
        (${hackathonBudget.id}, 'Certificates & Swag', 15000, 'cheque')
    `;
  }

  console.log('Creating sample expenses...');
  const labBudget = budgetResults. find((b: any) => b.name === 'Lab Computer Upgrade');
  
  const expenseResults = await sql`
    INSERT INTO expenses_new (department_id, budget_id, category_id, name, amount, description, spender, payment_method, expense_date, status, created_by)
    VALUES 
      (1, ${labBudget?. id || null}, 2, 'Dell OptiPlex Computers', 180000, 'Purchase of 15 Dell OptiPlex systems', 'Admin Office', 'cheque', '2024-06-15', 'approved', 3),
      (1, ${hackathonBudget?.id || null}, 6, 'Hackathon Prizes', 25000, 'Cash prizes for winners', 'Event Committee', 'cash', '2024-09-20', 'approved', 3),
      (1, NULL, 3, 'Microsoft Office Licenses', 45000, 'Annual subscription renewal', 'IT Department', 'online', '2024-07-01', 'approved', 3),
      (1, NULL, 5, 'Guest Lecture Honorarium', 15000, 'Payment to industry expert', 'HOD Office', 'cheque', '2024-08-10', 'pending', 3),
      (1, NULL, 1, 'Lab Repairs', 35000, 'Air conditioning repair', 'Maintenance', 'cash', '2024-10-01', 'rejected', 3)
    RETURNING id, name
  `;

  // Add breakdowns for computer expense
  const computerExpense = expenseResults.find((e: any) => e.name === 'Dell OptiPlex Computers');
  if (computerExpense) {
    await sql`
      INSERT INTO expense_breakdowns (expense_id, name, amount, breakdown_date, payment_method)
      VALUES 
        (${computerExpense.id}, 'CPU Units', 120000, '2024-06-15', 'cheque'),
        (${computerExpense.id}, 'Monitors', 45000, '2024-06-15', 'cheque'),
        (${computerExpense.id}, 'Keyboards & Mice', 15000, '2024-06-16', 'cash')
    `;
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
    if (shouldReset) {
      await resetDatabase();
    }
    await createTables();
    await seed();
  } catch (error) {
    console. error('Seed failed:', error);
    process.exit(1);
  }

  process.exit(0);
}

main();