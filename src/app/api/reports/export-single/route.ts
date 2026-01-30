import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getCurrentUser, canPerformAction } from '@/lib/auth';
import { formatDate } from '@/lib/utils';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import ExcelJS from 'exceljs';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

const COLLEGE_NAME = "JSPM's Rajarshi Shahu College of Engineering";
const BRAND_NAVY = rgb(0.12, 0.23, 0.37);
const BRAND_GOLD = rgb(0.79, 0.64, 0.15);

function formatCurrencyPDF(amount: number): string {
    const formatted = new Intl.NumberFormat('en-IN', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(amount);
    return `Rs. ${formatted}`;
}

function truncate(str: string | null | undefined, len: number): string {
    if (!str) return '-';
    return str.length > len ? str.substring(0, len - 2) + '..' : str;
}

async function loadLogo(): Promise<Uint8Array | null> {
    try {
        const logoPath = path.join(process.cwd(), 'public', 'logo.jpg');
        if (fs.existsSync(logoPath)) {
            return fs.readFileSync(logoPath);
        }
    } catch (e) {
        console.log('Logo not loaded:', e);
    }
    return null;
}

export async function POST(request: NextRequest) {
    try {
        const user = await getCurrentUser();

        if (!user) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        if (!canPerformAction(user.role, 'download_reports')) {
            return NextResponse.json({ success: false, error: 'Permission denied' }, { status: 403 });
        }

        const body = await request.json();
        const { type, id, format = 'pdf' } = body;

        if (!type || !id) {
            return NextResponse.json({ success: false, error: 'Type and ID are required' }, { status: 400 });
        }

        // Fetch department name
        const deptResult = await sql`SELECT name FROM departments WHERE id = ${user.department_id}`;
        const departmentName = deptResult.length > 0 ? deptResult[0].name : 'Department';

        let itemData: any = null;
        let breakdowns: any[] = [];
        let title = '';
        let dateStr = '';
        let totalAmount = 0;

        if (type === 'budget') {
            const budgetResult = await sql`
                SELECT b.*, c.name as category_name, u.name as created_by_name
                FROM budgets b
                LEFT JOIN categories c ON c.id = b.category_id
                LEFT JOIN users u ON u.id = b.created_by
                WHERE b.id = ${id} AND b.department_id = ${user.department_id}
            `;

            if (budgetResult.length === 0) {
                return NextResponse.json({ success: false, error: 'Budget not found' }, { status: 404 });
            }

            itemData = budgetResult[0];

            const breakdownResult = await sql`
                SELECT * FROM budget_breakdowns WHERE budget_id = ${id} ORDER BY id
            `;
            breakdowns = breakdownResult;

            title = 'Budget Report';
            dateStr = formatDate(itemData.budget_date, 'dd MMM yyyy');
            totalAmount = Number(itemData.amount);
        } else if (type === 'expense') {
            const expenseResult = await sql`
                SELECT e.*, c.name as category_name, b.name as budget_name, u.name as created_by_name
                FROM expenses_new e
                LEFT JOIN categories c ON c.id = e.category_id
                LEFT JOIN budgets b ON b.id = e.budget_id
                LEFT JOIN users u ON u.id = e.created_by
                WHERE e.id = ${id} AND e.department_id = ${user.department_id}
            `;

            if (expenseResult.length === 0) {
                return NextResponse.json({ success: false, error: 'Expense not found' }, { status: 404 });
            }

            itemData = expenseResult[0];

            const breakdownResult = await sql`
                SELECT * FROM expense_breakdowns WHERE expense_id = ${id} ORDER BY id
            `;
            breakdowns = breakdownResult;

            title = 'Expense Report';
            dateStr = formatDate(itemData.expense_date, 'dd MMM yyyy');
            totalAmount = Number(itemData.amount);
        } else {
            return NextResponse.json({ success: false, error: 'Invalid type' }, { status: 400 });
        }

        // Generate Excel
        if (format === 'excel') {
            const workbook = new ExcelJS.Workbook();
            const sheet = workbook.addWorksheet(title);

            // Header
            sheet.mergeCells('A1:D1');
            const titleCell = sheet.getCell('A1');
            titleCell.value = COLLEGE_NAME;
            titleCell.font = { bold: true, size: 14, color: { argb: 'FF1E3A5F' } };
            titleCell.alignment = { horizontal: 'center' };

            sheet.mergeCells('A2:D2');
            const deptCell = sheet.getCell('A2');
            deptCell.value = `Department: ${departmentName}`;
            deptCell.alignment = { horizontal: 'center' };

            sheet.mergeCells('A3:D3');
            const reportCell = sheet.getCell('A3');
            reportCell.value = title;
            reportCell.font = { bold: true, size: 12 };
            reportCell.alignment = { horizontal: 'center' };

            // Item details
            let row = 5;
            sheet.getCell(`A${row}`).value = 'Name:';
            sheet.getCell(`A${row}`).font = { bold: true };
            sheet.getCell(`B${row}`).value = itemData.name;
            row++;

            sheet.getCell(`A${row}`).value = 'Date:';
            sheet.getCell(`A${row}`).font = { bold: true };
            sheet.getCell(`B${row}`).value = dateStr;
            row++;

            sheet.getCell(`A${row}`).value = 'Amount:';
            sheet.getCell(`A${row}`).font = { bold: true };
            sheet.getCell(`B${row}`).value = totalAmount;
            sheet.getCell(`B${row}`).numFmt = '₹#,##0';
            row++;

            sheet.getCell(`A${row}`).value = 'Category:';
            sheet.getCell(`A${row}`).font = { bold: true };
            sheet.getCell(`B${row}`).value = itemData.category_name || 'N/A';
            row++;

            sheet.getCell(`A${row}`).value = 'Status:';
            sheet.getCell(`A${row}`).font = { bold: true };
            sheet.getCell(`B${row}`).value = itemData.status;
            row++;

            if (type === 'budget') {
                sheet.getCell(`A${row}`).value = 'Source:';
                sheet.getCell(`A${row}`).font = { bold: true };
                sheet.getCell(`B${row}`).value = itemData.source || 'N/A';
                row++;
            } else {
                sheet.getCell(`A${row}`).value = 'Spender:';
                sheet.getCell(`A${row}`).font = { bold: true };
                sheet.getCell(`B${row}`).value = itemData.spender || 'N/A';
                row++;
                sheet.getCell(`A${row}`).value = 'Against Budget:';
                sheet.getCell(`A${row}`).font = { bold: true };
                sheet.getCell(`B${row}`).value = itemData.budget_name || 'N/A';
                row++;
            }

            // Breakdown table
            if (breakdowns.length > 0) {
                row += 2;
                sheet.getCell(`A${row}`).value = 'Breakdown';
                sheet.getCell(`A${row}`).font = { bold: true, size: 11 };
                row++;

                const headerRow = sheet.getRow(row);
                headerRow.values = ['Item', 'Amount', 'Payment Method'];
                headerRow.font = { bold: true };
                headerRow.eachCell((cell) => {
                    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A5F' } };
                    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
                });
                row++;

                let breakdownTotal = 0;
                breakdowns.forEach((bd) => {
                    const r = sheet.getRow(row);
                    r.values = [bd.name || 'N/A', Number(bd.amount || 0), bd.payment_method || 'cash'];
                    r.getCell(2).numFmt = '₹#,##0';
                    breakdownTotal += Number(bd.amount || 0);
                    row++;
                });

                const totalRow = sheet.getRow(row);
                totalRow.values = ['Total', breakdownTotal, ''];
                totalRow.font = { bold: true };
                totalRow.getCell(2).numFmt = '₹#,##0';
            }

            sheet.columns.forEach((col) => { col.width = 20; });

            const buffer = await workbook.xlsx.writeBuffer();
            const filename = `${type}-${itemData.name.replace(/[^a-zA-Z0-9]/g, '-')}-${id}.xlsx`;

            return new NextResponse(new Uint8Array(buffer as ArrayBuffer), {
                status: 200,
                headers: {
                    'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                    'Content-Disposition': `attachment; filename="${filename}"`,
                },
            });
        }

        // Generate PDF using pdf-lib
        const pdfDoc = await PDFDocument.create();
        const page = pdfDoc.addPage([595, 842]); // A4
        const { width, height } = page.getSize();

        const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
        const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

        let y = height - 50;

        // Load and embed logo
        const logoBytes = await loadLogo();
        if (logoBytes) {
            try {
                const logoImage = await pdfDoc.embedJpg(logoBytes);
                const logoDims = logoImage.scale(0.15);
                page.drawImage(logoImage, {
                    x: 50,
                    y: y - logoDims.height + 10,
                    width: logoDims.width,
                    height: logoDims.height,
                });
            } catch (e) {
                console.log('Could not embed logo:', e);
            }
        }

        // Centered Letterhead
        const collegeWidth = fontBold.widthOfTextAtSize(COLLEGE_NAME, 14);
        page.drawText(COLLEGE_NAME, {
            x: (width - collegeWidth) / 2,
            y: y,
            size: 14,
            font: fontBold,
            color: BRAND_NAVY,
        });

        y -= 18;
        const deptText = `Department: ${departmentName}`;
        const deptWidth = fontRegular.widthOfTextAtSize(deptText, 11);
        page.drawText(deptText, {
            x: (width - deptWidth) / 2,
            y: y,
            size: 11,
            font: fontRegular,
            color: rgb(0.3, 0.3, 0.3),
        });

        // Decorative lines
        y -= 15;
        page.drawLine({ start: { x: 50, y }, end: { x: width - 50, y }, thickness: 2, color: BRAND_NAVY });
        page.drawLine({ start: { x: 50, y: y - 3 }, end: { x: width - 50, y: y - 3 }, thickness: 0.5, color: BRAND_GOLD });

        // Report Title
        y -= 35;
        const titleText = title.toUpperCase();
        const titleWidth = fontBold.widthOfTextAtSize(titleText, 14);
        page.drawText(titleText, {
            x: (width - titleWidth) / 2,
            y: y,
            size: 14,
            font: fontBold,
            color: BRAND_NAVY,
        });

        y -= 20;
        const dateText = `Date: ${dateStr}`;
        const dateWidth = fontRegular.widthOfTextAtSize(dateText, 10);
        page.drawText(dateText, {
            x: (width - dateWidth) / 2,
            y: y,
            size: 10,
            font: fontRegular,
        });

        // Details section
        y -= 40;
        const detailX = 60;
        const valueX = 200;

        const drawDetail = (label: string, value: string) => {
            page.drawText(label, { x: detailX, y, size: 10, font: fontBold, color: rgb(0.3, 0.3, 0.3) });
            page.drawText(value, { x: valueX, y, size: 10, font: fontRegular, color: rgb(0.1, 0.1, 0.1) });
            y -= 18;
        };

        drawDetail('Name:', truncate(itemData.name, 50));
        drawDetail('Amount:', formatCurrencyPDF(totalAmount));
        drawDetail('Category:', itemData.category_name || 'N/A');
        drawDetail('Payment Method:', itemData.payment_method || 'N/A');
        drawDetail('Status:', itemData.status);

        if (type === 'budget') {
            drawDetail('Source:', itemData.source || 'N/A');
        } else {
            drawDetail('Spender:', itemData.spender || 'N/A');
            drawDetail('Against Budget:', itemData.budget_name || 'N/A');
        }

        if (itemData.description) {
            drawDetail('Description:', truncate(itemData.description, 60));
        }

        drawDetail('Created By:', itemData.created_by_name || 'N/A');

        // Breakdown table
        if (breakdowns.length > 0) {
            y -= 20;
            page.drawText('BREAKDOWN', { x: detailX, y, size: 11, font: fontBold, color: BRAND_NAVY });
            y -= 25;

            const tableX = 60;
            const colWidths = [250, 100, 100];
            const headers = ['Item', 'Amount', 'Payment'];
            const rowHeight = 20;

            // Header row
            let x = tableX;
            page.drawRectangle({ x: tableX, y: y - rowHeight, width: colWidths.reduce((a, b) => a + b, 0), height: rowHeight, color: BRAND_NAVY });
            for (let i = 0; i < headers.length; i++) {
                page.drawText(headers[i], { x: x + 4, y: y - 14, size: 9, font: fontBold, color: rgb(1, 1, 1) });
                x += colWidths[i];
            }
            y -= rowHeight;

            // Data rows
            let breakdownTotal = 0;
            breakdowns.forEach((bd, index) => {
                const isAlt = index % 2 === 1;
                if (isAlt) {
                    page.drawRectangle({ x: tableX, y: y - rowHeight, width: colWidths.reduce((a, b) => a + b, 0), height: rowHeight, color: rgb(0.96, 0.97, 0.98) });
                }

                x = tableX;
                for (const w of colWidths) {
                    page.drawRectangle({ x, y: y - rowHeight, width: w, height: rowHeight, borderColor: rgb(0.8, 0.8, 0.8), borderWidth: 0.5 });
                    x += w;
                }

                const values = [
                    truncate(bd.name, 40),
                    formatCurrencyPDF(Number(bd.amount || 0)),
                    bd.payment_method || 'cash',
                ];

                x = tableX;
                for (let i = 0; i < values.length; i++) {
                    page.drawText(values[i], { x: x + 4, y: y - 14, size: 8, font: fontRegular, color: rgb(0.2, 0.2, 0.2) });
                    x += colWidths[i];
                }

                breakdownTotal += Number(bd.amount || 0);
                y -= rowHeight;
            });

            // Total row
            y -= 5;
            page.drawLine({ start: { x: tableX, y }, end: { x: tableX + colWidths.reduce((a, b) => a + b, 0), y }, thickness: 1, color: BRAND_NAVY });
            y -= 15;
            page.drawText('TOTAL:', { x: 280, y, size: 10, font: fontBold, color: BRAND_NAVY });
            page.drawText(formatCurrencyPDF(breakdownTotal), { x: 320, y, size: 10, font: fontBold, color: BRAND_NAVY });
        }

        // Grand Total Box
        y -= 40;
        page.drawRectangle({ x: 60, y: y - 30, width: 475, height: 30, color: BRAND_NAVY });
        page.drawText(`Total ${type === 'budget' ? 'Budget' : 'Expense'}: ${formatCurrencyPDF(totalAmount)}`, {
            x: 70, y: y - 20, size: 12, font: fontBold, color: rgb(1, 1, 1)
        });

        // Signature section
        y = 120;
        page.drawLine({ start: { x: 50, y: y + 30 }, end: { x: width - 50, y: y + 30 }, thickness: 0.5, color: rgb(0.7, 0.7, 0.7) });

        page.drawText('Prepared By:', { x: 50, y, size: 9, font: fontRegular });
        page.drawLine({ start: { x: 50, y: y - 35 }, end: { x: 180, y: y - 35 }, thickness: 0.5, color: rgb(0, 0, 0) });
        page.drawText(user.name, { x: 50, y: y - 48, size: 9, font: fontBold });

        page.drawText('Approved By:', { x: 380, y, size: 9, font: fontRegular });
        page.drawLine({ start: { x: 380, y: y - 35 }, end: { x: 545, y: y - 35 }, thickness: 0.5, color: rgb(0, 0, 0) });
        page.drawText('Signature & Date', { x: 420, y: y - 48, size: 8, font: fontRegular, color: rgb(0.5, 0.5, 0.5) });
        page.drawText('Head of Department', { x: 410, y: y - 60, size: 8, font: fontBold, color: rgb(0.3, 0.3, 0.3) });

        // Footer
        page.drawText(`Generated: ${formatDate(new Date(), 'dd MMM yyyy HH:mm')} by ${user.name}`, {
            x: 200, y: 40, size: 8, font: fontRegular, color: rgb(0.5, 0.5, 0.5)
        });

        const pdfBytes = await pdfDoc.save();
        const filename = `${type}-${itemData.name.replace(/[^a-zA-Z0-9]/g, '-')}-${id}.pdf`;

        return new NextResponse(new Uint8Array(pdfBytes), {
            status: 200,
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': `attachment; filename="${filename}"`,
            },
        });
    } catch (error: any) {
        console.error('Single item export error:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to generate report: ' + (error.message || 'Unknown error') },
            { status: 500 }
        );
    }
}
