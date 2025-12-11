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
        { status:  401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const categoryId = searchParams. get('category_id');
    const status = searchParams.get('status');
    const vendor = searchParams.get('vendor');
    const dateFrom = searchParams. get('date_from');
    const dateTo = searchParams. get('date_to');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

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
            'filename', er.original_filename,
            'url', er.cloudinary_url
          ))
          FROM expense_receipts er
          WHERE er.expense_id = e.id
        ) as receipts
      FROM expenses e
      JOIN categories c ON c.id = e. category_id
      LEFT JOIN activity_events ae ON ae.id = e. event_id
      LEFT JOIN users u ON u.id = e.created_by
      LEFT JOIN users au ON au.id = e.approved_by
      WHERE e.department_id = ${user.department_id}
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
      WHERE e.department_id = ${user.department_id}
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
      { success:  false, error: 'Internal server error' },
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
        { success: false, error:  'Unauthorized' },
        { status: 401 }
      );
    }

    if (!canPerformAction(user.role, 'create')) {
      return NextResponse.json(
        { success: false, error: 'Permission denied' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validation = validateRequest(expenseSchema, body);

    if (!validation.success) {
      return NextResponse.json(
        { success:  false, error: validation.error },
        { status: 400 }
      );
    }

    const { category_id, event_id, amount, vendor, expense_date, description, invoice_number } = validation.data;

    // Check budget availability
    const budgetCheck = await sql`
      SELECT 
        COALESCE(ba.allotted_amount, 0) as allotted,
        COALESCE(SUM(CASE WHEN e.status = 'approved' THEN e.amount ELSE 0 END), 0) as spent
      FROM categories c
      LEFT JOIN budget_allotments ba ON ba.category_id = c.id 
        AND ba.department_id = ${user.department_id}
        AND ba.fiscal_year = TO_CHAR(CURRENT_DATE, 'YYYY') || '-' || TO_CHAR(CURRENT_DATE + INTERVAL '1 year', 'YY')
      LEFT JOIN expenses e ON e.category_id = c.id 
        AND e.department_id = ${user.department_id}
        AND e.status = 'approved'
      WHERE c.id = ${category_id}
      GROUP BY ba.allotted_amount
    `;

    if (budgetCheck. length > 0) {
      const { allotted, spent } = budgetCheck[0];
      const remaining = Number(allotted) - Number(spent);
      
      if (amount > remaining && remaining > 0) {
        // Warning but allow (will need approval)
        console.warn(`Expense ${amount} exceeds remaining budget ${remaining} for category ${category_id}`);
      }
    }

    // Create expense
    const result = await sql`
      INSERT INTO expenses (
        department_id, category_id, event_id, amount, vendor, 
        expense_date, description, invoice_number, created_by, status
      )
      VALUES (
        ${user.department_id}, ${category_id}, ${event_id || null}, ${amount}, ${vendor},
        ${expense_date}, ${description || null}, ${invoice_number || null}, ${user.id}, 'pending'
      )
      RETURNING *
    `;

    await createAuditLog({
      userId: user.id,
      action: 'CREATE_EXPENSE',
      entityType: 'expense',
      entityId: result[0].id,
      newValues: validation.data,
    });

    return NextResponse.json({
      success: true,
      data: result[0],
    });
  } catch (error) {
    console.error('Expenses POST API error:', error);
    return NextResponse.json(
      { success: false, error:  'Internal server error' },
      { status: 500 }
    );
  }
}