import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { createAuditLog } from '@/lib/audit';
import { deleteReceipt } from '@/lib/cloudinary';

// DELETE - Delete receipt
export async function DELETE(
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

    const { id } = await params;
    const receiptId = parseInt(id);

    // Get receipt with expense info
    const receipts = await sql`
      SELECT er. *, e.department_id, e.created_by as expense_created_by, e.status as expense_status
      FROM expense_receipts er
      JOIN expenses e ON e.id = er.expense_id
      WHERE er.id = ${receiptId}
    `;

    if (receipts.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Receipt not found' },
        { status: 404 }
      );
    }

    const receipt = receipts[0];

    // Check permissions
    if (receipt.department_id !== user. department_id) {
      return NextResponse.json(
        { success: false, error: 'Receipt not found' },
        { status: 404 }
      );
    }

    if (receipt.uploaded_by !== user. id && user.role === 'staff') {
      return NextResponse.json(
        { success:  false, error: 'You can only delete your own receipts' },
        { status: 403 }
      );
    }

    if (receipt.expense_status !== 'pending' && user. role !== 'admin') {
      return NextResponse.json(
        { success:  false, error: 'Cannot delete receipts for processed expenses' },
        { status: 400 }
      );
    }

    // Delete from Cloudinary
    await deleteReceipt(receipt.cloudinary_public_id);

    // Delete from database
    await sql`DELETE FROM expense_receipts WHERE id = ${receiptId}`;

    await createAuditLog({
      userId: user. id,
      action: 'DELETE_RECEIPT',
      entityType: 'expense_receipt',
      entityId: receiptId,
      oldValues: { expense_id: receipt. expense_id, filename: receipt.original_filename },
    });

    return NextResponse.json({
      success: true,
      message: 'Receipt deleted successfully',
    });
  } catch (error) {
    console. error('Receipt DELETE API error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status:  500 }
    );
  }
}