import { NextRequest, NextResponse } from 'next/server';
import { sql } from '../../../../lib/db';
import { generateReportPdf } from '../../../../lib/pdf';

export async function POST(req: NextRequest) {
  const { type } = await req.json();

  let rows: any[] = [];
  if (type === 'monthly') {
    rows = await sql`select date_trunc('month', expense_date) as month, sum(amount) as total from expenses group by 1`;
  } else if (type === 'category') {
    rows = await sql`select c.name as category, sum(amount) as total from expenses e join categories c on c.id=e.category_id group by c.name`;
  } else {
    rows = await sql`select * from expenses limit 100`;
  }

  const pdf = await generateReportPdf(`Report: ${type}`, rows);
  return new NextResponse(pdf, {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${type}-report.pdf"`
    }
  });
}