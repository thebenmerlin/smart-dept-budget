// Professional PDF Report generation using pdf-lib
// Creates printable office-quality PDFs with letterhead, logo, tables, and signature spaces

import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { formatDate } from './utils';
import fs from 'fs';
import path from 'path';

interface ReportOptions {
    title: string;
    collegeName: string;
    departmentName: string;
    dateRange: string;
    generatedBy: string;
    generatedAt: string;
}

interface BudgetData {
    budget_date: string;
    name: string;
    category_name: string | null;
    amount: number;
    source: string | null;
    payment_method: string;
    status: string;
}

interface ExpenseData {
    expense_date: string;
    name: string;
    amount: number;
    budget_name: string | null;
    category_name: string | null;
    spender: string | null;
    payment_method: string;
    status: string;
}

// College brand colors
const BRAND_NAVY = rgb(0.12, 0.23, 0.37);
const BRAND_GOLD = rgb(0.79, 0.64, 0.15);

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

function truncate(str: string | null | undefined, len: number): string {
    if (!str) return '-';
    return str.length > len ? str.substring(0, len - 2) + '..' : str;
}

// PDF-safe currency format (uses Rs. instead of ₹ which can't be encoded)
function formatCurrencyPDF(amount: number): string {
    const formatted = new Intl.NumberFormat('en-IN', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(amount);
    return `Rs. ${formatted}`;
}

export async function generateBudgetReportPDF(
    data: BudgetData[],
    options: ReportOptions
): Promise<Buffer> {
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
    const collegeName = options.collegeName;
    const collegeWidth = fontBold.widthOfTextAtSize(collegeName, 14);
    page.drawText(collegeName, {
        x: (width - collegeWidth) / 2,
        y: y,
        size: 14,
        font: fontBold,
        color: BRAND_NAVY,
    });

    y -= 18;
    const deptText = options.departmentName;
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

    // Report Title (centered)
    y -= 35;
    const titleText = options.title.toUpperCase();
    const titleWidth = fontBold.widthOfTextAtSize(titleText, 14);
    page.drawText(titleText, {
        x: (width - titleWidth) / 2,
        y: y,
        size: 14,
        font: fontBold,
        color: BRAND_NAVY,
    });

    y -= 20;
    const periodText = `Period: ${options.dateRange}`;
    const periodWidth = fontRegular.widthOfTextAtSize(periodText, 10);
    page.drawText(periodText, {
        x: (width - periodWidth) / 2,
        y: y,
        size: 10,
        font: fontRegular,
    });

    // Table
    y -= 30;
    const tableX = 50;
    const colWidths = [65, 130, 85, 75, 70, 60];
    const headers = ['Date', 'Budget Name', 'Category', 'Amount', 'Source', 'Status'];
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
    let total = 0;
    const maxRows = Math.min(data.length, 22);
    for (let row = 0; row < maxRows; row++) {
        const item = data[row];
        const isAlt = row % 2 === 1;

        if (isAlt) {
            page.drawRectangle({ x: tableX, y: y - rowHeight, width: colWidths.reduce((a, b) => a + b, 0), height: rowHeight, color: rgb(0.96, 0.97, 0.98) });
        }

        // Draw cell borders
        x = tableX;
        for (const w of colWidths) {
            page.drawRectangle({ x, y: y - rowHeight, width: w, height: rowHeight, borderColor: rgb(0.8, 0.8, 0.8), borderWidth: 0.5 });
            x += w;
        }

        // Cell values
        const values = [
            formatDate(item.budget_date, 'dd MMM yy'),
            truncate(item.name, 22),
            truncate(item.category_name, 14),
            formatCurrencyPDF(Number(item.amount)),
            truncate(item.source, 11),
            truncate(item.status, 10),
        ];

        x = tableX;
        for (let i = 0; i < values.length; i++) {
            page.drawText(values[i], { x: x + 4, y: y - 14, size: 8, font: fontRegular, color: rgb(0.2, 0.2, 0.2) });
            x += colWidths[i];
        }

        total += Number(item.amount || 0);
        y -= rowHeight;
    }

    // Total row
    y -= 10;
    page.drawLine({ start: { x: tableX, y }, end: { x: tableX + colWidths.reduce((a, b) => a + b, 0), y }, thickness: 1, color: BRAND_NAVY });
    y -= 15;
    page.drawText('TOTAL:', { x: 350, y, size: 11, font: fontBold, color: BRAND_NAVY });
    page.drawText(formatCurrencyPDF(total), { x: 420, y, size: 11, font: fontBold, color: BRAND_NAVY });

    // Signature section
    y = 130;
    page.drawLine({ start: { x: 50, y: y + 30 }, end: { x: width - 50, y: y + 30 }, thickness: 0.5, color: rgb(0.7, 0.7, 0.7) });

    // Prepared By
    page.drawText('Prepared By:', { x: 50, y, size: 9, font: fontRegular });
    page.drawLine({ start: { x: 50, y: y - 35 }, end: { x: 180, y: y - 35 }, thickness: 0.5, color: rgb(0, 0, 0) });
    page.drawText(options.generatedBy, { x: 50, y: y - 48, size: 9, font: fontBold });
    page.drawText('Staff Member', { x: 50, y: y - 60, size: 8, font: fontRegular, color: rgb(0.4, 0.4, 0.4) });

    // Approved By HOD
    page.drawText('Approved By:', { x: 380, y, size: 9, font: fontRegular });
    page.drawLine({ start: { x: 380, y: y - 35 }, end: { x: 545, y: y - 35 }, thickness: 0.5, color: rgb(0, 0, 0) });
    page.drawText('Signature & Date', { x: 420, y: y - 48, size: 8, font: fontRegular, color: rgb(0.5, 0.5, 0.5) });
    page.drawText('Head of Department', { x: 410, y: y - 60, size: 8, font: fontBold, color: rgb(0.3, 0.3, 0.3) });

    // Footer
    page.drawText(`Total Records: ${data.length}`, { x: 50, y: 40, size: 8, font: fontRegular, color: rgb(0.5, 0.5, 0.5) });
    page.drawText(`Generated: ${options.generatedAt}`, { x: 250, y: 40, size: 8, font: fontRegular, color: rgb(0.5, 0.5, 0.5) });
    page.drawText('Page 1 of 1', { x: 500, y: 40, size: 8, font: fontRegular, color: rgb(0.5, 0.5, 0.5) });

    const pdfBytes = await pdfDoc.save();
    return Buffer.from(pdfBytes);
}

export async function generateExpenseReportPDF(
    data: ExpenseData[],
    options: ReportOptions
): Promise<Buffer> {
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
    const collegeName = options.collegeName;
    const collegeWidth = fontBold.widthOfTextAtSize(collegeName, 14);
    page.drawText(collegeName, {
        x: (width - collegeWidth) / 2,
        y: y,
        size: 14,
        font: fontBold,
        color: BRAND_NAVY,
    });

    y -= 18;
    const deptText = options.departmentName;
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

    // Report Title (centered)
    y -= 35;
    const titleText = options.title.toUpperCase();
    const titleWidth = fontBold.widthOfTextAtSize(titleText, 14);
    page.drawText(titleText, {
        x: (width - titleWidth) / 2,
        y: y,
        size: 14,
        font: fontBold,
        color: BRAND_NAVY,
    });

    y -= 20;
    const periodText = `Period: ${options.dateRange}`;
    const periodWidth = fontRegular.widthOfTextAtSize(periodText, 10);
    page.drawText(periodText, {
        x: (width - periodWidth) / 2,
        y: y,
        size: 10,
        font: fontRegular,
    });

    // Table
    y -= 30;
    const tableX = 50;
    const colWidths = [60, 100, 70, 95, 75, 55];
    const headers = ['Date', 'Expense', 'Amount', 'Against Budget', 'Category', 'Status'];
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
    let total = 0;
    const maxRows = Math.min(data.length, 22);
    for (let row = 0; row < maxRows; row++) {
        const item = data[row];
        const isAlt = row % 2 === 1;

        if (isAlt) {
            page.drawRectangle({ x: tableX, y: y - rowHeight, width: colWidths.reduce((a, b) => a + b, 0), height: rowHeight, color: rgb(0.96, 0.97, 0.98) });
        }

        x = tableX;
        for (const w of colWidths) {
            page.drawRectangle({ x, y: y - rowHeight, width: w, height: rowHeight, borderColor: rgb(0.8, 0.8, 0.8), borderWidth: 0.5 });
            x += w;
        }

        const values = [
            formatDate(item.expense_date, 'dd MMM yy'),
            truncate(item.name, 16),
            formatCurrencyPDF(Number(item.amount)),
            truncate(item.budget_name, 15),
            truncate(item.category_name, 12),
            truncate(item.status, 8),
        ];

        x = tableX;
        for (let i = 0; i < values.length; i++) {
            page.drawText(values[i], { x: x + 4, y: y - 14, size: 8, font: fontRegular, color: rgb(0.2, 0.2, 0.2) });
            x += colWidths[i];
        }

        total += Number(item.amount || 0);
        y -= rowHeight;
    }

    // Total row
    y -= 10;
    page.drawLine({ start: { x: tableX, y }, end: { x: tableX + colWidths.reduce((a, b) => a + b, 0), y }, thickness: 1, color: BRAND_NAVY });
    y -= 15;
    page.drawText('TOTAL:', { x: 300, y, size: 11, font: fontBold, color: BRAND_NAVY });
    page.drawText(formatCurrencyPDF(total), { x: 370, y, size: 11, font: fontBold, color: BRAND_NAVY });

    // Signature section
    y = 130;
    page.drawLine({ start: { x: 50, y: y + 30 }, end: { x: width - 50, y: y + 30 }, thickness: 0.5, color: rgb(0.7, 0.7, 0.7) });

    // Prepared By
    page.drawText('Prepared By:', { x: 50, y, size: 9, font: fontRegular });
    page.drawLine({ start: { x: 50, y: y - 35 }, end: { x: 180, y: y - 35 }, thickness: 0.5, color: rgb(0, 0, 0) });
    page.drawText(options.generatedBy, { x: 50, y: y - 48, size: 9, font: fontBold });
    page.drawText('Staff Member', { x: 50, y: y - 60, size: 8, font: fontRegular, color: rgb(0.4, 0.4, 0.4) });

    // Approved By HOD
    page.drawText('Approved By:', { x: 380, y, size: 9, font: fontRegular });
    page.drawLine({ start: { x: 380, y: y - 35 }, end: { x: 545, y: y - 35 }, thickness: 0.5, color: rgb(0, 0, 0) });
    page.drawText('Signature & Date', { x: 420, y: y - 48, size: 8, font: fontRegular, color: rgb(0.5, 0.5, 0.5) });
    page.drawText('Head of Department', { x: 410, y: y - 60, size: 8, font: fontBold, color: rgb(0.3, 0.3, 0.3) });

    // Footer
    page.drawText(`Total Records: ${data.length}`, { x: 50, y: 40, size: 8, font: fontRegular, color: rgb(0.5, 0.5, 0.5) });
    page.drawText(`Generated: ${options.generatedAt}`, { x: 250, y: 40, size: 8, font: fontRegular, color: rgb(0.5, 0.5, 0.5) });
    page.drawText('Page 1 of 1', { x: 500, y: 40, size: 8, font: fontRegular, color: rgb(0.5, 0.5, 0.5) });

    const pdfBytes = await pdfDoc.save();
    return Buffer.from(pdfBytes);
}
