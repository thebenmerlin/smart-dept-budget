import { NextResponse } from 'next/server';
import { sql } from '../../../../lib/db';
import { getCurrentUser } from '../../../../lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const rows = await sql`
      select fiscal_year, sum(amount) as spent,
        (select allotted_amount from budget_allotments ba where ba.fiscal_year = bp.fiscal_year and ba.department_id = ${user.department_id} limit 1) as allotted
      from budget_plans bp
      left join expenses e on e.department_id = bp.department_id and date_part('year', e.expense_date)::text = bp.fiscal_year
      where bp.department_id = ${user.department_id}
      group by fiscal_year
      order by fiscal_year desc;
    `;
    return NextResponse.json(rows);
  } catch (error) {
    console.error('Yearly analytics error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}