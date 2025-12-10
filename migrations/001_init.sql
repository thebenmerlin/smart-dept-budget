-- Users & Roles
create table if not exists roles (
  id serial primary key,
  name text unique not null
);

create table if not exists permissions (
  id serial primary key,
  key text unique not null
);

create table if not exists role_permissions (
  role_id int references roles(id),
  permission_id int references permissions(id),
  primary key (role_id, permission_id)
);

create table if not exists departments (
  id serial primary key,
  name text not null,
  year int
);

create table if not exists users (
  id serial primary key,
  department_id int references departments(id),
  name text not null,
  email text unique not null,
  password_hash text not null,
  role text not null check (role in ('admin','hod','staff'))
);

create table if not exists categories (
  id serial primary key,
  name text unique not null,
  description text
);

create table if not exists activity_events (
  id serial primary key,
  department_id int references departments(id),
  name text not null,
  type text,
  start_date date,
  end_date date
);

create table if not exists budget_plans (
  id serial primary key,
  department_id int references departments(id),
  fiscal_year text not null,
  proposed_amount numeric not null default 0,
  notes text,
  unique(department_id, fiscal_year)
);

create table if not exists budget_allotments (
  id serial primary key,
  department_id int references departments(id),
  fiscal_year text not null,
  allotted_amount numeric not null default 0,
  notes text,
  unique(department_id, fiscal_year)
);

create table if not exists expenses (
  id serial primary key,
  department_id int references departments(id),
  category_id int references categories(id),
  event_id int references activity_events(id),
  amount numeric not null,
  vendor text,
  expense_date date not null,
  description text,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  created_by int references users(id),
  approved_by int references users(id)
);

create table if not exists expense_receipts (
  id serial primary key,
  expense_id int references expenses(id) on delete cascade,
  public_id text not null,
  url text not null,
  mime_type text,
  size_bytes int
);

create table if not exists audit_logs (
  id serial primary key,
  user_id int references users(id),
  action text not null,
  entity text not null,
  payload jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_expenses_date on expenses(expense_date);
create index if not exists idx_expenses_category on expenses(category_id);
create index if not exists idx_expenses_event on expenses(event_id);

-- Analytics helper view examples
create or replace view v_monthly_expenses as
select date_trunc('month', expense_date) as month, sum(amount) as total
from expenses group by 1;

create or replace view v_category_expenses as
select c.name as category, sum(e.amount) as total
from expenses e join categories c on c.id = e.category_id
group by c.name;