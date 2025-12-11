import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getCurrentUser, canPerformAction } from '@/lib/auth';
import { createAuditLog } from '@/lib/audit';
import { expenseApprovalSchema, expenseSchema, validateRequest } from '@/lib/validations';

export const dynamic = 'force-dynamic';

// GET - Get single expense
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
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

    if (isNaN(expenseId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid expense ID' },
        { status: 400 }
      );
    }

    const expenses = await sql`
      SELECT 
        e.*,
        c. name as category_name,
        ae.name as event_name,
        u.name as created_by_name,
        au. name as approved_by_name,
        (
          SELECT json_agg(json_build_object(
            'id', er. id,
            'filename', er. original_filename,
            'url', er.cloudinary_url,
            'size', er.size_bytes
          ))
          FROM expense_receipts er
          WHERE er.expense_id = e. id
        ) as receipts
      FROM expenses e
      JOIN categories c ON c.id = e. category_id
      LEFT JOIN activity_events ae ON ae.id = e.event_id
      LEFT JOIN users u ON u.id = e.created_by
      LEFT JOIN users au ON au.id = e.approved_by
      WHERE e. id = ${expenseId} AND e. department_id = ${user.department_id}
    `;

    if (expenses.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Expense not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: expenses[0],
    });
  } catch (error) {
    console.error('Expense GET API error:', error);
    return NextResponse. json(
      { success: false, error: 'Failed to fetch expense details' },
      { status: 500 }
    );
  }
}

// PUT - Update expense or approve/reject
export async function PUT(
  request:  NextRequest,
  { params }: { params: { id: string } }
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

    if (isNaN(expenseId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid expense ID' },
        { status: 400 }
      );
    }

    const body = await request.json();

    // Check if this is an approval action
    if (body.status && ['approved', 'rejected']. includes(body.status)) {
      // Only HOD and Admin can approve
      if (! canPerformAction(user.role, 'approve')) {
        return NextResponse.json(
          { success: false, error: 'Only HOD or Admin can approve expenses' },
          { status:  403 }
        );
      }

      const validation = validateRequest(expenseApprovalSchema, body);

      if (!validation.success) {
        return NextResponse.json(
          { success: false, error: validation.error },
          { status: 400 }
        );
      }

      // Get current expense
      const current = await sql`
        SELECT * FROM expenses 
        WHERE id = ${expenseId} AND department_id = ${user.department_id}
      `;

      if (current.length === 0) {
        return NextResponse.json(
          { success: false, error: 'Expense not found' },
          { status: 404 }
        );
      }

      if (current[0].status !== 'pending') {
        return NextResponse.json(
          { success: false, error: 'Expense has already been processed' },
          { status: 400 }
        );
      }

      // Update expense status
      const updated = await sql`
        UPDATE expenses
        SET 
          status = ${body.status},
          approved_by = ${user.id},
          approval_notes = ${body.notes || null},
          updated_at = NOW()
        WHERE id = ${expenseId}
        RETURNING *
      `;

      // Audit log
      await createAuditLog({
        userId:  user.id,
        action: body.status === 'approved' ? 'APPROVE_EXPENSE' : 'REJECT_EXPENSE',
        entityType: 'expense',
        entityId: expenseId,
        oldValues: { status: current[0].status },
        newValues: { status: body.status, notes: body.notes },
      });

      return NextResponse.json({
        success: true,
        data: updated[0],
        message: `Expense ${body.status} successfully`,
      });
    }

    // Regular update (only creator or admin can update)
    if (user.role !== 'admin' && user.role !== 'hod') {
      // Staff can only update their own pending expenses
      const current = await sql`
        SELECT * FROM expenses 
        WHERE id = ${expenseId} AND department_id = ${user.department_id}
      `;

      if (current.length === 0) {
        return NextResponse.json(
          { success: false, error: 'Expense not found' },
          { status: 404 }
        );
      }

      if (current[0].created_by !== user.id || current[0].status !== 'pending') {
        return NextResponse.json(
          { success: false, error: 'You can only update your own pending expenses' },
          { status: 403 }
        );
      }
    }

    const validation = validateRequest(expenseSchema, body);

    if (!validation. success) {
      return NextResponse.json(
        { success: false, error: validation.error },
        { status: 400 }
      );
    }

    const { category_id, event_id, vendor, amount, expense_date, description } = body;

    const updated = await sql`
      UPDATE expenses
      SET 
        category_id = ${category_id},
        event_id = ${event_id || null},
        vendor = ${vendor},
        amount = ${amount},
        expense_date = ${expense_date},
        description = ${description || null},
        updated_at = NOW()
      WHERE id = ${expenseId} AND department_id = ${user. department_id}
      RETURNING *
    `;

    if (updated.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Expense not found' },
        { status: 404 }
      );
    }

    // Audit log
    await createAuditLog({
      userId: user.id,
      action: 'UPDATE_EXPENSE',
      entityType: 'expense',
      entityId: expenseId,
      newValues: { vendor, amount, category_id, expense_date },
    });

    return NextResponse.json({
      success: true,
      data: updated[0],
      message: 'Expense updated successfully',
    });
  } catch (error) {
    console.error('Expense PUT API error:', error);
    return NextResponse.json(
      { success: false, error:  'Failed to update expense. Please try again.' },
      { status: 500 }
    );
  }
}

// DELETE - Delete expense
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
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

    if (isNaN(expenseId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid expense ID' },
        { status: 400 }
      );
    }

    // Get current expense
    const current = await sql`
      SELECT * FROM expenses 
      WHERE id = ${expenseId} AND department_id = ${user.department_id}
    `;

    if (current.length === 0) {
      return NextResponse.json(
        { success: false, error:  'Expense not found' },
        { status: 404 }
      );
    }

    // Only admin or the creator (if pending) can delete
    if (user.role !== 'admin') {
      if (current[0].created_by !== user.id || current[0].status !== 'pending') {
        return NextResponse.json(
          { success: false, error: 'You can only delete your own pending expenses' },
          { status: 403 }
        );
      }
    }

    // Delete expense receipts first (cascade should handle this, but being explicit)
    await sql`DELETE FROM expense_receipts WHERE expense_id = ${expenseId}`;

    // Delete expense
    await sql`DELETE FROM expenses WHERE id = ${expenseId}`;

    // Audit log
    await createAuditLog({
      userId: user.id,
      action: 'DELETE_EXPENSE',
      entityType: 'expense',
      entityId: expenseId,
      oldValues: current[0],
    });

    return NextResponse.json({
      success: true,
      message: 'Expense deleted successfully',
    });
  } catch (error) {
    console.error('Expense DELETE API error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete expense. Please try again.' },
      { status: 500 }
    );
  }
}