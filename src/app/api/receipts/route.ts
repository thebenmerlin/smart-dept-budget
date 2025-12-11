import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { createAuditLog } from '@/lib/audit';
import { uploadReceipt } from '@/lib/cloudinary';

// GET - List receipts
export async function GET(request:  NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const expenseId = searchParams.get('expense_id');

    const receipts = await sql`
      SELECT 
        er.*,
        e.description as expense_description,
        e. amount as expense_amount,
        e. vendor as expense_vendor,
        c.name as category_name,
        u.name as uploaded_by_name
      FROM expense_receipts er
      JOIN expenses e ON e.id = er. expense_id
      JOIN categories c ON c.id = e.category_id
      LEFT JOIN users u ON u.id = er. uploaded_by
      WHERE e.department_id = ${user.department_id}
        ${expenseId ?  sql`AND er.expense_id = ${parseInt(expenseId)}` : sql``}
      ORDER BY er.created_at DESC
    `;

    return NextResponse.json({
      success: true,
      data: receipts,
    });
  } catch (error) {
    console.error('Receipts GET API error:', error);
    return NextResponse.json(
      { success:  false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Upload receipt
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Use the web standard FormData
    const formData = await request.formData();
    
    // Access form fields using array notation to avoid TypeScript issues
    const fileField = formData.getAll('file')[0];
    const expenseIdField = formData.getAll('expense_id')[0];

    // Validate file
    if (!fileField || typeof fileField === 'string') {
      return NextResponse.json(
        { success: false, error: 'No file provided' },
        { status: 400 }
      );
    }

    // Cast to File type (we know it's a File from the check above)
    const file = fileField as unknown as File;
    const expenseId = expenseIdField?. toString();

    if (!expenseId) {
      return NextResponse. json(
        { success: false, error: 'Expense ID is required' },
        { status:  400 }
      );
    }

    // Verify expense exists and belongs to user's department
    const expense = await sql`
      SELECT * FROM expenses 
      WHERE id = ${parseInt(expenseId)} AND department_id = ${user.department_id}
    `;

    if (expense.length === 0) {
      return NextResponse.json(
        { success: false, error:  'Expense not found' },
        { status: 404 }
      );
    }

    // Convert file to buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Upload to Cloudinary
    const uploadResult = await uploadReceipt(buffer, file.name, file.type);

    if (!uploadResult. success) {
      return NextResponse.json(
        { success: false, error:  uploadResult.error },
        { status:  400 }
      );
    }

    // Save to database
    const result = await sql`
      INSERT INTO expense_receipts (
        expense_id, filename, original_filename, cloudinary_public_id, 
        cloudinary_url, mime_type, size_bytes, uploaded_by
      )
      VALUES (
        ${parseInt(expenseId)}, 
        ${uploadResult. publicId}, 
        ${file.name},
        ${uploadResult.publicId},
        ${uploadResult.url},
        ${file.type},
        ${buffer. length},
        ${user.id}
      )
      RETURNING *
    `;

    await createAuditLog({
      userId: user.id,
      action: 'UPLOAD_RECEIPT',
      entityType:  'expense_receipt',
      entityId: result[0]. id,
      newValues: { expense_id: expenseId, filename:  file.name },
    });

    return NextResponse.json({
      success: true,
      data:  result[0],
    });
  } catch (error) {
    console.error('Receipts POST API error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}