import { NextRequest, NextResponse } from 'next/server';
import { sql } from '../../../lib/db';
import { budgetSchema } from '../../../lib/validations';
import { requireRole } from '../../../lib/rbac';
import { logAudit } from '../../../lib/audit';

export async function GET(req: NextRequest) {
  const data = await sql`
    select bp.id, bp.department_id, bp.fiscal_year, bp.proposed_amount,
           ba.allotted_amount,
           (coalesce(ba.allotted_amount,0) - coalesce(bp.proposed_amount,0)) as variance
    from budget_plans bp
    left join budget_allotments ba
      on ba.department_id = bp.department_id and ba.fiscal_year = bp.fiscal_year
    order by bp.fiscal_year desc;
  `;
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const roleCheck = await requireRole(req, ['admin', 'hod']);
  if (roleCheck) return roleCheck;

  const body = await req.json();
  const parsed = budgetSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { department_id, fiscal_year, proposed_amount, allotted_amount, notes } = parsed.data;

  const [plan] = await sql`
    insert into budget_plans (department_id, fiscal_year, proposed_amount, notes)
    values (${department_id}, ${fiscal_year}, ${proposed_amount}, ${notes ?? null})
    on conflict (department_id, fiscal_year) do update set proposed_amount = excluded.proposed_amount, notes = excluded.notes
    returning *;
  `;
  await sql`
    insert into budget_allotments (department_id, fiscal_year, allotted_amount, notes)
    values (${department_id}, ${fiscal_year}, ${allotted_amount}, ${notes ?? null})
    on conflict (department_id, fiscal_year) do update set allotted_amount = excluded.allotted_amount, notes = excluded.notes;
  `;

  await logAudit('upsert', 'budget', { department_id, fiscal_year, proposed_amount, allotted_amount });
  return NextResponse.json(plan, { status: 201 });
}