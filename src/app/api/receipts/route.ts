import { NextRequest, NextResponse } from 'next/server';
import { cloudinary } from '../../../lib/cloudinary';
import { sql } from '../../../lib/db';
import { requireRole } from '../../../lib/rbac';
import { logAudit } from '../../../lib/audit';

export async function POST(req: NextRequest) {
  const roleCheck = await requireRole(req, ['admin', 'hod', 'staff']);
  if (roleCheck) return roleCheck;

  const form = await req.formData();
  const file = form.get('file');
  const expenseId = form.get('expense_id');

  if (!(file instanceof File) || !expenseId) {
    return NextResponse.json({ error: 'file and expense_id required' }, { status: 400 });
  }

  if (!['image/png', 'image/jpeg', 'application/pdf'].includes(file.type)) {
    return NextResponse.json({ error: 'Unsupported file type' }, { status: 400 });
  }

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const upload = await new Promise<any>((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { resource_type: 'auto', folder: 'dept-budget/receipts' },
      (error, result) => (error ? reject(error) : resolve(result))
    );
    stream.end(buffer);
  });

  await sql`
    insert into expense_receipts (expense_id, public_id, url, mime_type, size_bytes)
    values (${Number(expenseId)}, ${upload.public_id}, ${upload.secure_url}, ${file.type}, ${buffer.byteLength});
  `;

  await logAudit('upload', 'receipt', { expenseId, public_id: upload.public_id });
  return NextResponse.json({ url: upload.secure_url, public_id: upload.public_id });
}