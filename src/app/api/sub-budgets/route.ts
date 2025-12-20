import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getCurrentUser, canPerformAction } from '@/lib/auth';
import { createAuditLog } from '@/lib/audit';
import { getCurrentFiscalYear } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export async function GET(request:  NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { success: false, error:  'Unauthorized' },
        { status: 401 }
      );
    }

    const url = new URL(request.url);
    const fiscalYear = url.searchParams. get('fiscal_year') || getCurrentFiscalYear();
    const categoryId = url.searchParams.get('category_id');
    const budgetType = url. searchParams.get('budget_type');
    const search = url.searchParams.get('search');

    let subBudgets;

    if (search) {
      subBudgets = await sql`
        SELECT 
          sb.*,
          c.name as category_name,
          u.name as created_by_name
        FROM sub_budgets sb
        LEFT JOIN categories c ON c.id = sb. category_id
        LEFT JOIN users u ON u.id = sb.created_by
        WHERE sb.department_id = ${user.department_id}
          AND sb.fiscal_year = ${fiscalYear}
          AND (
            sb.name ILIKE ${'%' + search + '%'}
            OR sb.description ILIKE ${'%' + search + '%'}
            OR c.name ILIKE ${'%' + search + '%'}
          )
        ORDER BY sb.created_at DESC
      `;
    } else if (categoryId && budgetType === 'category') {
      subBudgets = await sql`
        SELECT 
          sb.*,
          c.name as category_name,
          u.name as created_by_name
        FROM sub_budgets sb
        LEFT JOIN categories c ON c.id = sb.category_id
        LEFT JOIN users u ON u.id = sb.created_by
        WHERE sb. department_id = ${user.department_id}
          AND sb.fiscal_year = ${fiscalYear}
          AND sb. category_id = ${parseInt(categoryId)}
          AND sb.budget_type = 'category'
        ORDER BY sb.created_at DESC
      `;
    } else if (budgetType === 'independent') {
      subBudgets = await sql`
        SELECT 
          sb.*,
          u.name as created_by_name
        FROM sub_budgets sb
        LEFT JOIN users u ON u. id = sb.created_by
        WHERE sb.department_id = ${user.department_id}
          AND sb.fiscal_year = ${fiscalYear}
          AND sb.budget_type = 'independent'
        ORDER BY sb.created_at DESC
      `;
    } else {
      subBudgets = await sql`
        SELECT 
          sb.*,
          c.name as category_name,
          u.name as created_by_name
        FROM sub_budgets sb
        LEFT JOIN categories c ON c. id = sb.category_id
        LEFT JOIN users u ON u.id = sb. created_by
        WHERE sb.department_id = ${user. department_id}
          AND sb.fiscal_year = ${fiscalYear}
        ORDER BY sb.created_at DESC
      `;
    }

    return NextResponse.json({
      success: true,
      data:  subBudgets,
    });
  } catch (err) {
    console.error('Sub-budgets GET error:', err);
    const message = err instanceof Error ? err.message :  'Unknown error';
    return NextResponse.json(
      { success:  false, error: message },
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

    if (!canPerformAction(user. role, 'manage_budgets')) {
      return NextResponse.json(
        { success: false, error:  'Permission denied' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { category_id, name, description, amount, budget_type, fiscal_year } = body;

    if (!name || amount === undefined || amount === null) {
      return NextResponse.json(
        { success: false, error:  'Name and amount are required' },
        { status: 400 }
      );
    }

    const fy = fiscal_year || getCurrentFiscalYear();
    const type = budget_type || 'category';

    const result = await sql`
      INSERT INTO sub_budgets (
        department_id, category_id, fiscal_year, name, description, 
        amount, budget_type, created_by
      )
      VALUES (
        ${user.department_id},
        ${type === 'independent' ? null : category_id},
        ${fy},
        ${name},
        ${description || null},
        ${parseFloat(amount)},
        ${type},
        ${user.id}
      )
      RETURNING *
    `;

    try {
      await createAuditLog({
        userId: user.id,
        action: 'CREATE_SUB_BUDGET',
        entityType: 'sub_budget',
        entityId: result[0].id,
        newValues: { name, amount, budget_type:  type },
      });
    } catch (auditErr) {
      console.error('Audit log error:', auditErr);
    }

    return NextResponse.json({
      success: true,
      data:  result[0],
      message: 'Sub-budget created successfully',
    });
  } catch (err) {
    console. error('Sub-budgets POST error:', err);
    const message = err instanceof Error ?  err.message : 'Unknown error';
    return NextResponse. json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { success:  false, error: 'Unauthorized' },
        { status:  401 }
      );
    }

    if (!canPerformAction(user.role, 'manage_budgets')) {
      return NextResponse.json(
        { success: false, error: 'Permission denied' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { id, name, description, amount, status } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Sub-budget ID is required' },
        { status: 400 }
      );
    }

    const result = await sql`
      UPDATE sub_budgets
      SET 
        name = COALESCE(${name}, name),
        description = COALESCE(${description}, description),
        amount = COALESCE(${amount ?  parseFloat(amount) : null}, amount),
        status = COALESCE(${status}, status),
        updated_at = NOW()
      WHERE id = ${parseInt(id)} AND department_id = ${user.department_id}
      RETURNING *
    `;

    if (result.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Sub-budget not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data:  result[0],
    });
  } catch (err) {
    console.error('Sub-budgets PUT error:', err);
    const message = err instanceof Error ? err. message : 'Unknown error';
    return NextResponse.json(
      { success:  false, error: message },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    if (!canPerformAction(user.role, 'manage_budgets')) {
      return NextResponse. json(
        { success: false, error: 'Permission denied' },
        { status: 403 }
      );
    }

    const url = new URL(request.url);
    const id = url.searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Sub-budget ID is required' },
        { status: 400 }
      );
    }

    await sql`
      DELETE FROM sub_budgets 
      WHERE id = ${parseInt(id)} AND department_id = ${user.department_id}
    `;

    return NextResponse.json({
      success: true,
      message:  'Sub-budget deleted successfully',
    });
  } catch (err) {
    console.error('Sub-budgets DELETE error:', err);
    const message = err instanceof Error ? err. message : 'Unknown error';
    return NextResponse.json(
      { success:  false, error: message },
      { status: 500 }
    );
  }
}