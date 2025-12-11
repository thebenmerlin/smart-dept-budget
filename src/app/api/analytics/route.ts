import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { getCurrentFiscalYear } from '@/lib/utils';

export const dynamic = 'force-dynamic';

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

    // Get overall budget summary
    const budgetSummary = await sql`
      SELECT 
        COALESCE(SUM(bp.proposed_amount), 0) as total_proposed,
        COALESCE(SUM(ba.allotted_amount), 0) as total_allotted
      FROM categories c
      LEFT JOIN budget_plans bp ON bp.category_id = c. id 
        AND bp.fiscal_year = ${fiscalYear}
        AND bp.department_id = ${user.department_id}
      LEFT JOIN budget_allotments ba ON ba.category_id = c.id 
        AND ba.fiscal_year = ${fiscalYear}
        AND ba.department_id = ${user. department_id}
      WHERE c.is_active = true
    `;

    // Get expense summary
    const expenseSummary = await sql`
      SELECT 
        COALESCE(SUM(CASE WHEN status = 'approved' THEN amount ELSE 0 END), 0) as total_spent,
        COALESCE(SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END), 0) as pending_amount,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_count,
        COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved_count,
        COUNT(CASE WHEN status = 'rejected' THEN 1 END) as rejected_count,
        COUNT(*) as total_count
      FROM expenses
      WHERE department_id = ${user.department_id}
        AND EXTRACT(YEAR FROM expense_date) >= CAST(SPLIT_PART(${fiscalYear}, '-', 1) AS INT)
    `;

    // Get monthly trend
    const monthlyTrend = await sql`
      SELECT 
        TO_CHAR(expense_date, 'Mon') as month,
        EXTRACT(MONTH FROM expense_date) as month_num,
        SUM(CASE WHEN status = 'approved' THEN amount ELSE 0 END) as total
      FROM expenses
      WHERE department_id = ${user.department_id}
        AND EXTRACT(YEAR FROM expense_date) >= CAST(SPLIT_PART(${fiscalYear}, '-', 1) AS INT)
      GROUP BY TO_CHAR(expense_date, 'Mon'), EXTRACT(MONTH FROM expense_date)
      ORDER BY month_num
    `;

    // Get category breakdown
    const categoryBreakdown = await sql`
      SELECT 
        c. name as category,
        COALESCE(SUM(CASE WHEN e.status = 'approved' THEN e.amount ELSE 0 END), 0) as total,
        COALESCE(ba.allotted_amount, 0) as allotted
      FROM categories c
      LEFT JOIN expenses e ON e.category_id = c. id 
        AND e. department_id = ${user.department_id}
      LEFT JOIN budget_allotments ba ON ba.category_id = c. id 
        AND ba.fiscal_year = ${fiscalYear}
        AND ba.department_id = ${user. department_id}
      WHERE c.is_active = true
      GROUP BY c.id, c.name, ba.allotted_amount
      ORDER BY total DESC
    `;

    // Get recent expenses
    const recentExpenses = await sql`
      SELECT 
        e.id, e.amount, e.vendor, e.expense_date, e.status, e.description,
        c.name as category_name
      FROM expenses e
      JOIN categories c ON c.id = e.category_id
      WHERE e.department_id = ${user.department_id}
      ORDER BY e.created_at DESC
      LIMIT 5
    `;

    // Get receipts count
    const receiptsCount = await sql`
      SELECT COUNT(*) as count
      FROM expense_receipts er
      JOIN expenses e ON e.id = er.expense_id
      WHERE e.department_id = ${user.department_id}
    `;

    const totalAllotted = Number(budgetSummary[0]?.total_allotted || 0);
    const totalSpent = Number(expenseSummary[0]?.total_spent || 0);
    const utilization = totalAllotted > 0 ? (totalSpent / totalAllotted) * 100 : 0;

    return NextResponse.json({
      success: true,
      data: {
        fiscalYear,
        summary: {
          totalProposed: Number(budgetSummary[0]?. total_proposed || 0),
          totalAllotted,
          totalSpent,
          pendingAmount: Number(expenseSummary[0]?.pending_amount || 0),
          remaining: totalAllotted - totalSpent,
          utilization,
          pendingCount: Number(expenseSummary[0]?.pending_count || 0),
          approvedCount: Number(expenseSummary[0]?.approved_count || 0),
          rejectedCount: Number(expenseSummary[0]?.rejected_count || 0),
          receiptsCount:  Number(receiptsCount[0]?.count || 0),
        },
        monthlyTrend:  monthlyTrend. map((m) => ({
          month: m.month,
          total: Number(m. total),
        })),
        categoryBreakdown:  categoryBreakdown. map((c) => ({
          category:  c.category,
          total: Number(c.total),
          allotted: Number(c.allotted),
        })),
        recentExpenses,
      },
    });
  } catch (error) {
    console.error('Analytics API error:', error);
    return NextResponse. json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}