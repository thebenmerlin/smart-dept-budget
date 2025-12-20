-- Drop old budget tables and recreate with category support
DROP TABLE IF EXISTS expense_receipts CASCADE;
DROP TABLE IF EXISTS expenses CASCADE;
DROP TABLE IF EXISTS budget_allotments CASCADE;
DROP TABLE IF EXISTS budget_plans CASCADE;
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS activity_events CASCADE;
DROP TABLE IF EXISTS categories CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS departments CASCADE;
DROP TABLE IF EXISTS roles CASCADE;
DROP TABLE IF EXISTS permissions CASCADE;
DROP TABLE IF EXISTS role_permissions CASCADE;
DROP TABLE IF EXISTS sessions CASCADE;

-- Departments
CREATE TABLE departments (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  code VARCHAR(50) UNIQUE NOT NULL,
  academic_year VARCHAR(20) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Users with password hash
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  department_id INT REFERENCES departments(id) ON DELETE SET NULL,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL CHECK (role IN ('admin', 'hod', 'staff')),
  is_active BOOLEAN DEFAULT TRUE,
  last_login TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sessions for authentication
CREATE TABLE sessions (
  id SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(id) ON DELETE CASCADE,
  token VARCHAR(255) UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Categories
CREATE TABLE categories (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Activity/Events
CREATE TABLE activity_events (
  id SERIAL PRIMARY KEY,
  department_id INT REFERENCES departments(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  event_type VARCHAR(100),
  start_date DATE,
  end_date DATE,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Budget Plans (Proposed) - Category-wise
CREATE TABLE budget_plans (
  id SERIAL PRIMARY KEY,
  department_id INT REFERENCES departments(id) ON DELETE CASCADE,
  category_id INT REFERENCES categories(id) ON DELETE CASCADE,
  fiscal_year VARCHAR(20) NOT NULL,
  proposed_amount DECIMAL(15, 2) NOT NULL DEFAULT 0,
  justification TEXT,
  created_by INT REFERENCES users(id),
  status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'approved', 'rejected')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(department_id, category_id, fiscal_year)
);

-- Budget Allotments (Allocated) - Category-wise
CREATE TABLE budget_allotments (
  id SERIAL PRIMARY KEY,
  department_id INT REFERENCES departments(id) ON DELETE CASCADE,
  category_id INT REFERENCES categories(id) ON DELETE CASCADE,
  fiscal_year VARCHAR(20) NOT NULL,
  allotted_amount DECIMAL(15, 2) NOT NULL DEFAULT 0,
  approved_by INT REFERENCES users(id),
  approved_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(department_id, category_id, fiscal_year)
);

-- Expenses
CREATE TABLE expenses (
  id SERIAL PRIMARY KEY,
  department_id INT REFERENCES departments(id) ON DELETE CASCADE,
  category_id INT REFERENCES categories(id) ON DELETE RESTRICT,
  event_id INT REFERENCES activity_events(id) ON DELETE SET NULL,
  amount DECIMAL(15, 2) NOT NULL,
  vendor VARCHAR(255) NOT NULL,
  expense_date DATE NOT NULL,
  description TEXT,
  invoice_number VARCHAR(100),
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_by INT REFERENCES users(id),
  approved_by INT REFERENCES users(id),
  approved_at TIMESTAMPTZ,
  rejection_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Expense Receipts
CREATE TABLE expense_receipts (
  id SERIAL PRIMARY KEY,
  expense_id INT REFERENCES expenses(id) ON DELETE CASCADE,
  filename VARCHAR(255) NOT NULL,
  original_filename VARCHAR(255) NOT NULL,
  cloudinary_public_id VARCHAR(255) NOT NULL,
  cloudinary_url TEXT NOT NULL,
  mime_type VARCHAR(100),
  size_bytes INT,
  uploaded_by INT REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Audit Logs
CREATE TABLE audit_logs (
  id SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(id) ON DELETE SET NULL,
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(100) NOT NULL,
  entity_id INT,
  old_values JSONB,
  new_values JSONB,
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_expenses_department ON expenses(department_id);
CREATE INDEX idx_expenses_category ON expenses(category_id);
CREATE INDEX idx_expenses_date ON expenses(expense_date);
CREATE INDEX idx_expenses_status ON expenses(status);
CREATE INDEX idx_budget_plans_fiscal ON budget_plans(fiscal_year);
CREATE INDEX idx_budget_allotments_fiscal ON budget_allotments(fiscal_year);
CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_sessions_token ON sessions(token);
CREATE INDEX idx_sessions_expires ON sessions(expires_at);

-- Insert default categories
INSERT INTO categories (name, description) VALUES
  ('Infrastructure', 'Lab setup, repairs, furniture, civil works'),
  ('Hardware', 'Computers, servers, networking equipment, peripherals'),
  ('Software', 'Licenses, subscriptions, development tools'),
  ('Workshops & FDPs', 'Faculty development programs, training sessions'),
  ('Expert Sessions', 'Guest lectures, industry talks, honorarium'),
  ('Technical Events', 'Hackathons, competitions, tech fests'),
  ('Student Activities', 'Club activities, student competitions, projects'),
  ('Miscellaneous', 'Stationery, printing, consumables, other expenses');

-- Insert default department
INSERT INTO departments (name, code, academic_year) VALUES
  ('Computer Science and Business Systems', 'CSBS', '2024-25');

-- Insert default admin user (password: Admin@123)
INSERT INTO users (department_id, name, email, password_hash, role) VALUES
  (1, 'System Administrator', 'admin@rscoe.edu.in', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4. HQgZU0j5MqVqPi', 'admin'),
  (1, 'Dr. Kavita Moholkar', 'hod@rscoe.edu.in', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.HQgZU0j5MqVqPi', 'hod'),
  (1, 'CSBS Staff', 'staff@rscoe.edu.in', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.HQgZU0j5MqVqPi', 'staff');