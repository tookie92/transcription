import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

const AUDIO_DIR = path.join(process.cwd(), "public", "audio-uploads");

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("audio") as File;

    if (!file) {
      return NextResponse.json(
        { error: "No audio file provided" },
        { status: 400 }
      );
    }

    await mkdir(AUDIO_DIR, { recursive: true });

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    
    const ext = file.name.split(".").pop() || "wav";
    const filename = `${generateId()}.${ext}`;
    const filepath = path.join(AUDIO_DIR, filename);
    
    await writeFile(filepath, buffer);

    const audioUrl = `/audio-uploads/${filename}`;

    return NextResponse.json({ audioUrl });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: "Upload failed" },
      { status: 500 }
    );
  }
}
