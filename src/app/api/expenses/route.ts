import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getCurrentUser, canPerformAction } from '@/lib/auth';
import { createAuditLog } from '@/lib/audit';

export const dynamic = 'force-dynamic';

// GET - List expenses
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { success: false, error:  'Unauthorized - Please log in again' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const categoryId = searchParams. get('category_id');
    const status = searchParams.get('status');
    const vendor = searchParams.get('vendor');
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
    const offset = parseInt(searchParams.get('offset') || '0');

    // Simple query without complex conditionals
    let expenses;
    
    if (categoryId && status) {
      expenses = await sql`
        SELECT 
          e.id, e.department_id, e. category_id, e. event_id, e. amount, e.vendor,
          e.expense_date, e. description, e.invoice_number, e. status,
          e.created_by, e.approved_by, e. rejection_reason, e. created_at,
          c.name as category_name,
          u.name as created_by_name
        FROM expenses e
        JOIN categories c ON c.id = e. category_id
        LEFT JOIN users u ON u.id = e. created_by
        WHERE e.department_id = ${user.department_id}
          AND e. category_id = ${parseInt(categoryId)}
          AND e.status = ${status}
        ORDER BY e.expense_date DESC, e.created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `;
    } else if (categoryId) {
      expenses = await sql`
        SELECT 
          e.id, e.department_id, e.category_id, e.event_id, e. amount, e.vendor,
          e. expense_date, e.description, e. invoice_number, e.status,
          e.created_by, e.approved_by, e.rejection_reason, e. created_at,
          c.name as category_name,
          u.name as created_by_name
        FROM expenses e
        JOIN categories c ON c.id = e.category_id
        LEFT JOIN users u ON u.id = e.created_by
        WHERE e.department_id = ${user.department_id}
          AND e.category_id = ${parseInt(categoryId)}
        ORDER BY e.expense_date DESC, e.created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `;
    } else if (status) {
      expenses = await sql`
        SELECT 
          e.id, e.department_id, e.category_id, e.event_id, e.amount, e.vendor,
          e.expense_date, e. description, e.invoice_number, e. status,
          e.created_by, e.approved_by, e.rejection_reason, e.created_at,
          c.name as category_name,
          u.name as created_by_name
        FROM expenses e
        JOIN categories c ON c.id = e.category_id
        LEFT JOIN users u ON u.id = e.created_by
        WHERE e. department_id = ${user.department_id}
          AND e.status = ${status}
        ORDER BY e.expense_date DESC, e.created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `;
    } else {
      expenses = await sql`
        SELECT 
          e.id, e.department_id, e.category_id, e. event_id, e.amount, e. vendor,
          e.expense_date, e.description, e.invoice_number, e.status,
          e.created_by, e.approved_by, e. rejection_reason, e.created_at,
          c.name as category_name,
          u.name as created_by_name
        FROM expenses e
        JOIN categories c ON c.id = e.category_id
        LEFT JOIN users u ON u. id = e.created_by
        WHERE e.department_id = ${user.department_id}
        ORDER BY e.expense_date DESC, e.created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `;
    }

    // Get total count
    const countResult = await sql`
      SELECT COUNT(*):: int as total
      FROM expenses
      WHERE department_id = ${user.department_id}
    `;

    return NextResponse.json({
      success: true,
      data:  {
        expenses:  expenses || [],
        pagination: {
          total: countResult[0]?.total || 0,
          limit,
          offset,
        },
      },
    });
  } catch (error:  any) {
    console.error('Expenses GET error:', error);
    return NextResponse. json(
      { success: false, error: 'Database error:  ' + (error.message || 'Unknown error') },
      { status:  500 }
    );
  }
}

// POST - Create expense
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
        { success: false, error:  'Permission denied' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { category_id, event_id, vendor, amount, expense_date, description, invoice_number } = body;

    // Validate required fields
    if (!category_id || !vendor || !amount || !expense_date) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields:  category_id, vendor, amount, expense_date' },
        { status: 400 }
      );
    }

    // Validate amount
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      return NextResponse. json(
        { success: false, error: 'Amount must be a positive number' },
        { status: 400 }
      );
    }

    // Insert expense
    const result = await sql`
      INSERT INTO expenses (
        department_id, category_id, event_id, vendor, amount, 
        expense_date, description, invoice_number, status, created_by
      )
      VALUES (
        ${user.department_id}, 
        ${parseInt(category_id)}, 
        ${event_id ?  parseInt(event_id) : null}, 
        ${vendor. trim()}, 
        ${numAmount}, 
        ${expense_date}, 
        ${description || null}, 
        ${invoice_number || null}, 
        'pending', 
        ${user.id}
      )
      RETURNING *
    `;

    // Audit log (don't fail if this errors)
    try {
      await createAuditLog({
        userId: user.id,
        action: 'CREATE_EXPENSE',
        entityType: 'expense',
        entityId:  result[0].id,
        newValues: { vendor, amount:  numAmount, category_id },
      });
    } catch (e) {
      console.error('Audit log error:', e);
    }

    return NextResponse.json({
      success: true,
      data:  result[0],
      message: 'Expense created successfully',
    });
  } catch (error: any) {
    console.error('Expense POST error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create expense: ' + (error.message || 'Unknown error') },
      { status: 500 }
    );
  }
}