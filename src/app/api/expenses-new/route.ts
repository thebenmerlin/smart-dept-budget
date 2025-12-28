import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(request.url);
    const search = url.searchParams.get('search') || '';
    const categoryId = url.searchParams.get('category_id');
    const status = url.searchParams.get('status');
    const period = url.searchParams.get('period');
    const budgetId = url.searchParams.get('budget_id');

    let expenses;

    if (search) {
      expenses = await sql`
        SELECT 
          e.*,
          c.name as category_name,
          b.name as budget_name,
          b.amount as budget_amount,
          CASE WHEN b.id IS NOT NULL THEN 
            b.amount - COALESCE((SELECT SUM(exp.amount) FROM expenses_new exp WHERE exp.budget_id = b.id AND exp.status = 'approved'), 0)
          ELSE NULL END as budget_remaining,
          u.name as created_by_name,
          COALESCE(
            (SELECT json_agg(json_build_object('id', eb.id, 'name', eb.name, 'amount', eb.amount, 'breakdown_date', eb.breakdown_date, 'payment_method', eb.payment_method))
             FROM expense_breakdowns eb WHERE eb.expense_id = e.id), '[]'
          ) as breakdowns,
          COALESCE(
            (SELECT json_agg(json_build_object('id', er.id, 'file_name', er.file_name, 'file_url', er.file_url, 'file_type', er.file_type))
             FROM expense_receipts_new er WHERE er.expense_id = e.id), '[]'
          ) as receipts
        FROM expenses_new e
        LEFT JOIN categories c ON c.id = e.category_id
        LEFT JOIN budgets b ON b.id = e.budget_id
        LEFT JOIN users u ON u.id = e.created_by
        WHERE e.department_id = ${user.department_id}
          AND (e.name ILIKE ${'%' + search + '%'} OR e.description ILIKE ${'%' + search + '%'} OR c.name ILIKE ${'%' + search + '%'})
        ORDER BY e.expense_date DESC, e.created_at DESC
      `;
    } else if (categoryId) {
      expenses = await sql`
        SELECT 
          e.*,
          c.name as category_name,
          b.name as budget_name,
          b.amount as budget_amount,
          CASE WHEN b.id IS NOT NULL THEN 
            b.amount - COALESCE((SELECT SUM(exp.amount) FROM expenses_new exp WHERE exp.budget_id = b.id AND exp.status = 'approved'), 0)
          ELSE NULL END as budget_remaining,
          u.name as created_by_name,
          COALESCE(
            (SELECT json_agg(json_build_object('id', eb.id, 'name', eb.name, 'amount', eb.amount, 'breakdown_date', eb.breakdown_date, 'payment_method', eb.payment_method))
             FROM expense_breakdowns eb WHERE eb.expense_id = e.id), '[]'
          ) as breakdowns,
          COALESCE(
            (SELECT json_agg(json_build_object('id', er.id, 'file_name', er.file_name, 'file_url', er.file_url, 'file_type', er.file_type))
             FROM expense_receipts_new er WHERE er.expense_id = e.id), '[]'
          ) as receipts
        FROM expenses_new e
        LEFT JOIN categories c ON c.id = e.category_id
        LEFT JOIN budgets b ON b.id = e.budget_id
        LEFT JOIN users u ON u.id = e.created_by
        WHERE e.department_id = ${user.department_id}
          AND e.category_id = ${parseInt(categoryId)}
        ORDER BY e.expense_date DESC, e.created_at DESC
      `;
    } else if (status) {
      expenses = await sql`
        SELECT 
          e.*,
          c.name as category_name,
          b.name as budget_name,
          b.amount as budget_amount,
          CASE WHEN b.id IS NOT NULL THEN 
            b.amount - COALESCE((SELECT SUM(exp.amount) FROM expenses_new exp WHERE exp.budget_id = b.id AND exp.status = 'approved'), 0)
          ELSE NULL END as budget_remaining,
          u.name as created_by_name,
          COALESCE(
            (SELECT json_agg(json_build_object('id', eb.id, 'name', eb.name, 'amount', eb.amount, 'breakdown_date', eb.breakdown_date, 'payment_method', eb.payment_method))
             FROM expense_breakdowns eb WHERE eb.expense_id = e.id), '[]'
          ) as breakdowns,
          COALESCE(
            (SELECT json_agg(json_build_object('id', er.id, 'file_name', er.file_name, 'file_url', er.file_url, 'file_type', er.file_type))
             FROM expense_receipts_new er WHERE er.expense_id = e.id), '[]'
          ) as receipts
        FROM expenses_new e
        LEFT JOIN categories c ON c.id = e.category_id
        LEFT JOIN budgets b ON b.id = e.budget_id
        LEFT JOIN users u ON u.id = e.created_by
        WHERE e.department_id = ${user.department_id}
          AND e.status = ${status}
        ORDER BY e.expense_date DESC, e.created_at DESC
      `;
    } else {
      expenses = await sql`
        SELECT 
          e.*,
          c.name as category_name,
          b.name as budget_name,
          b.amount as budget_amount,
          CASE WHEN b.id IS NOT NULL THEN 
            b.amount - COALESCE((SELECT SUM(exp.amount) FROM expenses_new exp WHERE exp.budget_id = b.id AND exp.status = 'approved'), 0)
          ELSE NULL END as budget_remaining,
          u.name as created_by_name,
          COALESCE(
            (SELECT json_agg(json_build_object('id', eb.id, 'name', eb.name, 'amount', eb.amount, 'breakdown_date', eb.breakdown_date, 'payment_method', eb.payment_method))
             FROM expense_breakdowns eb WHERE eb.expense_id = e.id), '[]'
          ) as breakdowns,
          COALESCE(
            (SELECT json_agg(json_build_object('id', er.id, 'file_name', er.file_name, 'file_url', er.file_url, 'file_type', er.file_type))
             FROM expense_receipts_new er WHERE er.expense_id = e.id), '[]'
          ) as receipts
        FROM expenses_new e
        LEFT JOIN categories c ON c.id = e.category_id
        LEFT JOIN budgets b ON b.id = e.budget_id
        LEFT JOIN users u ON u.id = e.created_by
        WHERE e.department_id = ${user.department_id}
        ORDER BY e.expense_date DESC, e.created_at DESC
      `;
    }

    const totalResult = await sql`
      SELECT COALESCE(SUM(amount), 0) as total
      FROM expenses_new
      WHERE department_id = ${user.department_id}
    `;

    return NextResponse.json({
      success: true,
      data: expenses,
      total: Number(totalResult[0]?.total || 0),
    });
  } catch (err) {
    console.error('Expenses GET error:', err);
    return NextResponse.json({ success: false, error: 'Failed to fetch expenses' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, amount, budget_id, category_id, description, spender, payment_method, expense_date, breakdowns, receipts } = body;

    if (!name || !amount) {
      return NextResponse.json({ success: false, error: 'Name and amount are required' }, { status: 400 });
    }

    const result = await sql`
      INSERT INTO expenses_new (department_id, budget_id, category_id, name, amount, description, spender, payment_method, expense_date, created_by)
      VALUES (
        ${user.department_id},
        ${budget_id || null},
        ${category_id || null},
        ${name},
        ${parseFloat(amount)},
        ${description || null},
        ${spender || null},
        ${payment_method || 'cash'},
        ${expense_date || new Date().toISOString().split('T')[0]},
        ${user.id}
      )
      RETURNING *
    `;

    const expenseId = result[0].id;

    if (breakdowns && Array.isArray(breakdowns) && breakdowns.length > 0) {
      for (const bd of breakdowns) {
        if (bd.name && bd.amount) {
          await sql`
            INSERT INTO expense_breakdowns (expense_id, name, amount, breakdown_date, payment_method)
            VALUES (${expenseId}, ${bd.name}, ${parseFloat(bd.amount)}, ${bd.breakdown_date || null}, ${bd.payment_method || 'cash'})
          `;
        }
      }
    }

    if (receipts && Array.isArray(receipts) && receipts.length > 0) {
      for (const r of receipts) {
        if (r.file_name && r.file_url) {
          await sql`
            INSERT INTO expense_receipts_new (expense_id, file_name, file_url, file_type, file_size)
            VALUES (${expenseId}, ${r.file_name}, ${r.file_url}, ${r.file_type || null}, ${r.file_size || null})
          `;
        }
      }
    }

    return NextResponse.json({ success: true, data: result[0], message: 'Expense created successfully' });
  } catch (err) {
    console.error('Expenses POST error:', err);
    return NextResponse.json({ success: false, error: 'Failed to create expense' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { id, name, amount, budget_id, category_id, description, spender, payment_method, expense_date, status, rejection_reason, breakdowns } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: 'Expense ID is required' }, { status: 400 });
    }

    const result = await sql`
      UPDATE expenses_new
      SET 
        name = COALESCE(${name}, name),
        amount = COALESCE(${amount ? parseFloat(amount) : null}, amount),
        budget_id = ${budget_id || null},
        category_id = ${category_id || null},
        description = COALESCE(${description}, description),
        spender = COALESCE(${spender}, spender),
        payment_method = COALESCE(${payment_method}, payment_method),
        expense_date = COALESCE(${expense_date}, expense_date),
        status = COALESCE(${status}, status),
        rejection_reason = COALESCE(${rejection_reason}, rejection_reason),
        updated_at = NOW()
      WHERE id = ${parseInt(id)} AND department_id = ${user.department_id}
      RETURNING *
    `;

    if (result.length === 0) {
      return NextResponse.json({ success: false, error: 'Expense not found' }, { status: 404 });
    }

    if (breakdowns && Array.isArray(breakdowns)) {
      await sql`DELETE FROM expense_breakdowns WHERE expense_id = ${parseInt(id)}`;
      for (const bd of breakdowns) {
        if (bd.name && bd.amount) {
          await sql`
            INSERT INTO expense_breakdowns (expense_id, name, amount, breakdown_date, payment_method)
            VALUES (${parseInt(id)}, ${bd.name}, ${parseFloat(bd.amount)}, ${bd.breakdown_date || null}, ${bd.payment_method || 'cash'})
          `;
        }
      }
    }

    return NextResponse.json({ success: true, data: result[0] });
  } catch (err) {
    console.error('Expenses PUT error:', err);
    return NextResponse.json({ success: false, error: 'Failed to update expense' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(request.url);
    const id = url.searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'Expense ID is required' }, { status: 400 });
    }

    await sql`DELETE FROM expenses_new WHERE id = ${parseInt(id)} AND department_id = ${user.department_id}`;

    return NextResponse.json({ success: true, message: 'Expense deleted successfully' });
  } catch (err) {
    console.error('Expenses DELETE error:', err);
    return NextResponse.json({ success: false, error: 'Failed to delete expense' }, { status: 500 });
  }
}