import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getCurrentUser, canPerformAction } from '@/lib/auth';
import { createAuditLog } from '@/lib/audit';
import { budgetAllotmentSchema, validateRequest } from '@/lib/validations';

export const dynamic = 'force-dynamic';

// POST - Create/Update budget allotment (Admin/HOD only)
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Only admin and HOD can allocate budgets
    if (!['admin', 'hod']. includes(user.role)) {
      return NextResponse.json(
        { success:  false, error: 'Only Admin or HOD can allocate budgets' },
        { status:  403 }
      );
    }

    const body = await request.json();
    const validation = validateRequest(budgetAllotmentSchema, body);

    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation. error },
        { status: 400 }
      );
    }

    const { category_id, fiscal_year, allotted_amount, notes } = validation. data;

    // Upsert budget allotment
    const result = await sql`
      INSERT INTO budget_allotments (department_id, category_id, fiscal_year, allotted_amount, notes, approved_by, approved_at)
      VALUES (${user.department_id}, ${category_id}, ${fiscal_year}, ${allotted_amount}, ${notes || null}, ${user.id}, NOW())
      ON CONFLICT (department_id, category_id, fiscal_year)
      DO UPDATE SET 
        allotted_amount = ${allotted_amount},
        notes = ${notes || null},
        approved_by = ${user.id},
        approved_at = NOW(),
        updated_at = NOW()
      RETURNING *
    `;

    await createAuditLog({
      userId:  user.id,
      action: 'CREATE_BUDGET_ALLOTMENT',
      entityType:  'budget_allotment',
      entityId: result[0].id,
      newValues: validation.data,
    });

    return NextResponse.json({
      success: true,
      data: result[0],
    });
  } catch (error) {
    console.error('Budget Allotments POST API error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}