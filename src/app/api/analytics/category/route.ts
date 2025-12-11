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
      select c.name as category, sum(e.amount) as total
      from expenses e
      join categories c on c.id = e.category_id
      where e.department_id = ${user.department_id}
      group by c.name
      order by total desc;
    `;
    return NextResponse.json(rows);
  } catch (error) {
    console.error('Category analytics error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}