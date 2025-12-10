import { NextRequest, NextResponse } from 'next/server';
import { sql } from '../../../../lib/db';
import { budgetSchema } from '../../../../lib/validations';
import { requireRole } from '../../../../lib/rbac';
import { logAudit } from '../../../../lib/audit';

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const [row] = await sql`select * from budget_plans where id = ${params.id}`;
  if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(row);
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const roleCheck = await requireRole(req, ['admin', 'hod']);
  if (roleCheck) return roleCheck;

  const body = await req.json();
  const parsed = budgetSchema.partial().safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const updates = parsed.data;
  await sql`
    update budget_plans
    set proposed_amount = coalesce(${updates.proposed_amount}, proposed_amount),
        fiscal_year = coalesce(${updates.fiscal_year}, fiscal_year),
        notes = coalesce(${updates.notes}, notes)
    where id = ${params.id};
  `;

  if (updates.allotted_amount !== undefined) {
    await sql`
      update budget_allotments
      set allotted_amount = ${updates.allotted_amount}
      where department_id = (select department_id from budget_plans where id=${params.id})
        and fiscal_year = (select fiscal_year from budget_plans where id=${params.id});
    `;
  }

  await logAudit('update', 'budget', { id: params.id, updates });
  return NextResponse.json({ ok: true });
}