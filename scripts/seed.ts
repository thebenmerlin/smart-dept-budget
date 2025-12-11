import { neon } from '@neondatabase/serverless';
import bcrypt from 'bcryptjs';

const databaseUrl = process. env.DATABASE_URL;

if (!databaseUrl) {
  console.error('DATABASE_URL environment variable is not set');
  console.error('Make sure to run this script with the environment variables loaded: ');
  console.error('  npx dotenv -e .env.local -- npx tsx scripts/seed.ts');
  process.exit(1);
}

const sql = neon(databaseUrl);

async function seedUsers() {
  console.log('Seeding users...');

  const passwordHash = await bcrypt.hash('Admin@123', 12);

  const users = [
    { name: 'System Administrator', email: 'admin@rscoe.edu.in', role: 'admin' },
    { name: 'Dr. Rajesh Kumar', email: 'hod@rscoe.edu.in', role: 'hod' },
    { name: 'Prof. Sneha Patil', email: 'staff@rscoe.edu.in', role: 'staff' },
  ];

  for (const user of users) {
    try {
      await sql`
        INSERT INTO users (department_id, name, email, password_hash, role)
        VALUES (1, ${user.name}, ${user.email}, ${passwordHash}, ${user.role})
        ON CONFLICT (email) DO UPDATE SET
          password_hash = ${passwordHash},
          name = ${user.name}
      `;
      console.log('  Created user:  ' + user.email);
    } catch (error:  any) {
      console.error('  Failed to create user ' + user.email + ':', error.message);
    }
  }
}

async function seedCategories() {
  console.log('Seeding categories...');

  const categories = [
    { name: 'Infrastructure', description: 'Lab setup, repairs, furniture, civil works' },
    { name: 'Hardware', description: 'Computers, servers, networking equipment, peripherals' },
    { name: 'Software', description: 'Licenses, subscriptions, development tools' },
    { name: 'Workshops & FDPs', description: 'Faculty development programs, training sessions' },
    { name: 'Expert Sessions', description: 'Guest lectures, industry talks, honorarium' },
    { name: 'Technical Events', description: 'Hackathons, competitions, tech fests' },
    { name: 'Student Activities', description: 'Club activities, student competitions, projects' },
    { name: 'Miscellaneous', description: 'Stationery, printing, consumables, other expenses' },
  ];

  for (const category of categories) {
    try {
      await sql`
        INSERT INTO categories (name, description, is_active)
        VALUES (${category. name}, ${category. description}, true)
        ON CONFLICT DO NOTHING
      `;
      console.log('  Created category: ' + category. name);
    } catch (error: any) {
      // Ignore duplicate errors
    }
  }
}

async function seedDepartment() {
  console.log('Seeding department...');

  try {
    await sql`
      INSERT INTO departments (name, code, academic_year)
      VALUES ('Computer Science and Business Systems', 'CSBS', '2024-25')
      ON CONFLICT (code) DO NOTHING
    `;
    console.log('  Created department:  CSBS');
  } catch (error:  any) {
    console.error('  Failed to create department:', error.message);
  }
}

async function seedSampleData() {
  console.log('Seeding sample data...');

  const fiscalYear = '2024-25';

  // Sample budget plans
  const budgetPlans = [
    { category_id: 1, proposed_amount: 300000 },
    { category_id: 2, proposed_amount:  250000 },
    { category_id:  3, proposed_amount: 150000 },
    { category_id:  4, proposed_amount: 100000 },
    { category_id:  5, proposed_amount: 50000 },
    { category_id: 6, proposed_amount: 75000 },
    { category_id:  7, proposed_amount: 40000 },
    { category_id:  8, proposed_amount: 35000 },
  ];

  for (const plan of budgetPlans) {
    try {
      await sql`
        INSERT INTO budget_plans (department_id, category_id, fiscal_year, proposed_amount, created_by, status)
        VALUES (1, ${plan. category_id}, ${fiscalYear}, ${plan.proposed_amount}, 1, 'approved')
        ON CONFLICT (department_id, category_id, fiscal_year) DO UPDATE SET
          proposed_amount = ${plan. proposed_amount}
      `;
    } catch (error) {
      // Ignore errors
    }
  }

  // Sample budget allotments
  const allotments = [
    { category_id: 1, allotted_amount: 280000 },
    { category_id: 2, allotted_amount: 230000 },
    { category_id:  3, allotted_amount: 140000 },
    { category_id:  4, allotted_amount: 90000 },
    { category_id:  5, allotted_amount: 45000 },
    { category_id:  6, allotted_amount: 70000 },
    { category_id:  7, allotted_amount: 35000 },
    { category_id: 8, allotted_amount:  30000 },
  ];

  for (const allotment of allotments) {
    try {
      await sql`
        INSERT INTO budget_allotments (department_id, category_id, fiscal_year, allotted_amount, approved_by, approved_at)
        VALUES (1, ${allotment.category_id}, ${fiscalYear}, ${allotment. allotted_amount}, 2, NOW())
        ON CONFLICT (department_id, category_id, fiscal_year) DO UPDATE SET
          allotted_amount = ${allotment. allotted_amount}
      `;
    } catch (error) {
      // Ignore errors
    }
  }

  // Sample expenses
  const expenses = [
    { category_id: 2, amount: 85000, vendor: 'Dell Technologies', date: '2024-06-15', description: 'Dell OptiPlex systems for AI Lab', status: 'approved' },
    { category_id: 3, amount: 45000, vendor: 'Microsoft Azure', date: '2024-07-01', description: 'Azure cloud credits annual subscription', status: 'approved' },
    { category_id: 4, amount: 35000, vendor: 'IIT Bombay', date: '2024-07-20', description: 'FDP registration and hospitality', status: 'approved' },
    { category_id: 5, amount: 15000, vendor: 'Dr. Tech Expert', date: '2024-08-10', description: 'Guest lecture honorarium', status: 'approved' },
    { category_id: 6, amount: 50000, vendor: 'Event Solutions', date: '2024-09-15', description: 'Hackathon prizes and logistics', status: 'approved' },
    { category_id:  1, amount: 120000, vendor: 'Godrej Interio', date: '2024-10-01', description: 'Lab furniture upgrade', status: 'pending' },
  ];

  for (const expense of expenses) {
    try {
      await sql`
        INSERT INTO expenses (department_id, category_id, amount, vendor, expense_date, description, status, created_by)
        VALUES (1, ${expense. category_id}, ${expense.amount}, ${expense.vendor}, ${expense.date}, ${expense.description}, ${expense.status}, 3)
      `;
    } catch (error) {
      // Ignore errors
    }
  }

  console.log('  Sample data seeded successfully');
}

async function main() {
  console.log('Starting database seed...\n');

  try {
    await seedDepartment();
    await seedCategories();
    await seedUsers();
    await seedSampleData();

    console.log('\n========================================');
    console.log('Database seed completed successfully! ');
    console.log('========================================\n');
    console.log('Default login credentials:');
    console.log('  Admin: admin@rscoe.edu.in / Admin@123');
    console.log('  HOD:   hod@rscoe.edu.in / Admin@123');
    console.log('  Staff: staff@rscoe.edu.in / Admin@123');
    console.log('');
  } catch (error) {
    console. error('Seed failed:', error);
    process.exit(1);
  }

  process.exit(0);
}

main();