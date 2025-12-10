import { NextRequest, NextResponse } from 'next/server';
import { sql } from '../../../../lib/db';
import { expenseSchema } from '../../../../lib/validations';
import { requireRole } from '../../../../lib/rbac';
import { logAudit } from '../../../../lib/audit';

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const roleCheck = await requireRole(req, ['admin', 'hod']);
  if (roleCheck) return roleCheck;

  const body = await req.json();
  const parsed = expenseSchema.partial().safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const u = parsed.data;
  await sql`
    update expenses
    set category_id = coalesce(${u.category_id}, category_id),
        event_id = coalesce(${u.event_id ?? null}, event_id),
        amount = coalesce(${u.amount}, amount),
        vendor = coalesce(${u.vendor}, vendor),
        expense_date = coalesce(${u.expense_date}, expense_date),
        description = coalesce(${u.description}, description),
        status = coalesce(${u.status}, status)
    where id = ${params.id};
  `;

  await logAudit('update', 'expense', { id: params.id, updates: u });
  return NextResponse.json({ ok: true });
}