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
      select date_trunc('month', expense_date) as month,
             sum(amount) as total
      from expenses
      where department_id = ${user.department_id}
      group by 1
      order by 1;
    `;
    return NextResponse.json(rows);
  } catch (error) {
    console.error('Monthly analytics error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}