import { v2 as cloudinary } from 'cloudinary';

const {
  CLOUDINARY_CLOUD_NAME,
  CLOUDINARY_API_KEY,
  CLOUDINARY_API_SECRET
} = process.env;

if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
  throw new Error('Cloudinary env vars are missing');
}

cloudinary.config({
  cloud_name: CLOUDINARY_CLOUD_NAME,
  api_key: CLOUDINARY_API_KEY,
  api_secret: CLOUDINARY_API_SECRET,
  secure: true
});

export async function uploadReceipt(buffer: Buffer, filename: string, mime: string) {
  const res = await cloudinary.uploader.upload_stream({
    resource_type: 'auto',
    folder: 'dept-budget/receipts',
    public_id: filename.replace(/\W+/g, '-').toLowerCase()
  });

  return res;
}

export { cloudinary };