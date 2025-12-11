import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';

const {
  CLOUDINARY_CLOUD_NAME,
  CLOUDINARY_API_KEY,
  CLOUDINARY_API_SECRET,
} = process.env;

if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || ! CLOUDINARY_API_SECRET) {
  console.warn('Cloudinary environment variables are not fully configured');
}

cloudinary.config({
  cloud_name:  CLOUDINARY_CLOUD_NAME,
  api_key:  CLOUDINARY_API_KEY,
  api_secret:  CLOUDINARY_API_SECRET,
  secure: true,
});

export interface UploadResult {
  success: boolean;
  publicId?:  string;
  url?: string;
  error?: string;
}

// Allowed file types
const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'application/pdf'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export async function uploadReceipt(
  buffer: Buffer,
  filename: string,
  mimeType: string
): Promise<UploadResult> {
  try {
    // Validate file type
    if (!ALLOWED_TYPES.includes(mimeType)) {
      return {
        success: false,
        error:  'Invalid file type. Allowed:  PNG, JPEG, PDF',
      };
    }

    // Validate file size
    if (buffer.length > MAX_FILE_SIZE) {
      return {
        success: false,
        error: 'File size exceeds 10MB limit',
      };
    }

    // Generate unique filename
    const timestamp = Date.now();
    const sanitizedName = filename
      .replace(/[^a-zA-Z0-9.-]/g, '_')
      .toLowerCase();
    const publicId = `receipts/${timestamp}_${sanitizedName}`;

    // Upload to Cloudinary
    const result = await new Promise<UploadApiResponse>((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          resource_type: 'auto',
          folder: 'dept-budget',
          public_id: publicId,
          overwrite: false,
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result! );
        }
      );
      uploadStream.end(buffer);
    });

    return {
      success: true,
      publicId:  result.public_id,
      url: result.secure_url,
    };
  } catch (error) {
    console.error('Cloudinary upload error:', error);
    return {
      success:  false,
      error: 'Failed to upload file.  Please try again.',
    };
  }
}

export async function deleteReceipt(publicId: string): Promise<boolean> {
  try {
    await cloudinary.uploader.destroy(publicId);
    return true;
  } catch (error) {
    console.error('Cloudinary delete error:', error);
    return false;
  }
}

export { cloudinary };