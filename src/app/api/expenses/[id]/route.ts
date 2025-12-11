import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getCurrentUser, canPerformAction } from '@/lib/auth';
import { createAuditLog } from '@/lib/audit';
import { expenseApprovalSchema, expenseSchema, validateRequest } from '@/lib/validations';

export const dynamic = 'force-dynamic';

// GET - Get single expense
export async function GET(
  request: NextRequest,
  { params }:  { params:  { id: string } }
) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse. json(
        { success: false, error:  'Unauthorized' },
        { status: 401 }
      );
    }

    const { id } = await params;
    const expenseId = parseInt(id);

    const expenses = await sql`
      SELECT 
        e.*,
        c. name as category_name,
        ae.name as event_name,
        u.name as created_by_name,
        au.name as approved_by_name,
        (
          SELECT json_agg(json_build_object(
            'id', er.id,
            'filename', er. original_filename,
            'url', er.cloudinary_url,
            'size', er.size_bytes
          ))
          FROM expense_receipts er
          WHERE er.expense_id = e.id
        ) as receipts
      FROM expenses e
      JOIN categories c ON c.id = e.category_id
      LEFT JOIN activity_events ae ON ae.id = e. event_id
      LEFT JOIN users u ON u.id = e.created_by
      LEFT JOIN users au ON au.id = e.approved_by
      WHERE e. id = ${expenseId} AND e. department_id = ${user.department_id}
    `;

    if (expenses.length === 0) {
      return NextResponse.json(
        { success:  false, error: 'Expense not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data:  expenses[0],
    });
  } catch (error) {
    console.error('Expense GET API error:', error);
    return NextResponse. json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT - Update expense or approve/reject
export async function PUT(
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

    const { id } = await params;
    const expenseId = parseInt(id);
    const body = await request.json();

    // Check if this is an approval action
    if (body. status && ['approved', 'rejected'].includes(body.status)) {
      // Only HOD and Admin can approve
      if (! canPerformAction(user.role, 'approve')) {
        return NextResponse. json(
          { success: false, error: 'Only HOD or Admin can approve expenses' },
          { status: 403 }
        );
      }

      const validation = validateRequest(expenseApprovalSchema, body);

      if (!validation.success) {
        return NextResponse. json(
          { success: false, error: validation.error },
          { status:  400 }
        );
      }

      // Get current expense
      const current = await sql`
        SELECT * FROM expenses WHERE id = ${expenseId} AND department_id = ${user.department_id}
      `;

      if (current. length === 0) {
        return NextResponse.json(
          { success: false, error: 'Expense not found' },
          { status: 404 }
        );
      }

      // Update status
      const result = await sql`
        UPDATE expenses
        SET 
          status = ${body.status},
          approved_by = ${user. id},
          approved_at = NOW(),
          rejection_reason = ${body.rejection_reason || null},
          updated_at = NOW()
        WHERE id = ${expenseId}
        RETURNING *
      `;

      await createAuditLog({
        userId:  user.id,
        action: body. status === 'approved' ? 'APPROVE_EXPENSE' : 'REJECT_EXPENSE',
        entityType: 'expense',
        entityId: expenseId,
        oldValues: { status:  current[0].status },
        newValues: { status: body.status, rejection_reason: body.rejection_reason },
      });

      return NextResponse.json({
        success: true,
        data: result[0],
      });
    }

    // Regular update (only by creator and if pending)
    const current = await sql`
      SELECT * FROM expenses WHERE id = ${expenseId} AND department_id = ${user.department_id}
    `;

    if (current.length === 0) {
      return NextResponse. json(
        { success: false, error: 'Expense not found' },
        { status: 404 }
      );
    }

    // Check if user can edit
    if (current[0].created_by !== user. id && user.role === 'staff') {
      return NextResponse.json(
        { success:  false, error: 'You can only edit your own expenses' },
        { status:  403 }
      );
    }

    // Cannot edit approved/rejected expenses (unless admin)
    if (current[0].status !== 'pending' && user.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Cannot edit expenses that are already processed' },
        { status: 400 }
      );
    }

    const validation = validateRequest(expenseSchema. partial(), body);

    if (!validation.success) {
      return NextResponse.json(
        { success:  false, error: validation.error },
        { status: 400 }
      );
    }

    const { category_id, event_id, amount, vendor, expense_date, description, invoice_number } = validation.data;

    const result = await sql`
      UPDATE expenses
      SET 
        category_id = COALESCE(${category_id}, category_id),
        event_id = COALESCE(${event_id}, event_id),
        amount = COALESCE(${amount}, amount),
        vendor = COALESCE(${vendor}, vendor),
        expense_date = COALESCE(${expense_date}, expense_date),
        description = COALESCE(${description}, description),
        invoice_number = COALESCE(${invoice_number}, invoice_number),
        updated_at = NOW()
      WHERE id = ${expenseId}
      RETURNING *
    `;

    await createAuditLog({
      userId:  user.id,
      action: 'UPDATE_EXPENSE',
      entityType: 'expense',
      entityId:  expenseId,
      oldValues: current[0],
      newValues: validation.data,
    });

    return NextResponse.json({
      success: true,
      data: result[0],
    });
  } catch (error) {
    console.error('Expense PUT API error:', error);
    return NextResponse.json(
      { success: false, error:  'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE - Delete expense (only pending, by creator or admin)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { success: false, error:  'Unauthorized' },
        { status: 401 }
      );
    }

    const { id } = await params;
    const expenseId = parseInt(id);

    const current = await sql`
      SELECT * FROM expenses WHERE id = ${expenseId} AND department_id = ${user.department_id}
    `;

    if (current. length === 0) {
      return NextResponse.json(
        { success: false, error: 'Expense not found' },
        { status: 404 }
      );
    }

    // Check permissions
    if (current[0].created_by !== user.id && user.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'You can only delete your own expenses' },
        { status: 403 }
      );
    }

    if (current[0]. status !== 'pending' && user.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Cannot delete processed expenses' },
        { status: 400 }
      );
    }

    await sql`DELETE FROM expenses WHERE id = ${expenseId}`;

    await createAuditLog({
      userId:  user.id,
      action: 'DELETE_EXPENSE',
      entityType:  'expense',
      entityId: expenseId,
      oldValues: current[0],
    });

    return NextResponse.json({
      success: true,
      message: 'Expense deleted successfully',
    });
  } catch (error) {
    console. error('Expense DELETE API error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}