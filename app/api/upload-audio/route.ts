import { NextRequest, NextResponse } from 'next/server';
import { utapi } from '@/lib/uploadthing';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'No audio file provided' },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const fileToUpload = new File([buffer], file.name, { type: file.type });

    const response = await utapi.uploadFiles(fileToUpload);

    if (response.error) {
      console.error('UploadThing error:', response.error);
      throw new Error(response.error.message);
    }

    return NextResponse.json({
      url: response.data?.ufsUrl,
      fileName: file.name,
    });
  } catch (error) {
    console.error('Upload error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Upload failed';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
