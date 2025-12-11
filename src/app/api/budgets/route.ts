import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getCurrentUser, canPerformAction } from '@/lib/auth';
import { createAuditLog } from '@/lib/audit';
import { budgetPlanSchema, validateRequest } from '@/lib/validations';
import { getCurrentFiscalYear } from '@/lib/utils';

export const dynamic = 'force-dynamic';

// GET - List all budgets with variance calculation
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const fiscalYear = searchParams.get('fiscal_year') || getCurrentFiscalYear();

    // Get budget plans, allotments, and actual spending per category
    const budgetData = await sql`
      SELECT 
        c.id as category_id,
        c.name as category_name,
        c.description as category_description,
        COALESCE(bp.proposed_amount, 0) as proposed_amount,
        COALESCE(ba.allotted_amount, 0) as allotted_amount,
        COALESCE(SUM(CASE WHEN e.status = 'approved' THEN e.amount ELSE 0 END), 0) as spent_amount,
        bp.status as plan_status,
        bp.id as plan_id,
        ba.id as allotment_id,
        bp.justification,
        ba.notes as allotment_notes
      FROM categories c
      LEFT JOIN budget_plans bp ON bp.category_id = c.id 
        AND bp.fiscal_year = ${fiscalYear}
        AND bp.department_id = ${user.department_id}
      LEFT JOIN budget_allotments ba ON ba.category_id = c. id 
        AND ba. fiscal_year = ${fiscalYear}
        AND ba.department_id = ${user. department_id}
      LEFT JOIN expenses e ON e.category_id = c. id 
        AND e.department_id = ${user.department_id}
        AND EXTRACT(YEAR FROM e.expense_date) = CAST(SPLIT_PART(${fiscalYear}, '-', 1) AS INT)
      WHERE c.is_active = true
      GROUP BY c.id, c.name, c.description, bp. proposed_amount, ba.allotted_amount, 
               bp.status, bp.id, ba.id, bp.justification, ba.notes
      ORDER BY c.name
    `;

    // Calculate totals and variance
    const totals = budgetData.reduce(
      (acc, row) => ({
        proposed: acc.proposed + Number(row.proposed_amount),
        allotted: acc. allotted + Number(row.allotted_amount),
        spent: acc. spent + Number(row.spent_amount),
      }),
      { proposed: 0, allotted:  0, spent:  0 }
    );

    const budgets = budgetData. map((row) => ({
      ... row,
      proposed_amount: Number(row.proposed_amount),
      allotted_amount: Number(row.allotted_amount),
      spent_amount: Number(row.spent_amount),
      variance: Number(row.allotted_amount) - Number(row. proposed_amount),
      remaining: Number(row.allotted_amount) - Number(row.spent_amount),
      utilization: row.allotted_amount > 0 
        ? (Number(row.spent_amount) / Number(row.allotted_amount)) * 100 
        : 0,
    }));

    return NextResponse.json({
      success:  true,
      data: {
        fiscalYear,
        budgets,
        totals:  {
          ... totals,
          variance: totals.allotted - totals.proposed,
          remaining: totals.allotted - totals.spent,
          utilization: totals.allotted > 0 ?  (totals.spent / totals.allotted) * 100 : 0,
        },
      },
    });
  } catch (error) {
    console.error('Budgets GET API error:', error);
    return NextResponse. json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Create budget plan (proposed)
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { success:  false, error: 'Unauthorized' },
        { status:  401 }
      );
    }

    if (!canPerformAction(user. role, 'manage_budgets')) {
      return NextResponse.json(
        { success: false, error:  'Permission denied' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validation = validateRequest(budgetPlanSchema, body);

    if (!validation. success) {
      return NextResponse.json(
        { success: false, error:  validation.error },
        { status: 400 }
      );
    }

    const { category_id, fiscal_year, proposed_amount, justification } = validation.data;

    // Upsert budget plan
    const result = await sql`
      INSERT INTO budget_plans (department_id, category_id, fiscal_year, proposed_amount, justification, created_by, status)
      VALUES (${user.department_id}, ${category_id}, ${fiscal_year}, ${proposed_amount}, ${justification || null}, ${user.id}, 'draft')
      ON CONFLICT (department_id, category_id, fiscal_year)
      DO UPDATE SET 
        proposed_amount = ${proposed_amount},
        justification = ${justification || null},
        updated_at = NOW()
      RETURNING *
    `;

    await createAuditLog({
      userId:  user.id,
      action: 'CREATE_BUDGET_PLAN',
      entityType: 'budget_plan',
      entityId: result[0].id,
      newValues: validation.data,
    });

    return NextResponse.json({
      success: true,
      data: result[0],
    });
  } catch (error) {
    console.error('Budgets POST API error:', error);
    return NextResponse.json(
      { success: false, error:  'Internal server error' },
      { status: 500 }
    );
  }
}