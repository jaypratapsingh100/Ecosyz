import { NextRequest, NextResponse } from 'next/server';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

const ALLOWED_TYPES: Record<string, string> = {
  'application/pdf': 'pdf',
  'text/plain': 'txt',
  'text/csv': 'csv',
  'text/markdown': 'md',
  'text/x-markdown': 'md',
  'application/json': 'json',
  'image/png': 'image',
  'image/jpeg': 'image',
  'image/webp': 'image',
  'image/gif': 'image',
};

async function extractTextFromPDF(buffer: Buffer): Promise<string> {
  const pdfParse = (await import('pdf-parse')).default;
  const data = await pdfParse(buffer);
  return data.text || '';
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File too large. Maximum size is ${MAX_FILE_SIZE / (1024 * 1024)}MB.` },
        { status: 400 }
      );
    }

    const fileType = ALLOWED_TYPES[file.type];
    const ext = file.name.split('.').pop()?.toLowerCase();
    const resolvedType = fileType || (
      ext === 'pdf' ? 'pdf' :
      ext === 'txt' ? 'txt' :
      ext === 'csv' ? 'csv' :
      ext === 'md' ? 'md' :
      ext === 'json' ? 'json' :
      null
    );

    if (!resolvedType) {
      return NextResponse.json(
        { error: `Unsupported file type: ${file.type || ext}. Supported: PDF, TXT, CSV, MD, JSON, PNG, JPG, WebP, GIF.` },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    let extractedText = '';

    switch (resolvedType) {
      case 'pdf':
        extractedText = await extractTextFromPDF(buffer);
        break;
      case 'txt':
      case 'md':
      case 'csv':
        extractedText = buffer.toString('utf-8');
        break;
      case 'json':
        try {
          extractedText = JSON.stringify(JSON.parse(buffer.toString('utf-8')), null, 2);
        } catch {
          extractedText = buffer.toString('utf-8');
        }
        break;
      case 'image': {
        const base64 = buffer.toString('base64');
        return NextResponse.json({
          success: true,
          fileName: file.name,
          fileType: resolvedType,
          fileSize: file.size,
          extractedText: `[Image file: ${file.name}]`,
          isImage: true,
          imageDataUrl: `data:${file.type};base64,${base64}`,
        });
      }
    }

    // Truncate very long text
    const MAX_TEXT_LENGTH = 50000;
    const truncated = extractedText.length > MAX_TEXT_LENGTH;
    if (truncated) {
      extractedText = extractedText.substring(0, MAX_TEXT_LENGTH) + '\n\n[... content truncated ...]';
    }

    return NextResponse.json({
      success: true,
      fileName: file.name,
      fileType: resolvedType,
      fileSize: file.size,
      extractedText,
      truncated,
      characterCount: extractedText.length,
    });
  } catch (error: any) {
    console.error('File upload error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to process file' },
      { status: 500 }
    );
  }
}
