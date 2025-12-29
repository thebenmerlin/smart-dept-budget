import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

function isCloudinaryConfigured(): boolean {
    return Boolean(
        process.env.CLOUDINARY_CLOUD_NAME &&
        process.env.CLOUDINARY_API_KEY &&
        process.env.CLOUDINARY_API_SECRET
    );
}

export async function POST(request: NextRequest) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const contentType = request.headers.get('content-type') || '';

        if (!contentType.includes('multipart/form-data')) {
            return NextResponse.json(
                { success: false, error: 'Content-Type must be multipart/form-data' },
                { status: 400 }
            );
        }

        const formData = await request.formData();
        const file = (formData as unknown as globalThis.FormData).get('file') as File | null;

        if (!file) {
            return NextResponse.json({ success: false, error: 'No file provided' }, { status: 400 });
        }

        const fileName = file.name;
        const fileType = file.type;
        const fileSize = file.size;

        // Validate file type
        const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'application/pdf'];
        if (!allowedTypes.includes(fileType)) {
            return NextResponse.json(
                { success: false, error: 'Invalid file type. Allowed: PNG, JPEG, PDF' },
                { status: 400 }
            );
        }

        // Validate file size (10MB)
        if (fileSize > 10 * 1024 * 1024) {
            return NextResponse.json(
                { success: false, error: 'File size exceeds 10MB limit' },
                { status: 400 }
            );
        }

        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        let publicId: string;
        let fileUrl: string;

        if (isCloudinaryConfigured()) {
            try {
                const cloudinaryModule = await import('@/lib/cloudinary');
                const uploadResult = await cloudinaryModule.uploadReceipt(buffer, fileName, fileType);

                if (!uploadResult.success || !uploadResult.publicId || !uploadResult.url) {
                    throw new Error(uploadResult.error || 'Cloudinary upload failed');
                }

                publicId = uploadResult.publicId;
                fileUrl = uploadResult.url;
            } catch (cloudErr) {
                console.error('Cloudinary error:', cloudErr);
                return NextResponse.json(
                    { success: false, error: 'Upload to cloud storage failed. Please check Cloudinary configuration.' },
                    { status: 500 }
                );
            }
        } else {
            // Fallback to base64 if Cloudinary is not configured
            const base64Data = buffer.toString('base64');
            const safeName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
            publicId = 'local_' + Date.now() + '_' + safeName;
            fileUrl = 'data:' + fileType + ';base64,' + base64Data;
        }

        return NextResponse.json({
            success: true,
            data: {
                file_name: fileName,
                file_url: fileUrl,
                file_type: fileType,
                file_size: fileSize,
                public_id: publicId,
            },
            message: 'File uploaded successfully',
        });
    } catch (err) {
        console.error('Upload error:', err);
        const message = err instanceof Error ? err.message : 'Unknown error';
        return NextResponse.json(
            { success: false, error: 'Upload failed: ' + message },
            { status: 500 }
        );
    }
}
