import PDFDocument from 'pdfkit';
import { Readable } from 'stream';

export async function generateReportPdf(title: string, rows: Array<Record<string, any>>) {
  const doc = new PDFDocument({ size: 'A4', margin: 50 });
  const stream = doc as unknown as Readable;

  doc.fontSize(18).text(title, { underline: true });
  doc.moveDown();

  rows.forEach((row, i) => {
    doc.fontSize(12).text(`${i + 1}. ${JSON.stringify(row)}`);
  });

  doc.end();

  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}