import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request:  NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { success: false, error:  'Unauthorized' },
        { status: 401 }
      );
    }

    const url = new URL(request.url);
    const expenseId = url. searchParams.get('expense_id');

    if (!expenseId) {
      return NextResponse.json(
        { success:  false, error: 'expense_id is required' },
        { status: 400 }
      );
    }

    const subExpenses = await sql`
      SELECT 
        se.*
      FROM sub_expenses se
      INNER JOIN expenses e ON e.id = se. expense_id
      WHERE se.expense_id = ${parseInt(expenseId)}
        AND e.department_id = ${user.department_id}
      ORDER BY se.created_at DESC
    `;

    return NextResponse.json({
      success: true,
      data:  subExpenses,
    });
  } catch (err) {
    console.error('Sub-expenses GET error:', err);
    const message = err instanceof Error ?  err.message : 'Unknown error';
    return NextResponse.json(
      { success:  false, error: message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { expense_id, items } = body;

    if (!expense_id) {
      return NextResponse.json(
        { success: false, error: 'expense_id is required' },
        { status: 400 }
      );
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { success: false, error: 'items array is required' },
        { status: 400 }
      );
    }

    // Verify the expense belongs to the user's department
    const expenseCheck = await sql`
      SELECT id FROM expenses 
      WHERE id = ${expense_id} AND department_id = ${user.department_id}
    `;

    if (expenseCheck.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Expense not found' },
        { status:  404 }
      );
    }

    // Insert all sub-expenses
    const insertedItems = [];
    for (const item of items) {
      if (! item.name || item.amount === undefined || item.amount === null) {
        continue;
      }

      const result = await sql`
        INSERT INTO sub_expenses (expense_id, name, amount, description)
        VALUES (
          ${expense_id},
          ${item.name},
          ${parseFloat(item.amount)},
          ${item.description || null}
        )
        RETURNING *
      `;
      insertedItems.push(result[0]);
    }

    return NextResponse.json({
      success: true,
      data:  insertedItems,
      message: 'Sub-expenses created successfully',
    });
  } catch (err) {
    console. error('Sub-expenses POST error:', err);
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json(
      { success: false, error:  message },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const url = new URL(request.url);
    const id = url.searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success:  false, error: 'Sub-expense ID is required' },
        { status: 400 }
      );
    }

    // Verify the sub-expense belongs to an expense in the user's department
    const check = await sql`
      SELECT se.id 
      FROM sub_expenses se
      INNER JOIN expenses e ON e.id = se.expense_id
      WHERE se.id = ${parseInt(id)} AND e.department_id = ${user.department_id}
    `;

    if (check. length === 0) {
      return NextResponse.json(
        { success: false, error: 'Sub-expense not found' },
        { status: 404 }
      );
    }

    await sql`
      DELETE FROM sub_expenses 
      WHERE id = ${parseInt(id)}
    `;

    return NextResponse. json({
      success: true,
      message:  'Sub-expense deleted successfully',
    });
  } catch (err) {
    console.error('Sub-expenses DELETE error:', err);
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json(
      { success: false, error: message },
      { status:  500 }
    );
  }
}