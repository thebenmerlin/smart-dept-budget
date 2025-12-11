import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getCurrentUser, canPerformAction } from '@/lib/auth';
import { createAuditLog } from '@/lib/audit';
import { budgetPlanSchema, validateRequest } from '@/lib/validations';

export const dynamic = 'force-dynamic';

// GET - Get single budget
export async function GET(
  request: NextRequest,
  { params }:  { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id } = await params;
    const budgetId = parseInt(id);

    const budgets = await sql`
      SELECT bp.*, c.name as category_name
      FROM budget_plans bp
      JOIN categories c ON c.id = bp. category_id
      WHERE bp.id = ${budgetId} AND bp.department_id = ${user.department_id}
    `;

    if (budgets.length === 0) {
      return NextResponse. json(
        { success: false, error: 'Budget not found' },
        { status: 404 }
      );
    }

    return NextResponse. json({
      success: true,
      data:  budgets[0],
    });
  } catch (error) {
    console. error('Budget GET API error:', error);
    return NextResponse. json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT - Update budget
export async function PUT(
  request: NextRequest,
  { params }: { params:  { id: string } }
) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse. json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    if (! canPerformAction(user. role, 'manage_budgets')) {
      return NextResponse.json(
        { success: false, error: 'Permission denied' },
        { status: 403 }
      );
    }

    const { id } = await params;
    const budgetId = parseInt(id);
    const body = await request.json();

    // Get current budget
    const current = await sql`
      SELECT * FROM budget_plans 
      WHERE id = ${budgetId} AND department_id = ${user.department_id}
    `;

    if (current.length === 0) {
      return NextResponse.json(
        { success: false, error:  'Budget not found' },
        { status: 404 }
      );
    }

    const { proposed_amount, justification, status } = body;

    const result = await sql`
      UPDATE budget_plans
      SET 
        proposed_amount = COALESCE(${proposed_amount}, proposed_amount),
        justification = COALESCE(${justification}, justification),
        status = COALESCE(${status}, status),
        updated_at = NOW()
      WHERE id = ${budgetId}
      RETURNING *
    `;

    await createAuditLog({
      userId: user.id,
      action: 'UPDATE_BUDGET_PLAN',
      entityType: 'budget_plan',
      entityId: budgetId,
      oldValues: current[0],
      newValues: body,
    });

    return NextResponse. json({
      success: true,
      data:  result[0],
    });
  } catch (error) {
    console.error('Budget PUT API error:', error);
    return NextResponse.json(
      { success: false, error:  'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE - Delete budget
export async function DELETE(
  request:  NextRequest,
  { params }: { params: { id:  string } }
) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Only admin can delete budgets
    if (user.role !== 'admin') {
      return NextResponse. json(
        { success: false, error: 'Only admin can delete budgets' },
        { status: 403 }
      );
    }

    const { id } = await params;
    const budgetId = parseInt(id);

    const current = await sql`
      SELECT * FROM budget_plans 
      WHERE id = ${budgetId} AND department_id = ${user.department_id}
    `;

    if (current. length === 0) {
      return NextResponse.json(
        { success: false, error: 'Budget not found' },
        { status:  404 }
      );
    }

    await sql`DELETE FROM budget_plans WHERE id = ${budgetId}`;

    await createAuditLog({
      userId: user.id,
      action: 'DELETE_BUDGET_PLAN',
      entityType: 'budget_plan',
      entityId:  budgetId,
      oldValues: current[0],
    });

    return NextResponse.json({
      success: true,
      message: 'Budget deleted successfully',
    });
  } catch (error) {
    console.error('Budget DELETE API error:', error);
    return NextResponse.json(
      { success:  false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}