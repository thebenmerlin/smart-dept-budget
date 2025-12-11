import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getCurrentUser, canPerformAction } from '@/lib/auth';
import { createAuditLog } from '@/lib/audit';
import { generatePDFReport, generateCSVReport } from '@/lib/pdf';
import { formatCurrency, formatDate, getCurrentFiscalYear } from '@/lib/utils';
import { reportFiltersSchema, validateRequest } from '@/lib/validations';

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // Increase timeout for Vercel

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    if (!canPerformAction(user. role, 'download_reports')) {
      return NextResponse.json(
        { success: false, error: 'Permission denied.  Only HOD and Admin can download reports.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    
    // Validate request body
    const validation = validateRequest(reportFiltersSchema, body);
    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error },
        { status: 400 }
      );
    }

    const { type, fiscal_year, start_date, end_date, format = 'pdf' } = validation.data;

    const fiscalYear = fiscal_year || getCurrentFiscalYear();

    let reportData:  any[];
    let columns: any[];
    let title: string;

    switch (type) {
      case 'monthly':  {
        const monthlyData = await sql`
          SELECT 
            TO_CHAR(expense_date, 'Mon YYYY') as month,
            TO_CHAR(expense_date, 'YYYY-MM') as month_sort,
            c.name as category,
            COUNT(*) as transactions,
            SUM(CASE WHEN status = 'approved' THEN amount ELSE 0 END) as approved_amount,
            SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END) as pending_amount
          FROM expenses e
          JOIN categories c ON c.id = e. category_id
          WHERE e. department_id = ${user.department_id}
            ${start_date ? sql`AND e.expense_date >= ${start_date}` : sql``}
            ${end_date ? sql`AND e.expense_date <= ${end_date}` : sql``}
          GROUP BY TO_CHAR(expense_date, 'Mon YYYY'), TO_CHAR(expense_date, 'YYYY-MM'), c.name
          ORDER BY month_sort DESC, c.name
        `;

        reportData = monthlyData.map((row) => ({
          month: row.month,
          category: row.category,
          transactions: Number(row.transactions),
          approved_amount: formatCurrency(Number(row.approved_amount)),
          pending_amount: formatCurrency(Number(row.pending_amount)),
        }));

        columns = [
          { key: 'month', header: 'Month', width: 100 },
          { key: 'category', header:  'Category', width: 120 },
          { key: 'transactions', header: 'Count', width: 60, align: 'right' as const },
          { key: 'approved_amount', header: 'Approved', width: 100, align: 'right' as const },
          { key: 'pending_amount', header: 'Pending', width: 100, align: 'right' as const },
        ];

        title = `Monthly Expense Report - FY ${fiscalYear}`;
        break;
      }

      case 'category': {
        const categoryData = await sql`
          SELECT 
            c.name as category,
            COALESCE(bp.proposed_amount, 0) as proposed,
            COALESCE(ba.allotted_amount, 0) as allotted,
            COALESCE(SUM(CASE WHEN e.status = 'approved' THEN e.amount ELSE 0 END), 0) as spent,
            COALESCE(SUM(CASE WHEN e. status = 'pending' THEN e.amount ELSE 0 END), 0) as pending
          FROM categories c
          LEFT JOIN budget_plans bp ON bp.category_id = c.id 
            AND bp.fiscal_year = ${fiscalYear} AND bp.department_id = ${user.department_id}
          LEFT JOIN budget_allotments ba ON ba.category_id = c.id 
            AND ba.fiscal_year = ${fiscalYear} AND ba.department_id = ${user.department_id}
          LEFT JOIN expenses e ON e.category_id = c.id AND e.department_id = ${user.department_id}
          WHERE c.is_active = true
          GROUP BY c.id, c.name, bp.proposed_amount, ba.allotted_amount
          ORDER BY c.name
        `;

        reportData = categoryData.map((row) => {
          const allotted = Number(row.allotted);
          const spent = Number(row. spent);
          const utilization = allotted > 0 ? ((spent / allotted) * 100).toFixed(1) + '%' : '0%';
          return {
            category: row.category,
            proposed: formatCurrency(Number(row.proposed)),
            allotted: formatCurrency(allotted),
            spent: formatCurrency(spent),
            pending: formatCurrency(Number(row.pending)),
            remaining: formatCurrency(allotted - spent),
            utilization,
          };
        });

        columns = [
          { key:  'category', header: 'Category', width: 100 },
          { key: 'proposed', header: 'Proposed', width: 80, align: 'right' as const },
          { key: 'allotted', header: 'Allotted', width: 80, align: 'right' as const },
          { key:  'spent', header: 'Spent', width: 80, align: 'right' as const },
          { key: 'remaining', header: 'Remaining', width: 80, align: 'right' as const },
          { key: 'utilization', header: 'Util %', width: 60, align: 'right' as const },
        ];

        title = `Category-wise Budget Report - FY ${fiscalYear}`;
        break;
      }

      case 'budget':  {
        const budgetData = await sql`
          SELECT 
            c.name as category,
            COALESCE(bp.proposed_amount, 0) as proposed,
            COALESCE(ba.allotted_amount, 0) as allotted,
            COALESCE(ba.allotted_amount, 0) - COALESCE(bp. proposed_amount, 0) as variance
          FROM categories c
          LEFT JOIN budget_plans bp ON bp.category_id = c.id 
            AND bp.fiscal_year = ${fiscalYear} AND bp. department_id = ${user.department_id}
          LEFT JOIN budget_allotments ba ON ba. category_id = c.id 
            AND ba.fiscal_year = ${fiscalYear} AND ba.department_id = ${user. department_id}
          WHERE c.is_active = true
          ORDER BY c.name
        `;

        reportData = budgetData.map((row) => {
          const variance = Number(row.variance);
          return {
            category: row.category,
            proposed: formatCurrency(Number(row.proposed)),
            allotted: formatCurrency(Number(row.allotted)),
            variance: (variance >= 0 ? '+' : '') + formatCurrency(variance),
            status: variance >= 0 ? 'Surplus' : 'Deficit',
          };
        });

        columns = [
          { key: 'category', header: 'Category', width: 120 },
          { key: 'proposed', header: 'Proposed', width: 100, align: 'right' as const },
          { key: 'allotted', header: 'Allotted', width:  100, align: 'right' as const },
          { key: 'variance', header: 'Variance', width: 100, align: 'right' as const },
          { key: 'status', header: 'Status', width: 80 },
        ];

        title = `Budget Variance Report - FY ${fiscalYear}`;
        break;
      }

      case 'vendor': {
        const vendorData = await sql`
          SELECT 
            e.vendor,
            COUNT(*) as transaction_count,
            SUM(CASE WHEN e.status = 'approved' THEN e.amount ELSE 0 END) as total_approved,
            SUM(CASE WHEN e.status = 'pending' THEN e. amount ELSE 0 END) as total_pending,
            SUM(e.amount) as total_amount
          FROM expenses e
          WHERE e.department_id = ${user.department_id}
            ${start_date ? sql`AND e.expense_date >= ${start_date}` : sql``}
            ${end_date ? sql`AND e.expense_date <= ${end_date}` : sql``}
          GROUP BY e.vendor
          ORDER BY total_amount DESC
        `;

        reportData = vendorData.map((row) => ({
          vendor:  row.vendor,
          transactions: Number(row.transaction_count),
          approved: formatCurrency(Number(row.total_approved)),
          pending: formatCurrency(Number(row.total_pending)),
          total: formatCurrency(Number(row.total_amount)),
        }));

        columns = [
          { key: 'vendor', header: 'Vendor/Payee', width: 150 },
          { key: 'transactions', header: 'Count', width: 60, align: 'right' as const },
          { key: 'approved', header:  'Approved', width: 100, align: 'right' as const },
          { key: 'pending', header: 'Pending', width: 100, align: 'right' as const },
          { key: 'total', header: 'Total', width: 100, align: 'right' as const },
        ];

        title = `Vendor-wise Expense Report - FY ${fiscalYear}`;
        break;
      }

      case 'audit': {
        const auditData = await sql`
          SELECT 
            al.created_at,
            u.name as user_name,
            al.action,
            al.entity_type,
            al.entity_id,
            al.ip_address
          FROM audit_logs al
          LEFT JOIN users u ON u.id = al.user_id
          WHERE 1=1
            ${start_date ? sql`AND al.created_at >= ${start_date}` : sql``}
            ${end_date ? sql`AND al.created_at <= ${end_date}` : sql``}
          ORDER BY al.created_at DESC
          LIMIT 500
        `;

        reportData = auditData.map((row) => ({
          timestamp: formatDate(row.created_at, 'dd MMM yyyy HH:mm'),
          user: row.user_name || 'System',
          action: row.action,
          entity_type: row. entity_type,
          entity_id: row.entity_id || '-',
          ip_address: row.ip_address || '-',
        }));

        columns = [
          { key:  'timestamp', header: 'Timestamp', width: 110 },
          { key: 'user', header: 'User', width: 100 },
          { key: 'action', header: 'Action', width:  100 },
          { key: 'entity_type', header: 'Entity', width: 80 },
          { key: 'entity_id', header: 'ID', width: 50 },
          { key: 'ip_address', header: 'IP Address', width: 90 },
        ];

        title = `Audit Trail Report`;
        break;
      }

      case 'summary': 
      case 'expenses': {
        const expensesData = await sql`
          SELECT 
            e.expense_date,
            c.name as category,
            e.vendor,
            e.description,
            e.amount,
            e.status,
            u.name as created_by
          FROM expenses e
          JOIN categories c ON c.id = e. category_id
          LEFT JOIN users u ON u.id = e.created_by
          WHERE e.department_id = ${user.department_id}
            ${start_date ? sql`AND e.expense_date >= ${start_date}` : sql``}
            ${end_date ? sql`AND e.expense_date <= ${end_date}` : sql``}
          ORDER BY e.expense_date DESC
          LIMIT 1000
        `;

        reportData = expensesData.map((row) => ({
          date: formatDate(row.expense_date, 'dd MMM yyyy'),
          category: row.category,
          vendor: row.vendor,
          description: row.description || '-',
          amount: formatCurrency(Number(row.amount)),
          status: row.status,
          created_by: row.created_by || '-',
        }));

        columns = [
          { key:  'date', header: 'Date', width: 80 },
          { key: 'category', header: 'Category', width: 90 },
          { key: 'vendor', header: 'Vendor', width: 100 },
          { key: 'description', header: 'Description', width: 120 },
          { key: 'amount', header: 'Amount', width: 80, align: 'right' as const },
          { key: 'status', header: 'Status', width: 70 },
        ];

        title = type === 'summary' ? `Budget Summary Report - FY ${fiscalYear}` : `Expenses Report - FY ${fiscalYear}`;
        break;
      }

      default: 
        return NextResponse.json(
          { success: false, error: 'Invalid report type' },
          { status: 400 }
        );
    }

    if (reportData.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No data available for the selected criteria' },
        { status: 404 }
      );
    }

    // Audit log
    await createAuditLog({
      userId: user.id,
      action: 'GENERATE_REPORT',
      entityType: 'report',
      newValues: { type, format, fiscal_year:  fiscalYear },
    });

    // Generate report
    if (format === 'csv') {
      const csvContent = await generateCSVReport(columns, reportData);

      return new NextResponse(csvContent, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
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

      return new NextResponse(Buffer.from(pdfBuffer), {
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="${type}-report-${fiscalYear}.pdf"`,
        },
      });
    }
  } catch (error) {
    console.error('Report download error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error details:', errorMessage);
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to generate report.  Please try again or contact support.',
        details: process.env.NODE_ENV === 'development' ?  errorMessage : undefined
      },
      { status: 500 }
    );
  }
}