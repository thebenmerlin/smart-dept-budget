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

    // Get budget totals from new budgets table
    const budgetTotals = await sql`
      SELECT 
        COALESCE(SUM(amount), 0) as total_budget,
        COUNT(*) as budget_count
      FROM budgets
      WHERE department_id = ${user.department_id}
        AND fiscal_year = ${fiscalYear}
        AND status = 'active'
    `;

    // Get expense summary from expenses_new table
    const expenseSummary = await sql`
      SELECT 
        COALESCE(SUM(CASE WHEN status = 'approved' THEN amount ELSE 0 END), 0) as total_spent,
        COALESCE(SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END), 0) as pending_amount,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_count,
        COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved_count,
        COUNT(CASE WHEN status = 'rejected' THEN 1 END) as rejected_count,
        COUNT(*) as total_count
      FROM expenses_new
      WHERE department_id = ${user.department_id}
    `;

    // Fall back to legacy tables if no data in new tables
    let totalBudget = Number(budgetTotals[0]?.total_budget || 0);

    if (totalBudget === 0) {
      const legacyBudget = await sql`
        SELECT COALESCE(SUM(ba.allotted_amount), 0) as total_allotted
        FROM budget_allotments ba
        WHERE ba.fiscal_year = ${fiscalYear}
          AND ba.department_id = ${user.department_id}
      `;
      totalBudget = Number(legacyBudget[0]?.total_allotted || 0);
    }

    // Get monthly trend from expenses_new
    const monthlyTrend = await sql`
      SELECT 
        TO_CHAR(expense_date, 'Mon') as month,
        EXTRACT(MONTH FROM expense_date) as month_num,
        SUM(CASE WHEN status = 'approved' THEN amount ELSE 0 END) as total
      FROM expenses_new
      WHERE department_id = ${user.department_id}
      GROUP BY TO_CHAR(expense_date, 'Mon'), EXTRACT(MONTH FROM expense_date)
      ORDER BY month_num
    `;

    // Get category breakdown
    const categoryBreakdown = await sql`
      SELECT 
        c.name as category,
        COALESCE(SUM(CASE WHEN e.status = 'approved' THEN e.amount ELSE 0 END), 0) as total
      FROM categories c
      LEFT JOIN expenses_new e ON e.category_id = c.id 
        AND e.department_id = ${user.department_id}
      WHERE c.is_active = true
      GROUP BY c.id, c.name
      HAVING COALESCE(SUM(CASE WHEN e.status = 'approved' THEN e.amount ELSE 0 END), 0) > 0
      ORDER BY total DESC
      LIMIT 6
    `;

    // Get recent activity (combined budgets and expenses)
    const recentBudgets = await sql`
      SELECT 
        id, name, amount, created_at,
        'budget_created' as activity_type,
        status
      FROM budgets
      WHERE department_id = ${user.department_id}
      ORDER BY created_at DESC
      LIMIT 5
    `;

    const recentExpenses = await sql`
      SELECT 
        e.id, e.name, e.amount, e.created_at, e.status, e.expense_date,
        CASE 
          WHEN e.status = 'approved' THEN 'expense_approved'
          WHEN e.status = 'rejected' THEN 'expense_rejected'
          ELSE 'expense_created'
        END as activity_type,
        c.name as category_name,
        b.name as budget_name
      FROM expenses_new e
      LEFT JOIN categories c ON c.id = e.category_id
      LEFT JOIN budgets b ON b.id = e.budget_id
      WHERE e.department_id = ${user.department_id}
      ORDER BY e.created_at DESC
      LIMIT 5
    `;

    // Combine and sort recent activity
    const recentActivity = [
      ...recentBudgets.map((b: any) => ({
        id: b.id,
        type: 'budget',
        activity_type: b.activity_type,
        name: b.name,
        amount: Number(b.amount),
        date: b.created_at,
        status: b.status,
      })),
      ...recentExpenses.map((e: any) => ({
        id: e.id,
        type: 'expense',
        activity_type: e.activity_type,
        name: e.name,
        amount: Number(e.amount),
        date: e.created_at,
        status: e.status,
        category_name: e.category_name,
        budget_name: e.budget_name,
      })),
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 8);

    // Get upcoming events (budget dates, expense breakdown dates in future)
    const upcomingBudgetDates = await sql`
      SELECT 
        id, name, amount, budget_date as event_date,
        'budget_date' as event_type
      FROM budgets
      WHERE department_id = ${user.department_id}
        AND budget_date >= CURRENT_DATE
        AND status = 'active'
      ORDER BY budget_date ASC
      LIMIT 5
    `;

    const upcomingBreakdownDates = await sql`
      SELECT 
        eb.id, eb.name, eb.amount, eb.breakdown_date as event_date,
        'breakdown_due' as event_type,
        e.name as expense_name
      FROM expense_breakdowns eb
      JOIN expenses_new e ON e.id = eb.expense_id
      WHERE e.department_id = ${user.department_id}
        AND eb.breakdown_date >= CURRENT_DATE
        AND e.status = 'pending'
      ORDER BY eb.breakdown_date ASC
      LIMIT 5
    `;

    const upcomingEvents = [
      ...upcomingBudgetDates.map((b: any) => ({
        id: b.id,
        type: 'budget',
        event_type: b.event_type,
        name: b.name,
        amount: Number(b.amount),
        date: b.event_date,
      })),
      ...upcomingBreakdownDates.map((eb: any) => ({
        id: eb.id,
        type: 'breakdown',
        event_type: eb.event_type,
        name: eb.name,
        amount: Number(eb.amount),
        date: eb.event_date,
        expense_name: eb.expense_name,
      })),
    ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()).slice(0, 5);

    const totalSpent = Number(expenseSummary[0]?.total_spent || 0);
    const utilization = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;

    return NextResponse.json({
      success: true,
      data: {
        fiscalYear,
        summary: {
          totalBudget,
          totalSpent,
          pendingAmount: Number(expenseSummary[0]?.pending_amount || 0),
          remaining: totalBudget - totalSpent,
          utilization,
          pendingCount: Number(expenseSummary[0]?.pending_count || 0),
          approvedCount: Number(expenseSummary[0]?.approved_count || 0),
          rejectedCount: Number(expenseSummary[0]?.rejected_count || 0),
          budgetCount: Number(budgetTotals[0]?.budget_count || 0),
        },
        monthlyTrend: monthlyTrend.map((m: any) => ({
          month: m.month,
          total: Number(m.total),
        })),
        categoryBreakdown: categoryBreakdown.map((c: any) => ({
          category: c.category,
          total: Number(c.total),
        })),
        recentActivity,
        upcomingEvents,
        recentExpenses: recentExpenses.map((e: any) => ({
          id: e.id,
          name: e.name,
          amount: Number(e.amount),
          expense_date: e.expense_date,
          status: e.status,
          category_name: e.category_name,
        })),
      },
    });
  } catch (error) {
    console.error('Analytics API error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}