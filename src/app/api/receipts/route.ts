import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { createAuditLog } from '@/lib/audit';

export const dynamic = 'force-dynamic';

function isCloudinaryConfigured(): boolean {
  return Boolean(
    process. env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env. CLOUDINARY_API_SECRET
  );
}

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
    const expenseId = url. searchParams.get('expense_id');

    let receipts;

    if (expenseId) {
      receipts = await sql`
        SELECT 
          er.id,
          er. expense_id,
          er.filename,
          er. original_filename,
          er.cloudinary_public_id,
          er. cloudinary_url,
          er. mime_type,
          er.size_bytes,
          er. uploaded_by,
          er.created_at,
          e.description as expense_description,
          e.amount as expense_amount,
          e.vendor as expense_vendor,
          c.name as category_name,
          u.name as uploaded_by_name
        FROM expense_receipts er
        JOIN expenses e ON e. id = er.expense_id
        JOIN categories c ON c.id = e. category_id
        LEFT JOIN users u ON u.id = er.uploaded_by
        WHERE e.department_id = ${user.department_id}
          AND er.expense_id = ${parseInt(expenseId)}
        ORDER BY er.created_at DESC
      `;
    } else {
      receipts = await sql`
        SELECT 
          er.id,
          er.expense_id,
          er.filename,
          er.original_filename,
          er.cloudinary_public_id,
          er.cloudinary_url,
          er.mime_type,
          er.size_bytes,
          er.uploaded_by,
          er. created_at,
          e.description as expense_description,
          e.amount as expense_amount,
          e.vendor as expense_vendor,
          c.name as category_name,
          u.name as uploaded_by_name
        FROM expense_receipts er
        JOIN expenses e ON e.id = er. expense_id
        JOIN categories c ON c.id = e. category_id
        LEFT JOIN users u ON u.id = er.uploaded_by
        WHERE e.department_id = ${user.department_id}
        ORDER BY er.created_at DESC
      `;
    }

    return NextResponse.json({
      success: true,
      data: receipts,
    });
  } catch (err) {
    console.error('Receipts GET error:', err);
    const message = err instanceof Error ?  err.message : 'Unknown error';
    return NextResponse. json(
      { success: false, error: 'Failed to fetch receipts: ' + message },
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

    const contentType = request.headers.get('content-type') || '';
    
    if (!contentType.includes('multipart/form-data')) {
      return NextResponse.json(
        { success: false, error: 'Content-Type must be multipart/form-data' },
        { status: 400 }
      );
    }

    const formData = await request.formData();

    let file: File | null = null;
    let expenseId: string | null = null;

    const fileEntry = (formData as any).get('file');
    const expenseIdEntry = (formData as any).get('expense_id');

    if (fileEntry && fileEntry instanceof File) {
      file = fileEntry;
    }
    
    if (expenseIdEntry) {
      expenseId = String(expenseIdEntry);
    }

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file provided' },
        { status:  400 }
      );
    }

    if (!expenseId) {
      return NextResponse. json(
        { success: false, error: 'Expense ID is required' },
        { status: 400 }
      );
    }

    const fileName = file.name;
    const fileType = file.type;
    const fileSize = file.size;

    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'application/pdf'];
    if (!allowedTypes. includes(fileType)) {
      return NextResponse.json(
        { success: false, error: 'Invalid file type.  Allowed:  PNG, JPEG, PDF' },
        { status: 400 }
      );
    }

    if (fileSize > 10 * 1024 * 1024) {
      return NextResponse.json(
        { success: false, error:  'File size exceeds 10MB limit' },
        { status: 400 }
      );
    }

    const expenseIdNum = parseInt(expenseId, 10);

    const expense = await sql`
      SELECT id FROM expenses 
      WHERE id = ${expenseIdNum} AND department_id = ${user. department_id}
    `;

    if (expense.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Expense not found' },
        { status:  404 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    let publicId: string;
    let fileUrl: string;

    if (isCloudinaryConfigured()) {
      try {
        const cloudinaryModule = await import('@/lib/cloudinary');
        const uploadResult = await cloudinaryModule.uploadReceipt(buffer, fileName, fileType);

        if (! uploadResult.success || !uploadResult.publicId || !uploadResult.url) {
          throw new Error(uploadResult.error || 'Cloudinary upload failed');
        }

        publicId = uploadResult.publicId;
        fileUrl = uploadResult.url;
      } catch (cloudErr) {
        console.error('Cloudinary error, using fallback:', cloudErr);
        const base64Data = buffer.toString('base64');
        const safeName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
        publicId = 'local_' + Date.now() + '_' + safeName;
        fileUrl = 'data:' + fileType + ';base64,' + base64Data;
      }
    } else {
      const base64Data = buffer.toString('base64');
      const safeName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
      publicId = 'local_' + Date. now() + '_' + safeName;
      fileUrl = 'data:' + fileType + ';base64,' + base64Data;
    }

    const result = await sql`
      INSERT INTO expense_receipts (
        expense_id,
        filename,
        original_filename,
        cloudinary_public_id,
        cloudinary_url,
        mime_type,
        size_bytes,
        uploaded_by
      )
      VALUES (
        ${expenseIdNum},
        ${publicId},
        ${fileName},
        ${publicId},
        ${fileUrl},
        ${fileType},
        ${buffer.length},
        ${user.id}
      )
      RETURNING *
    `;

    const insertedReceipt = result[0];

    try {
      await createAuditLog({
        userId: user.id,
        action: 'UPLOAD_RECEIPT',
        entityType: 'expense_receipt',
        entityId:  insertedReceipt. id,
        newValues: { expense_id: expenseIdNum, filename: fileName },
      });
    } catch (auditErr) {
      console.error('Audit log error:', auditErr);
    }

    return NextResponse.json({
      success: true,
      data: insertedReceipt,
      message: 'Receipt uploaded successfully',
    });
  } catch (err) {
    console.error('Receipts POST error:', err);
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json(
      { success: false, error: 'Upload failed: ' + message },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { success:  false, error: 'Unauthorized' },
        { status:  401 }
      );
    }

    const url = new URL(request.url);
    const receiptId = url. searchParams.get('id');

    if (!receiptId) {
      return NextResponse.json(
        { success: false, error: 'Receipt ID required' },
        { status: 400 }
      );
    }

    const receiptIdNum = parseInt(receiptId, 10);

    const receipt = await sql`
      SELECT er.id, e.department_id
      FROM expense_receipts er
      JOIN expenses e ON e. id = er.expense_id
      WHERE er.id = ${receiptIdNum} AND e.department_id = ${user. department_id}
    `;

    if (receipt.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Receipt not found' },
        { status: 404 }
      );
    }

    if (user.role !== 'admin' && user. role !== 'hod') {
      return NextResponse.json(
        { success: false, error:  'Permission denied' },
        { status: 403 }
      );
    }

    await sql`DELETE FROM expense_receipts WHERE id = ${receiptIdNum}`;

    try {
      await createAuditLog({
        userId: user.id,
        action: 'DELETE_RECEIPT',
        entityType: 'expense_receipt',
        entityId:  receiptIdNum,
        oldValues:  { receipt_id:  receiptIdNum },
      });
    } catch (auditErr) {
      console.error('Audit log error:', auditErr);
    }

    return NextResponse.json({
      success: true,
      message: 'Receipt deleted successfully',
    });
  } catch (err) {
    console. error('Receipt DELETE error:', err);
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json(
      { success: false, error:  message },
      { status: 500 }
    );
  }
}