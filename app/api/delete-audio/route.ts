import { NextRequest, NextResponse } from 'next/server';
import { UTApi } from 'uploadthing/server';

export async function POST(request: NextRequest) {
  try {
    const { fileUrl } = await request.json();

    if (!fileUrl) {
      return NextResponse.json({ error: 'No fileUrl provided' }, { status: 400 });
    }

    const fileKey = fileUrl.split('/').pop();
    if (!fileKey) {
      return NextResponse.json({ error: 'Invalid file URL' }, { status: 400 });
    }

    const utapi = new UTApi();
    await utapi.deleteFiles(fileKey);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting file:', error);
    return NextResponse.json({ error: 'Failed to delete file' }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ status: 'ok' });
}
