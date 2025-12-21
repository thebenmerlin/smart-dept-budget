import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const url = new URL(request.url);
    const subBudgetId = url.searchParams.get('sub_budget_id');

    if (!subBudgetId) {
      return NextResponse.json(
        { success: false, error: 'sub_budget_id is required' },
        { status: 400 }
      );
    }

    const subBudgetItems = await sql`
      SELECT 
        sbi.*
      FROM sub_budget_items sbi
      INNER JOIN sub_budgets sb ON sb.id = sbi.sub_budget_id
      WHERE sbi.sub_budget_id = ${parseInt(subBudgetId)}
        AND sb.department_id = ${user.department_id}
      ORDER BY sbi. created_at DESC
    `;

    return NextResponse.json({
      success: true,
      data:  subBudgetItems,
    });
  } catch (err) {
    console.error('Sub-budget-items GET error:', err);
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
    const { sub_budget_id, items } = body;

    if (!sub_budget_id) {
      return NextResponse.json(
        { success: false, error: 'sub_budget_id is required' },
        { status: 400 }
      );
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse. json(
        { success: false, error: 'items array is required' },
        { status: 400 }
      );
    }

    // Verify the sub-budget belongs to the user's department
    const subBudgetCheck = await sql`
      SELECT id FROM sub_budgets 
      WHERE id = ${sub_budget_id} AND department_id = ${user. department_id}
    `;

    if (subBudgetCheck.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Sub-budget not found' },
        { status: 404 }
      );
    }

    // Insert all sub-budget items
    const insertedItems = [];
    for (const item of items) {
      if (! item.name || item.amount === undefined || item.amount === null) {
        continue;
      }

      const result = await sql`
        INSERT INTO sub_budget_items (sub_budget_id, name, amount, description)
        VALUES (
          ${sub_budget_id},
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
      message: 'Sub-budget items created successfully',
    });
  } catch (err) {
    console.error('Sub-budget-items POST error:', err);
    const message = err instanceof Error ? err. message : 'Unknown error';
    return NextResponse.json(
      { success:  false, error: message },
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
        { success: false, error: 'Sub-budget item ID is required' },
        { status:  400 }
      );
    }

    // Verify the sub-budget item belongs to a sub-budget in the user's department
    const check = await sql`
      SELECT sbi.id 
      FROM sub_budget_items sbi
      INNER JOIN sub_budgets sb ON sb.id = sbi.sub_budget_id
      WHERE sbi.id = ${parseInt(id)} AND sb.department_id = ${user.department_id}
    `;

    if (check. length === 0) {
      return NextResponse.json(
        { success: false, error: 'Sub-budget item not found' },
        { status: 404 }
      );
    }

    await sql`
      DELETE FROM sub_budget_items 
      WHERE id = ${parseInt(id)}
    `;

    return NextResponse. json({
      success: true,
      message: 'Sub-budget item deleted successfully',
    });
  } catch (err) {
    console.error('Sub-budget-items DELETE error:', err);
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json(
      { success: false, error: message },
      { status:  500 }
    );
  }
}