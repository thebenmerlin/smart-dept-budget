import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getCurrentUser, canPerformAction } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// Get report data for inline preview
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    if (!canPerformAction(user.role, 'download_reports')) {
      return NextResponse.json({ success: false, error: 'Permission denied' }, { status: 403 });
    }

    const url = new URL(request.url);
    const type = url.searchParams.get('type') || 'budget'; // budget or expense
    const fromMonth = url.searchParams.get('from_month'); // 1-12
    const toMonth = url.searchParams.get('to_month'); // 1-12
    const fromYear = url.searchParams.get('from_year') || url.searchParams.get('year') || new Date().getFullYear().toString();
    const toYear = url.searchParams.get('to_year') || fromYear;

    let data: any[] = [];

    // Build date range filter
    const fromDate = fromMonth ? new Date(parseInt(fromYear), parseInt(fromMonth) - 1, 1) : null;
    const toDate = toMonth ? new Date(parseInt(toYear), parseInt(toMonth), 0) : null; // Last day of toMonth

    if (type === 'budget') {
      // Fetch budget data
      if (fromDate && toDate) {
        data = await sql`
          SELECT 
            b.id,
            b.budget_date,
            b.name,
            c.name as category_name,
            b.amount,
            b.source,
            b.payment_method,
            b.status,
            u.name as created_by_name
          FROM budgets b
          LEFT JOIN categories c ON c.id = b.category_id
          LEFT JOIN users u ON u.id = b.created_by
          WHERE b.department_id = ${user.department_id}
            AND b.budget_date >= ${fromDate.toISOString().split('T')[0]}
            AND b.budget_date <= ${toDate.toISOString().split('T')[0]}
          ORDER BY b.budget_date DESC
        `;
      } else {
        data = await sql`
          SELECT 
            b.id,
            b.budget_date,
            b.name,
            c.name as category_name,
            b.amount,
            b.source,
            b.payment_method,
            b.status,
            u.name as created_by_name
          FROM budgets b
          LEFT JOIN categories c ON c.id = b.category_id
          LEFT JOIN users u ON u.id = b.created_by
          WHERE b.department_id = ${user.department_id}
            AND EXTRACT(YEAR FROM b.budget_date) = ${parseInt(fromYear)}
          ORDER BY b.budget_date DESC
        `;
      }
    } else if (type === 'expense') {
      // Fetch expense data with budget info
      if (fromDate && toDate) {
        data = await sql`
          SELECT 
            e.id,
            e.expense_date,
            e.name,
            e.amount,
            b.name as budget_name,
            c.name as category_name,
            e.spender,
            e.payment_method,
            e.status,
            u.name as created_by_name
          FROM expenses_new e
          LEFT JOIN budgets b ON b.id = e.budget_id
          LEFT JOIN categories c ON c.id = e.category_id
          LEFT JOIN users u ON u.id = e.created_by
          WHERE e.department_id = ${user.department_id}
            AND e.expense_date >= ${fromDate.toISOString().split('T')[0]}
            AND e.expense_date <= ${toDate.toISOString().split('T')[0]}
          ORDER BY e.expense_date DESC
        `;
      } else {
        data = await sql`
          SELECT 
            e.id,
            e.expense_date,
            e.name,
            e.amount,
            b.name as budget_name,
            c.name as category_name,
            e.spender,
            e.payment_method,
            e.status,
            u.name as created_by_name
          FROM expenses_new e
          LEFT JOIN budgets b ON b.id = e.budget_id
          LEFT JOIN categories c ON c.id = e.category_id
          LEFT JOIN users u ON u.id = e.created_by
          WHERE e.department_id = ${user.department_id}
            AND EXTRACT(YEAR FROM e.expense_date) = ${parseInt(fromYear)}
          ORDER BY e.expense_date DESC
        `;
      }
    }

    // Calculate totals
    const total = data.reduce((sum, item) => sum + Number(item.amount || 0), 0);

    return NextResponse.json({
      success: true,
      data,
      total,
      meta: {
        type,
        fromYear,
        toYear,
        fromMonth: fromMonth || '1',
        toMonth: toMonth || '12',
        count: data.length,
      },
    });
  } catch (error: any) {
    console.error('Report data error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch report data: ' + (error.message || 'Unknown error') },
      { status: 500 }
    );
  }
}
