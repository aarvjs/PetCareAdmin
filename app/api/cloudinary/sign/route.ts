import { NextResponse } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';
import { isRequestAuthorizedAsProductAdmin } from '@/lib/firebaseAdmin';

const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || 'z9lp2z8s';
const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || 'healthy_paws_media';
const apiKey = process.env.CLOUDINARY_API_KEY || '354168273514474';
const apiSecret = process.env.CLOUDINARY_API_SECRET || '';

cloudinary.config({
  cloud_name: cloudName,
  api_key: apiKey,
  api_secret: apiSecret,
  secure: true,
});

export async function POST(request: Request) {
  try {
    const authCheck = await isRequestAuthorizedAsProductAdmin(request);
    if (!authCheck.authorized) {
      return NextResponse.json(
        { success: false, error: authCheck.error || 'Product creation permission required.' },
        { status: authCheck.status || 403 }
      );
    }

    if (!apiSecret || apiSecret === 'YOUR_MATCHING_API_SECRET') {
      return NextResponse.json(
        { success: false, error: 'CLOUDINARY_API_SECRET is missing or set to placeholder.' },
        { status: 500 }
      );
    }

    const timestamp = Math.floor(Date.now() / 1000);
    const folder = 'healthy-paws/products';

    const paramsToSign = {
      folder,
      timestamp,
      upload_preset: uploadPreset,
    };

    // Generate cryptographic signature via official Cloudinary SDK
    const signature = cloudinary.utils.api_sign_request(paramsToSign, apiSecret);

    return NextResponse.json({
      success: true,
      timestamp,
      signature,
      apiKey,
      cloudName,
      uploadPreset,
      folder,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to generate upload signature.' },
      { status: 500 }
    );
  }
}
