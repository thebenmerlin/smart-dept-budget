import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getCurrentUser, canPerformAction } from '@/lib/auth';
import { createAuditLog } from '@/lib/audit';

export const dynamic = 'force-dynamic';

// GET single expense
export async function GET(
  request: NextRequest,
  { params }: { params:  { id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse. json({ success: false, error: 'Unauthorized' }, { status:  401 });
    }

    const id = parseInt(params.id);
    
    const expenses = await sql`
      SELECT e.*, c.name as category_name, u.name as created_by_name
      FROM expenses e
      JOIN categories c ON c.id = e.category_id
      LEFT JOIN users u ON u. id = e.created_by
      WHERE e.id = ${id} AND e.department_id = ${user. department_id}
    `;

    if (expenses.length === 0) {
      return NextResponse.json({ success: false, error: 'Expense not found' }, { status:  404 });
    }

    return NextResponse.json({ success: true, data: expenses[0] });
  } catch (error: any) {
    console. error('Expense GET error:', error);
    return NextResponse. json({ success: false, error: error.message }, { status: 500 });
  }
}

// PUT - Update expense (approve/reject)
export async function PUT(
  request: NextRequest,
  { params }: { params:  { id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse. json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const id = parseInt(params.id);
    const body = await request.json();
    const { status, rejection_reason } = body;

    // Check if expense exists
    const existing = await sql`
      SELECT * FROM expenses WHERE id = ${id} AND department_id = ${user.department_id}
    `;

    if (existing.length === 0) {
      return NextResponse.json({ success: false, error: 'Expense not found' }, { status: 404 });
    }

    // For approval/rejection, check permission
    if (status === 'approved' || status === 'rejected') {
      if (!canPerformAction(user. role, 'approve')) {
        return NextResponse.json({ success: false, error: 'Permission denied' }, { status:  403 });
      }
    }

    let result;
    if (status === 'approved') {
      result = await sql`
        UPDATE expenses 
        SET status = 'approved', approved_by = ${user.id}, approved_at = NOW(), updated_at = NOW()
        WHERE id = ${id}
        RETURNING *
      `;
    } else if (status === 'rejected') {
      result = await sql`
        UPDATE expenses 
        SET status = 'rejected', rejection_reason = ${rejection_reason || 'No reason provided'}, 
            approved_by = ${user.id}, approved_at = NOW(), updated_at = NOW()
        WHERE id = ${id}
        RETURNING *
      `;
    } else {
      return NextResponse.json({ success: false, error: 'Invalid status' }, { status: 400 });
    }

    try {
      await createAuditLog({
        userId: user.id,
        action: status === 'approved' ? 'APPROVE_EXPENSE' :  'REJECT_EXPENSE',
        entityType: 'expense',
        entityId: id,
        oldValues: { status:  existing[0].status },
        newValues:  { status, rejection_reason },
      });
    } catch (e) {
      console.error('Audit log error:', e);
    }

    return NextResponse. json({ success: true, data: result[0] });
  } catch (error:  any) {
    console.error('Expense PUT error:', error);
    return NextResponse.json({ success: false, error:  error.message }, { status: 500 });
  }
}

// DELETE expense
export async function DELETE(
  request:  NextRequest,
  { params }: { params: { id:  string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error:  'Unauthorized' }, { status: 401 });
    }

    const id = parseInt(params. id);

    const existing = await sql`
      SELECT * FROM expenses WHERE id = ${id} AND department_id = ${user.department_id}
    `;

    if (existing.length === 0) {
      return NextResponse. json({ success: false, error: 'Expense not found' }, { status: 404 });
    }

    // Only allow delete if pending and user is creator or admin
    if (existing[0].status !== 'pending') {
      return NextResponse.json({ success: false, error:  'Can only delete pending expenses' }, { status: 400 });
    }

    if (existing[0].created_by !== user.id && user.role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Permission denied' }, { status: 403 });
    }

    await sql`DELETE FROM expenses WHERE id = ${id}`;

    return NextResponse. json({ success: true, message: 'Expense deleted' });
  } catch (error: any) {
    console. error('Expense DELETE error:', error);
    return NextResponse. json({ success: false, error: error. message }, { status:  500 });
  }
}