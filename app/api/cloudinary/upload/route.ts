import { NextResponse } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';
import { isRequestAuthorizedAsProductAdmin } from '@/lib/firebaseAdmin';

const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || 'z9lp2z8s';
const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || 'healthy_paws_media';
const apiKey = process.env.CLOUDINARY_API_KEY || '354168273514474';
const apiSecret = process.env.CLOUDINARY_API_SECRET || '';

// Configure Cloudinary SDK globally for server-side API operations
cloudinary.config({
  cloud_name: cloudName,
  api_key: apiKey,
  api_secret: apiSecret,
  secure: true,
});

export async function POST(request: Request) {
  const requestId = `req_upload_${Date.now()}_${Math.random().toString(36).slice(-4)}`;

  try {
    // 1. Server-side Authorization Verification
    const authCheck = await isRequestAuthorizedAsProductAdmin(request);
    if (!authCheck.authorized) {
      return NextResponse.json(
        { success: false, error: authCheck.error || 'Product management authorization required.' },
        { status: authCheck.status || 403 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No image file provided in request.' },
        { status: 400 }
      );
    }

    // 2. Validate File Type and Size (Supports Images and Videos)
    const isImage = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/');

    if (!isImage && !isVideo) {
      return NextResponse.json(
        { success: false, error: 'Invalid file format. Only image or video files are allowed.' },
        { status: 400 }
      );
    }

    const maxSize = 20 * 1024 * 1024; // 20MB limit
    if (file.size > maxSize) {
      return NextResponse.json(
        { success: false, error: 'File size exceeds 20MB limit.' },
        { status: 400 }
      );
    }

    // 3. Ensure API Secret is configured before calling Cloudinary SDK
    if (!apiSecret || apiSecret === 'YOUR_MATCHING_API_SECRET') {
      console.error(`[Cloudinary Config Error][${requestId}] CLOUDINARY_API_SECRET is missing or set to placeholder.`);
      return NextResponse.json(
        {
          success: false,
          error: 'CLOUDINARY_API_SECRET is missing in .env.local. Please copy the API Secret from Cloudinary Console (next to API Key 354168273514474) and paste it into .env.local as CLOUDINARY_API_SECRET=your_secret.',
        },
        { status: 500 }
      );
    }

    // 4. Convert File into Buffer for SDK upload_stream
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 5. Upload Asset using Official Cloudinary Node.js SDK
    const uploadResult: any = await new Promise((resolve) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: 'healthy-paws/products',
          upload_preset: uploadPreset,
          resource_type: isVideo ? 'video' : 'image',
        },
        (error, result) => {
          if (error) resolve({ error });
          else resolve(result);
        }
      );
      uploadStream.end(buffer);
    });

    if (uploadResult.error) {
      console.error(`[Cloudinary SDK Upload Failure][${requestId}]`, uploadResult.error);
      return NextResponse.json(
        { success: false, error: uploadResult.error.message || 'Cloudinary SDK upload failed.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      url: uploadResult.secure_url,
      public_id: uploadResult.public_id,
      width: uploadResult.width,
      height: uploadResult.height,
      format: uploadResult.format,
      resource_type: uploadResult.resource_type,
      requestId,
    });
  } catch (error: any) {
    console.error(`[Cloudinary Route Fatal Exception][${requestId}]`, error);
    return NextResponse.json(
      { success: false, error: error.message || 'Server error during Cloudinary asset upload.' },
      { status: 500 }
    );
  }
}
