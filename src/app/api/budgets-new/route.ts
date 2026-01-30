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
    const source = url.searchParams.get('source');
    const period = url.searchParams.get('period');
    const fiscalYear = url.searchParams.get('fiscal_year');
    const startDate = url.searchParams.get('start_date');
    const endDate = url.searchParams.get('end_date');

    // Build dynamic filter conditions
    const conditions: string[] = [];
    const now = new Date();

    // Custom date range filter (used by semester filter)
    let customStartDate: Date | null = null;
    let customEndDate: Date | null = null;

    if (startDate && endDate) {
      customStartDate = new Date(startDate);
      customEndDate = new Date(endDate);
    }

    // Period filter
    if (period === 'weekly') {
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      conditions.push(`b.budget_date >= '${weekAgo.toISOString().split('T')[0]}'`);
    } else if (period === 'monthly') {
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      conditions.push(`b.budget_date >= '${monthStart.toISOString().split('T')[0]}'`);
    } else if (period === 'semester') {
      const semesterStart = now.getMonth() >= 6 ? new Date(now.getFullYear(), 6, 1) : new Date(now.getFullYear(), 0, 1);
      conditions.push(`b.budget_date >= '${semesterStart.toISOString().split('T')[0]}'`);
    } else if (period === 'annual' && fiscalYear) {
      conditions.push(`b.fiscal_year = '${fiscalYear}'`);
    }

    // Fiscal year filter (when not using period=annual)
    if (fiscalYear && period !== 'annual') {
      conditions.push(`b.fiscal_year = '${fiscalYear}'`);
    }

    // Build WHERE clause addition
    const filterClause = conditions.length > 0 ? 'AND ' + conditions.join(' AND ') : '';

    let budgets;

    if (search && categoryId && source) {
      budgets = await sql`
        SELECT 
          b.*,
          c.name as category_name,
          u.name as created_by_name,
          COALESCE(
            (SELECT json_agg(json_build_object('id', bb.id, 'name', bb.name, 'amount', bb.amount, 'payment_method', bb.payment_method))
             FROM budget_breakdowns bb WHERE bb.budget_id = b.id), '[]'
          ) as breakdowns
        FROM budgets b
        LEFT JOIN categories c ON c.id = b.category_id
        LEFT JOIN users u ON u.id = b.created_by
        WHERE b.department_id = ${user.department_id}
          AND (b.name ILIKE ${'%' + search + '%'} OR b.description ILIKE ${'%' + search + '%'} OR c.name ILIKE ${'%' + search + '%'})
          AND b.category_id = ${parseInt(categoryId)}
          AND b.source ILIKE ${'%' + source + '%'}
        ORDER BY b.budget_date DESC, b.created_at DESC
      `;
    } else if (search && categoryId) {
      budgets = await sql`
        SELECT 
          b.*,
          c.name as category_name,
          u.name as created_by_name,
          COALESCE(
            (SELECT json_agg(json_build_object('id', bb.id, 'name', bb.name, 'amount', bb.amount, 'payment_method', bb.payment_method))
             FROM budget_breakdowns bb WHERE bb.budget_id = b.id), '[]'
          ) as breakdowns
        FROM budgets b
        LEFT JOIN categories c ON c.id = b.category_id
        LEFT JOIN users u ON u.id = b.created_by
        WHERE b.department_id = ${user.department_id}
          AND (b.name ILIKE ${'%' + search + '%'} OR b.description ILIKE ${'%' + search + '%'} OR c.name ILIKE ${'%' + search + '%'})
          AND b.category_id = ${parseInt(categoryId)}
        ORDER BY b.budget_date DESC, b.created_at DESC
      `;
    } else if (search && source) {
      budgets = await sql`
        SELECT 
          b.*,
          c.name as category_name,
          u.name as created_by_name,
          COALESCE(
            (SELECT json_agg(json_build_object('id', bb.id, 'name', bb.name, 'amount', bb.amount, 'payment_method', bb.payment_method))
             FROM budget_breakdowns bb WHERE bb.budget_id = b.id), '[]'
          ) as breakdowns
        FROM budgets b
        LEFT JOIN categories c ON c.id = b.category_id
        LEFT JOIN users u ON u.id = b.created_by
        WHERE b.department_id = ${user.department_id}
          AND (b.name ILIKE ${'%' + search + '%'} OR b.description ILIKE ${'%' + search + '%'} OR c.name ILIKE ${'%' + search + '%'})
          AND b.source ILIKE ${'%' + source + '%'}
        ORDER BY b.budget_date DESC, b.created_at DESC
      `;
    } else if (categoryId && source) {
      budgets = await sql`
        SELECT 
          b.*,
          c.name as category_name,
          u.name as created_by_name,
          COALESCE(
            (SELECT json_agg(json_build_object('id', bb.id, 'name', bb.name, 'amount', bb.amount, 'payment_method', bb.payment_method))
             FROM budget_breakdowns bb WHERE bb.budget_id = b.id), '[]'
          ) as breakdowns
        FROM budgets b
        LEFT JOIN categories c ON c.id = b.category_id
        LEFT JOIN users u ON u.id = b.created_by
        WHERE b.department_id = ${user.department_id}
          AND b.category_id = ${parseInt(categoryId)}
          AND b.source ILIKE ${'%' + source + '%'}
        ORDER BY b.budget_date DESC, b.created_at DESC
      `;
    } else if (search) {
      budgets = await sql`
        SELECT 
          b.*,
          c.name as category_name,
          u.name as created_by_name,
          COALESCE(
            (SELECT json_agg(json_build_object('id', bb.id, 'name', bb.name, 'amount', bb.amount, 'payment_method', bb.payment_method))
             FROM budget_breakdowns bb WHERE bb.budget_id = b.id), '[]'
          ) as breakdowns
        FROM budgets b
        LEFT JOIN categories c ON c.id = b.category_id
        LEFT JOIN users u ON u.id = b.created_by
        WHERE b.department_id = ${user.department_id}
          AND (b.name ILIKE ${'%' + search + '%'} OR b.description ILIKE ${'%' + search + '%'} OR c.name ILIKE ${'%' + search + '%'})
        ORDER BY b.budget_date DESC, b.created_at DESC
      `;
    } else if (categoryId) {
      budgets = await sql`
        SELECT 
          b.*,
          c.name as category_name,
          u.name as created_by_name,
          COALESCE(
            (SELECT json_agg(json_build_object('id', bb.id, 'name', bb.name, 'amount', bb.amount, 'payment_method', bb.payment_method))
             FROM budget_breakdowns bb WHERE bb.budget_id = b.id), '[]'
          ) as breakdowns
        FROM budgets b
        LEFT JOIN categories c ON c.id = b.category_id
        LEFT JOIN users u ON u.id = b.created_by
        WHERE b.department_id = ${user.department_id}
          AND b.category_id = ${parseInt(categoryId)}
        ORDER BY b.budget_date DESC, b.created_at DESC
      `;
    } else if (source) {
      budgets = await sql`
        SELECT 
          b.*,
          c.name as category_name,
          u.name as created_by_name,
          COALESCE(
            (SELECT json_agg(json_build_object('id', bb.id, 'name', bb.name, 'amount', bb.amount, 'payment_method', bb.payment_method))
             FROM budget_breakdowns bb WHERE bb.budget_id = b.id), '[]'
          ) as breakdowns
        FROM budgets b
        LEFT JOIN categories c ON c.id = b.category_id
        LEFT JOIN users u ON u.id = b.created_by
        WHERE b.department_id = ${user.department_id}
          AND b.source ILIKE ${'%' + source + '%'}
        ORDER BY b.budget_date DESC, b.created_at DESC
      `;
    } else {
      budgets = await sql`
        SELECT 
          b.*,
          c.name as category_name,
          u.name as created_by_name,
          COALESCE(
            (SELECT json_agg(json_build_object('id', bb.id, 'name', bb.name, 'amount', bb.amount, 'payment_method', bb.payment_method))
             FROM budget_breakdowns bb WHERE bb.budget_id = b.id), '[]'
          ) as breakdowns
        FROM budgets b
        LEFT JOIN categories c ON c.id = b.category_id
        LEFT JOIN users u ON u.id = b.created_by
        WHERE b.department_id = ${user.department_id}
        ORDER BY b.budget_date DESC, b.created_at DESC
      `;
    }

    // Apply period/fiscal year/custom date filter by filtering results
    let filteredBudgets = budgets;
    if (conditions.length > 0 || customStartDate || customEndDate) {
      filteredBudgets = budgets.filter((b: any) => {
        let passes = true;

        // Custom date range filter (semester filter)
        if (customStartDate && customEndDate) {
          const budgetDate = new Date(b.budget_date);
          passes = passes && budgetDate >= customStartDate && budgetDate <= customEndDate;
        }

        if (period === 'weekly') {
          const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          passes = passes && new Date(b.budget_date) >= weekAgo;
        } else if (period === 'monthly') {
          const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
          passes = passes && new Date(b.budget_date) >= monthStart;
        } else if (period === 'semester') {
          const semesterStart = now.getMonth() >= 6 ? new Date(now.getFullYear(), 6, 1) : new Date(now.getFullYear(), 0, 1);
          passes = passes && new Date(b.budget_date) >= semesterStart;
        }

        if (fiscalYear) {
          passes = passes && b.fiscal_year === fiscalYear;
        }

        return passes;
      });
    }

    // Calculate total from filtered budgets
    const total = filteredBudgets.reduce((sum: number, b: any) => sum + Number(b.amount || 0), 0);

    // Calculate remaining for each budget (amount - sum of approved expenses)
    const budgetIds = filteredBudgets.map((b: any) => b.id);
    let expensesByBudget: any[] = [];

    if (budgetIds.length > 0) {
      expensesByBudget = await sql`
        SELECT budget_id, COALESCE(SUM(amount), 0) as spent
        FROM expenses_new
        WHERE budget_id = ANY(${budgetIds})
          AND status = 'approved'
        GROUP BY budget_id
      `;
    }

    const spentMap = new Map(expensesByBudget.map(e => [e.budget_id, Number(e.spent)]));

    const budgetsWithRemaining = filteredBudgets.map((b: any) => ({
      ...b,
      spent: spentMap.get(b.id) || 0,
      remaining: Number(b.amount) - (spentMap.get(b.id) || 0),
    }));

    return NextResponse.json({
      success: true,
      data: budgetsWithRemaining,
      total: total,
    });
  } catch (err) {
    console.error('Budgets GET error:', err);
    return NextResponse.json({ success: false, error: 'Failed to fetch budgets' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, amount, category_id, description, source, payment_method, budget_date, breakdowns } = body;

    if (!name || !amount) {
      return NextResponse.json({ success: false, error: 'Name and amount are required' }, { status: 400 });
    }

    const fiscalYear = getFiscalYear(budget_date ? new Date(budget_date) : new Date());

    const result = await sql`
      INSERT INTO budgets (department_id, category_id, name, amount, description, source, payment_method, budget_date, fiscal_year, created_by)
      VALUES (
        ${user.department_id},
        ${category_id || null},
        ${name},
        ${parseFloat(amount)},
        ${description || null},
        ${source || null},
        ${payment_method || 'cash'},
        ${budget_date || new Date().toISOString().split('T')[0]},
        ${fiscalYear},
        ${user.id}
      )
      RETURNING *
    `;

    const budgetId = result[0].id;

    if (breakdowns && Array.isArray(breakdowns) && breakdowns.length > 0) {
      for (const bd of breakdowns) {
        if (bd.name && bd.amount) {
          await sql`
            INSERT INTO budget_breakdowns (budget_id, name, amount, payment_method)
            VALUES (${budgetId}, ${bd.name}, ${parseFloat(bd.amount)}, ${bd.payment_method || 'cash'})
          `;
        }
      }
    }

    return NextResponse.json({ success: true, data: result[0], message: 'Budget created successfully' });
  } catch (err) {
    console.error('Budgets POST error:', err);
    return NextResponse.json({ success: false, error: 'Failed to create budget' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { id, name, amount, category_id, description, source, payment_method, budget_date, breakdowns } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: 'Budget ID is required' }, { status: 400 });
    }

    const result = await sql`
      UPDATE budgets
      SET 
        name = COALESCE(${name}, name),
        amount = COALESCE(${amount ? parseFloat(amount) : null}, amount),
        category_id = ${category_id || null},
        description = COALESCE(${description}, description),
        source = COALESCE(${source}, source),
        payment_method = COALESCE(${payment_method}, payment_method),
        budget_date = COALESCE(${budget_date}, budget_date),
        updated_at = NOW()
      WHERE id = ${parseInt(id)} AND department_id = ${user.department_id}
      RETURNING *
    `;

    if (result.length === 0) {
      return NextResponse.json({ success: false, error: 'Budget not found' }, { status: 404 });
    }

    if (breakdowns && Array.isArray(breakdowns)) {
      await sql`DELETE FROM budget_breakdowns WHERE budget_id = ${parseInt(id)}`;
      for (const bd of breakdowns) {
        if (bd.name && bd.amount) {
          await sql`
            INSERT INTO budget_breakdowns (budget_id, name, amount, payment_method)
            VALUES (${parseInt(id)}, ${bd.name}, ${parseFloat(bd.amount)}, ${bd.payment_method || 'cash'})
          `;
        }
      }
    }

    return NextResponse.json({ success: true, data: result[0] });
  } catch (err) {
    console.error('Budgets PUT error:', err);
    return NextResponse.json({ success: false, error: 'Failed to update budget' }, { status: 500 });
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
      return NextResponse.json({ success: false, error: 'Budget ID is required' }, { status: 400 });
    }

    await sql`DELETE FROM budgets WHERE id = ${parseInt(id)} AND department_id = ${user.department_id}`;

    return NextResponse.json({ success: true, message: 'Budget deleted successfully' });
  } catch (err) {
    console.error('Budgets DELETE error:', err);
    return NextResponse.json({ success: false, error: 'Failed to delete budget' }, { status: 500 });
  }
}

function getFiscalYear(date: Date): string {
  const month = date.getMonth();
  const year = date.getFullYear();
  if (month >= 3) {
    return `${year}-${(year + 1).toString().slice(-2)}`;
  } else {
    return `${year - 1}-${year.toString().slice(-2)}`;
  }
}