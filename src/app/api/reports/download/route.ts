import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getCurrentUser, canPerformAction } from '@/lib/auth';
import { createAuditLog } from '@/lib/audit';
import { generatePDFReport, generateCSVReport } from '@/lib/pdf';
import { formatCurrency, formatDate, getCurrentFiscalYear } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    if (!canPerformAction(user.role, 'download_reports')) {
      return NextResponse.json(
        { success: false, error: 'Permission denied' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { type, fiscal_year, format = 'pdf' } = body;
    const fiscalYear = fiscal_year || getCurrentFiscalYear();

    // Get report data based on type
    let reportData: any[];
    let columns: any[];
    let title: string;

    switch (type) {
      case 'summary':
        const summaryData = await sql`
          SELECT 
            c.name as category,
            COALESCE(ba.allotted_amount, 0) as allotted,
            COALESCE(SUM(CASE WHEN e.status = 'approved' THEN e.amount ELSE 0 END), 0) as spent,
            COALESCE(ba.allotted_amount, 0) - COALESCE(SUM(CASE WHEN e.status = 'approved' THEN e.amount ELSE 0 END), 0) as remaining
          FROM categories c
          LEFT JOIN budget_allotments ba ON ba.category_id = c.id 
            AND ba.fiscal_year = ${fiscalYear}
            AND ba.department_id = ${user.department_id}
          LEFT JOIN expenses e ON e.category_id = c.id 
            AND e.department_id = ${user.department_id}
          WHERE c.is_active = true
          GROUP BY c.name, ba.allotted_amount
          ORDER BY c.name
        `;
        
        reportData = summaryData.map((row) => ({
          category: row.category,
          allotted: formatCurrency(Number(row.allotted)),
          spent: formatCurrency(Number(row.spent)),
          remaining: formatCurrency(Number(row.remaining)),
        }));

        columns = [
          { key: 'category', header: 'Category', width: 150 },
          { key: 'allotted', header: 'Allotted', width: 100, align: 'right' as const },
          { key: 'spent', header: 'Spent', width: 100, align: 'right' as const },
          { key: 'remaining', header: 'Remaining', width: 100, align: 'right' as const },
        ];

        title = `Budget Summary Report - FY ${fiscalYear}`;
        break;

      case 'expenses':
        const expensesData = await sql`
          SELECT 
            e.expense_date,
            c.name as category,
            e.vendor,
            e.description,
            e.amount,
            e.status
          FROM expenses e
          JOIN categories c ON c.id = e.category_id
          WHERE e.department_id = ${user.department_id}
          ORDER BY e.expense_date DESC
        `;
        
        reportData = expensesData.map((row) => ({
          expense_date: formatDate(row.expense_date, 'dd MMM yyyy'),
          category: row.category,
          vendor: row.vendor,
          description: row.description || '-',
          amount: formatCurrency(Number(row.amount)),
          status: row.status,
        }));

        columns = [
          { key: 'expense_date', header: 'Date', width: 80 },
          { key: 'category', header: 'Category', width: 100 },
          { key: 'vendor', header: 'Vendor', width: 100 },
          { key: 'description', header: 'Description', width: 150 },
          { key: 'amount', header: 'Amount', width: 80, align: 'right' as const },
          { key: 'status', header: 'Status', width: 70 },
        ];

        title = `Expenses Report - FY ${fiscalYear}`;
        break;

      default:
        return NextResponse.json(
          { success: false, error: 'Invalid report type' },
          { status: 400 }
        );
    }

    // Audit log
    await createAuditLog({
      userId: user.id,
      action: 'GENERATE_REPORT',
      entityType: 'report',
      newValues: { type, format, fiscal_year: fiscalYear },
    });

    // Generate report
    if (format === 'csv') {
      const csvContent = await generateCSVReport(columns, reportData);

      return new NextResponse(csvContent, {
        status: 200,
        headers: {
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
          'Content-Disposition': `attachment; filename="${type}-report-${fiscalYear}.pdf"`,
        },
      });
    }
  } catch (error) {
    console.error('Report download error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}