import { NextRequest, NextResponse } from 'next/server';
import { sql } from '../../../lib/db';
import { expenseSchema, filtersSchema } from '../../../lib/validations';
import { requireRole } from '../../../lib/rbac';
import { logAudit } from '../../../lib/audit';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const filters = filtersSchema.parse({
    category: searchParams.get('category') ?? undefined,
    vendor: searchParams.get('vendor') ?? undefined,
    date_from: searchParams.get('date_from') ?? undefined,
    date_to: searchParams.get('date_to') ?? undefined,
    status: searchParams.get('status') ?? undefined
  });

  const rows = await sql`
    select e.*, c.name as category_name, ev.name as event_name
    from expenses e
    left join categories c on c.id = e.category_id
    left join activity_events ev on ev.id = e.event_id
    where (${filters.category} is null or c.name = ${filters.category})
      and (${filters.vendor} is null or e.vendor ilike ${'%' + filters.vendor + '%'})
      and (${filters.status} is null or e.status = ${filters.status})
      and (${filters.date_from} is null or e.expense_date >= ${filters.date_from})
      and (${filters.date_to} is null or e.expense_date <= ${filters.date_to})
    order by expense_date desc;
  `;
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const roleCheck = await requireRole(req, ['admin', 'hod', 'staff']);
  if (roleCheck) return roleCheck;

  const body = await req.json();
  const parsed = expenseSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const {
    department_id, category_id, event_id, amount, vendor, expense_date, description, status, receipts
  } = parsed.data;

  const [row] = await sql`
    insert into expenses (department_id, category_id, event_id, amount, vendor, expense_date, description, status)
    values (${department_id}, ${category_id}, ${event_id ?? null}, ${amount}, ${vendor}, ${expense_date}, ${description ?? null}, ${status})
    returning *;
  `;

  if (receipts?.length) {
    const values = receipts.map(r => sql`
      insert into expense_receipts (expense_id, public_id, url, mime_type, size_bytes)
      values (${row.id}, ${r.public_id}, ${r.url}, ${r.mime_type}, ${r.size_bytes});
    `);
    await Promise.all(values);
  }

  await logAudit('insert', 'expense', { id: row.id });
  return NextResponse.json(row, { status: 201 });
}