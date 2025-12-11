import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getCurrentUser, canPerformAction } from '@/lib/auth';
import { createAuditLog } from '@/lib/audit';
import { expenseSchema, validateRequest } from '@/lib/validations';

export const dynamic = 'force-dynamic';

// GET - List expenses with filters
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { success:  false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const categoryId = searchParams. get('category_id');
    const status = searchParams.get('status');
    const vendor = searchParams.get('vendor');
    const dateFrom = searchParams. get('date_from');
    const dateTo = searchParams.get('date_to');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

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
            'filename', er.original_filename,
            'url', er.cloudinary_url
          ))
          FROM expense_receipts er
          WHERE er. expense_id = e.id
        ) as receipts
      FROM expenses e
      JOIN categories c ON c.id = e. category_id
      LEFT JOIN activity_events ae ON ae.id = e. event_id
      LEFT JOIN users u ON u.id = e. created_by
      LEFT JOIN users au ON au.id = e. approved_by
      WHERE e. department_id = ${user.department_id}
        ${categoryId ? sql`AND e.category_id = ${parseInt(categoryId)}` : sql``}
        ${status ? sql`AND e.status = ${status}` : sql``}
        ${vendor ? sql`AND e.vendor ILIKE ${'%' + vendor + '%'}` : sql``}
        ${dateFrom ? sql`AND e.expense_date >= ${dateFrom}` : sql``}
        ${dateTo ? sql`AND e.expense_date <= ${dateTo}` : sql``}
      ORDER BY e.expense_date DESC, e.created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `;

    // Get total count for pagination
    const countResult = await sql`
      SELECT COUNT(*) as total
      FROM expenses e
      WHERE e.department_id = ${user. department_id}
        ${categoryId ? sql`AND e.category_id = ${parseInt(categoryId)}` : sql``}
        ${status ? sql`AND e.status = ${status}` : sql``}
        ${vendor ? sql`AND e.vendor ILIKE ${'%' + vendor + '%'}` : sql``}
        ${dateFrom ? sql`AND e.expense_date >= ${dateFrom}` : sql``}
        ${dateTo ? sql`AND e.expense_date <= ${dateTo}` : sql``}
    `;

    return NextResponse.json({
      success: true,
      data:  {
        expenses,
        pagination: {
          total: parseInt(countResult[0].total),
          limit,
          offset,
        },
      },
    });
  } catch (error) {
    console.error('Expenses GET API error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch expenses.  Please check database connection.' },
      { status: 500 }
    );
  }
}

// POST - Create new expense
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    if (!canPerformAction(user.role, 'create')) {
      return NextResponse.json(
        { success: false, error: 'Permission denied' },
        { status:  403 }
      );
    }

    const body = await request.json();
    const validation = validateRequest(expenseSchema, body);

    if (!validation. success) {
      return NextResponse.json(
        { success: false, error: validation.error },
        { status: 400 }
      );
    }

    const { category_id, event_id, vendor, amount, expense_date, description, receipt_urls } = body;

    // Check budget availability
    const budgetCheck = await sql`
      SELECT 
        COALESCE(ba.allotted_amount, 0) as allotted,
        COALESCE(SUM(e.amount), 0) as spent
      FROM categories c
      LEFT JOIN budget_allotments ba ON ba.category_id = c.id 
        AND ba.department_id = ${user.department_id}
        AND ba.fiscal_year = (
          SELECT CASE 
            WHEN EXTRACT(MONTH FROM CURRENT_DATE) >= 4 
            THEN EXTRACT(YEAR FROM CURRENT_DATE):: TEXT || '-' || LPAD((EXTRACT(YEAR FROM CURRENT_DATE) + 1)::TEXT, 2, '0')
            ELSE (EXTRACT(YEAR FROM CURRENT_DATE) - 1)::TEXT || '-' || LPAD(EXTRACT(YEAR FROM CURRENT_DATE)::TEXT, 2, '0')
          END
        )
      LEFT JOIN expenses e ON e.category_id = c.id 
        AND e.department_id = ${user.department_id}
        AND e.status = 'approved'
      WHERE c.id = ${category_id}
      GROUP BY ba.allotted_amount
    `;

    const allotted = parseFloat(budgetCheck[0]?.allotted || '0');
    const spent = parseFloat(budgetCheck[0]?.spent || '0');
    const remaining = allotted - spent;

    if (amount > remaining) {
      return NextResponse.json(
        {
          success: false,
          error: `Insufficient budget. Available: ₹${remaining. toFixed(2)}, Requested: ₹${amount}`,
        },
        { status: 400 }
      );
    }

    // Insert expense
    const result = await sql`
      INSERT INTO expenses (
        department_id, category_id, event_id, vendor, amount, 
        expense_date, description, status, created_by
      )
      VALUES (
        ${user.department_id}, ${category_id}, ${event_id || null}, ${vendor}, 
        ${amount}, ${expense_date}, ${description || null}, 'pending', ${user.id}
      )
      RETURNING *
    `;

    const expense = result[0];

    // Insert receipts if provided
    if (receipt_urls && receipt_urls.length > 0) {
      for (const receipt of receipt_urls) {
        await sql`
          INSERT INTO expense_receipts (
            expense_id, original_filename, cloudinary_url, 
            cloudinary_public_id, size_bytes, uploaded_by
          )
          VALUES (
            ${expense.id}, ${receipt.filename}, ${receipt.url}, 
            ${receipt.public_id}, ${receipt.size || 0}, ${user.id}
          )
        `;
      }
    }

    // Audit log
    await createAuditLog({
      userId: user.id,
      action: 'CREATE_EXPENSE',
      entityType: 'expense',
      entityId: expense. id,
      newValues: { vendor, amount, category_id, expense_date },
    });

    return NextResponse.json({
      success: true,
      data: expense,
      message: 'Expense created successfully',
    });
  } catch (error) {
    console.error('Expense POST API error:', error);
    return NextResponse. json(
      { success: false, error: 'Failed to create expense. Please try again.' },
      { status: 500 }
    );
  }
}