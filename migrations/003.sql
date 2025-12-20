-- Sub-budgets for on-the-go budget items within categories
CREATE TABLE IF NOT EXISTS sub_budgets (
  id SERIAL PRIMARY KEY,
  department_id INT REFERENCES departments(id) ON DELETE CASCADE,
  category_id INT REFERENCES categories(id) ON DELETE CASCADE NULL,
  fiscal_year VARCHAR(20) NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  amount DECIMAL(15, 2) NOT NULL DEFAULT 0,
  budget_type VARCHAR(50) DEFAULT 'category' CHECK (budget_type IN ('category', 'independent')),
  status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
  created_by INT REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sub-expenses for expense breakdowns
CREATE TABLE IF NOT EXISTS sub_expenses (
  id SERIAL PRIMARY KEY,
  expense_id INT REFERENCES expenses(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  amount DECIMAL(15, 2) NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_sub_budgets_department ON sub_budgets(department_id);
CREATE INDEX IF NOT EXISTS idx_sub_budgets_category ON sub_budgets(category_id);
CREATE INDEX IF NOT EXISTS idx_sub_budgets_fiscal ON sub_budgets(fiscal_year);
CREATE INDEX IF NOT EXISTS idx_sub_budgets_type ON sub_budgets(budget_type);
CREATE INDEX IF NOT EXISTS idx_sub_expenses_expense ON sub_expenses(expense_id);

-- Add search indexes for text search
CREATE INDEX IF NOT EXISTS idx_expenses_vendor_search ON expenses USING gin(to_tsvector('english', vendor));
CREATE INDEX IF NOT EXISTS idx_expenses_description_search ON expenses USING gin(to_tsvector('english', coalesce(description, '')));
CREATE INDEX IF NOT EXISTS idx_sub_budgets_name_search ON sub_budgets USING gin(to_tsvector('english', name));