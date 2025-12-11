import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getCurrentUser, canPerformAction } from '@/lib/auth';
import { createAuditLog } from '@/lib/audit';
import { generatePDFReport, generateCSVReport } from '@/lib/pdf';
import { getCurrentFiscalYear, formatCurrency, formatDate } from '@/lib/utils';

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { success:  false, error: 'Unauthorized' },
        { status:  401 }
      );
    }

    if (!canPerformAction(user.role, 'download_reports')) {
      return NextResponse. json(
        { success: false, error: 'Permission denied' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { type, fiscal_year, start_date, end_date, format = 'pdf' } = body;
    const fiscalYear = fiscal_year || getCurrentFiscalYear();

    let reportData: any[];
    let columns: any[];
    let title: string;

    switch (type) {
      case 'monthly':
        const monthlyData = await sql`
          SELECT 
            TO_CHAR(expense_date, 'Month YYYY') as month,
            c.name as category,
            COUNT(*) as transactions,
            SUM(CASE WHEN status = 'approved' THEN amount ELSE 0 END) as approved_amount
          FROM expenses e
          JOIN categories c ON c.id = e.category_id
          WHERE e.department_id = ${user.department_id}
            ${start_date ? sql`AND e.expense_date >= ${start_date}` : sql``}
            ${end_date ? sql`AND e.expense_date <= ${end_date}` : sql``}
          GROUP BY TO_CHAR(expense_date, 'Month YYYY'), c.name
          ORDER BY MIN(expense_date), c.name
        `;

        reportData = monthlyData.map((row) => ({
          ... row,
          approved_amount: formatCurrency(Number(row.approved_amount)),
        }));

        columns = [
          { key: 'month', header: 'Month', width: 120 },
          { key: 'category', header: 'Category', width: 120 },
          { key: 'transactions', header: 'Transactions', width:  80, align: 'right' as const },
          { key: 'approved_amount', header:  'Amount', width: 100, align: 'right' as const },
        ];

        title = 'Monthly Expense Report';
        break;

      case 'category':
        const categoryData = await sql`
          SELECT 
            c.name as category,
            COALESCE(bp.proposed_amount, 0) as proposed,
            COALESCE(ba.allotted_amount, 0) as allotted,
            COALESCE(SUM(CASE WHEN e.status = 'approved' THEN e.amount ELSE 0 END), 0) as spent
          FROM categories c
          LEFT JOIN budget_plans bp ON bp.category_id = c.id 
            AND bp.fiscal_year = ${fiscalYear} AND bp.department_id = ${user. department_id}
          LEFT JOIN budget_allotments ba ON ba.category_id = c.id 
            AND ba. fiscal_year = ${fiscalYear} AND ba.department_id = ${user.department_id}
          LEFT JOIN expenses e ON e.category_id = c.id AND e.department_id = ${user.department_id}
          WHERE c.is_active = true
          GROUP BY c.id, c.name, bp.proposed_amount, ba.allotted_amount
          ORDER BY c.name
        `;

        reportData = categoryData.map((row) => ({
          category: row.category,
          proposed: formatCurrency(Number(row.proposed)),
          allotted:  formatCurrency(Number(row.allotted)),
          spent: formatCurrency(Number(row.spent)),
          remaining: formatCurrency(Number(row.allotted) - Number(row.spent)),
        }));

        columns = [
          { key: 'category', header:  'Category', width: 120 },
          { key:  'proposed', header: 'Proposed', width: 90, align: 'right' as const },
          { key:  'allotted', header: 'Allotted', width: 90, align: 'right' as const },
          { key: 'spent', header:  'Spent', width: 90, align: 'right' as const },
          { key: 'remaining', header:  'Remaining', width: 90, align: 'right' as const },
        ];

        title = 'Category-wise Budget Report';
        break;

      default:
        return NextResponse.json(
          { success: false, error: 'Invalid report type' },
          { status:  400 }
        );
    }

    await createAuditLog({
      userId:  user.id,
      action: 'GENERATE_REPORT',
      entityType: 'report',
      newValues: { type, fiscal_year:  fiscalYear, format },
    });

    if (format === 'csv') {
      const csvContent = await generateCSVReport(columns, reportData);

      return new NextResponse(csvContent, {
        status: 200,
        headers:  {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="${type}-report-${fiscalYear}.csv"`,
        },
      });
    } else {
      const pdfBuffer = await generatePDFReport({
        title,
        generatedAt: formatDate(new Date(), 'dd MMM yyyy, HH:mm'),
        generatedBy: user.name,
        fiscalYear,
        department: 'CSBS',
        data: reportData,
        columns,
      });

      return new NextResponse(new Uint8Array(pdfBuffer), {
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition':  `attachment; filename="${type}-report-${fiscalYear}.pdf"`,
        },
      });
    }
  } catch (error) {
    console.error('Report download API error:', error);
    return NextResponse. json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}