import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getCurrentUser, canPerformAction } from '@/lib/auth';
import { formatCurrency, formatDate, getCurrentFiscalYear } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status:  401 });
    }

    if (!canPerformAction(user.role, 'download_reports')) {
      return NextResponse.json({ success: false, error: 'Permission denied' }, { status:  403 });
    }

    const body = await request.json();
    const { type, fiscal_year, format = 'csv' } = body;
    const fiscalYear = fiscal_year || getCurrentFiscalYear();

    let data: any[] = [];
    let headers:  string[] = [];
    let filename = '';

    switch (type) {
      case 'monthly':  {
        const result = await sql`
          SELECT 
            TO_CHAR(expense_date, 'Mon YYYY') as month,
            c.name as category,
            COUNT(*)::int as transactions,
            SUM(CASE WHEN e.status = 'approved' THEN e.amount ELSE 0 END)::numeric as approved_amount
          FROM expenses e
          JOIN categories c ON c.id = e.category_id
          WHERE e.department_id = ${user.department_id}
          GROUP BY TO_CHAR(expense_date, 'Mon YYYY'), c.name
          ORDER BY MIN(expense_date) DESC
        `;
        
        headers = ['Month', 'Category', 'Transactions', 'Approved Amount'];
        data = result.map(r => [
          r.month,
          r.category,
          r.transactions,
          formatCurrency(Number(r.approved_amount))
        ]);
        filename = `monthly-report-${fiscalYear}`;
        break;
      }

      case 'category': {
        const result = await sql`
          SELECT 
            c.name as category,
            COALESCE(bp.proposed_amount, 0)::numeric as proposed,
            COALESCE(ba.allotted_amount, 0)::numeric as allotted,
            COALESCE(SUM(CASE WHEN e.status = 'approved' THEN e.amount ELSE 0 END), 0)::numeric as spent
          FROM categories c
          LEFT JOIN budget_plans bp ON bp.category_id = c. id 
            AND bp.fiscal_year = ${fiscalYear} AND bp.department_id = ${user.department_id}
          LEFT JOIN budget_allotments ba ON ba.category_id = c.id 
            AND ba. fiscal_year = ${fiscalYear} AND ba.department_id = ${user.department_id}
          LEFT JOIN expenses e ON e.category_id = c.id AND e.department_id = ${user.department_id}
          WHERE c.is_active = true
          GROUP BY c.id, c.name, bp.proposed_amount, ba.allotted_amount
          ORDER BY c.name
        `;
        
        headers = ['Category', 'Proposed', 'Allotted', 'Spent', 'Remaining', 'Utilization %'];
        data = result.map(r => {
          const allotted = Number(r.allotted);
          const spent = Number(r.spent);
          const remaining = allotted - spent;
          const util = allotted > 0 ? ((spent / allotted) * 100).toFixed(1) : '0';
          return [
            r.category,
            formatCurrency(Number(r.proposed)),
            formatCurrency(allotted),
            formatCurrency(spent),
            formatCurrency(remaining),
            util + '%'
          ];
        });
        filename = `category-report-${fiscalYear}`;
        break;
      }

      case 'budget': {
        const result = await sql`
          SELECT 
            c.name as category,
            COALESCE(bp.proposed_amount, 0)::numeric as proposed,
            COALESCE(ba.allotted_amount, 0)::numeric as allotted
          FROM categories c
          LEFT JOIN budget_plans bp ON bp. category_id = c.id 
            AND bp.fiscal_year = ${fiscalYear} AND bp. department_id = ${user.department_id}
          LEFT JOIN budget_allotments ba ON ba.category_id = c. id 
            AND ba.fiscal_year = ${fiscalYear} AND ba.department_id = ${user.department_id}
          WHERE c.is_active = true
          ORDER BY c.name
        `;
        
        headers = ['Category', 'Proposed', 'Allotted', 'Variance', 'Status'];
        data = result.map(r => {
          const proposed = Number(r. proposed);
          const allotted = Number(r.allotted);
          const variance = allotted - proposed;
          return [
            r. category,
            formatCurrency(proposed),
            formatCurrency(allotted),
            (variance >= 0 ? '+' : '') + formatCurrency(variance),
            variance >= 0 ?  'Surplus' : 'Deficit'
          ];
        });
        filename = `budget-variance-${fiscalYear}`;
        break;
      }

      case 'vendor': {
        const result = await sql`
          SELECT 
            e.vendor,
            COUNT(*)::int as transactions,
            SUM(CASE WHEN e.status = 'approved' THEN e.amount ELSE 0 END)::numeric as approved,
            SUM(CASE WHEN e.status = 'pending' THEN e. amount ELSE 0 END)::numeric as pending,
            SUM(e.amount)::numeric as total
          FROM expenses e
          WHERE e.department_id = ${user.department_id}
          GROUP BY e.vendor
          ORDER BY SUM(e.amount) DESC
        `;
        
        headers = ['Vendor', 'Transactions', 'Approved', 'Pending', 'Total'];
        data = result.map(r => [
          r. vendor,
          r.transactions,
          formatCurrency(Number(r.approved)),
          formatCurrency(Number(r. pending)),
          formatCurrency(Number(r.total))
        ]);
        filename = `vendor-report-${fiscalYear}`;
        break;
      }

      case 'audit': {
        const result = await sql`
          SELECT 
            al.created_at,
            COALESCE(u.name, 'System') as user_name,
            al.action,
            al.entity_type,
            al.entity_id
          FROM audit_logs al
          LEFT JOIN users u ON u. id = al.user_id
          ORDER BY al.created_at DESC
          LIMIT 500
        `;
        
        headers = ['Timestamp', 'User', 'Action', 'Entity Type', 'Entity ID'];
        data = result.map(r => [
          formatDate(r.created_at, 'dd MMM yyyy HH:mm'),
          r.user_name,
          r.action,
          r. entity_type,
          r.entity_id || '-'
        ]);
        filename = `audit-report-${fiscalYear}`;
        break;
      }

      case 'expenses':
      case 'summary':  {
        const result = await sql`
          SELECT 
            e.expense_date,
            c.name as category,
            e.vendor,
            e. description,
            e.amount,
            e. status
          FROM expenses e
          JOIN categories c ON c.id = e.category_id
          WHERE e.department_id = ${user.department_id}
          ORDER BY e.expense_date DESC
        `;
        
        headers = ['Date', 'Category', 'Vendor', 'Description', 'Amount', 'Status'];
        data = result.map(r => [
          formatDate(r. expense_date, 'dd MMM yyyy'),
          r.category,
          r.vendor,
          r.description || '-',
          formatCurrency(Number(r.amount)),
          r.status
        ]);
        filename = `expenses-report-${fiscalYear}`;
        break;
      }

      default: 
        return NextResponse.json(
          { success:  false, error: `Unknown report type: ${type}` },
          { status: 400 }
        );
    }

    // Generate CSV
    const csvRows = [headers.join(',')];
    for (const row of data) {
      const escapedRow = row. map((cell:  any) => {
        const str = String(cell ??  '');
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      });
      csvRows. push(escapedRow.join(','));
    }
    const csvContent = csvRows.join('\n');

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}.csv"`,
      },
    });

  } catch (error:  any) {
    console.error('Report download error:', error);
    return NextResponse.json(
      { success: false, error: 'Report generation failed:  ' + (error. message || 'Unknown error') },
      { status: 500 }
    );
  }
}