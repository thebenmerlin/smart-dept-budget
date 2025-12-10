import { NextResponse } from 'next/server';
import { sql } from '../../../../lib/db';

export async function GET() {
  const rows = await sql`
    select fiscal_year, sum(amount) as spent,
      (select allotted_amount from budget_allotments ba where ba.fiscal_year = bp.fiscal_year limit 1) as allotted
    from budget_plans bp
    left join expenses e on e.department_id = bp.department_id and date_part('year', e.expense_date)::text = bp.fiscal_year
    group by fiscal_year
    order by fiscal_year desc;
  `;
  return NextResponse.json(rows);
}