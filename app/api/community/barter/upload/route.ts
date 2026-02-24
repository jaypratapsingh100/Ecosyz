import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { supabaseServer } from '@/lib/supabaseServer';

const BUCKET = 'barter-attachments';
const MAX_FILES = 6;
const MAX_SIZE_PER_FILE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
];

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    if (!supabaseServer) {
      return NextResponse.json(
        {
          error:
            'Attachment upload not configured. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY. Create a public bucket "barter-attachments" in Supabase Storage.',
        },
        { status: 503 }
      );
    }

    const formData = await req.formData();
    const files = formData.getAll('files') as File[];
    const single = formData.get('file');
    const allFiles: File[] = [
      ...files,
      ...(single && single instanceof File ? [single] : []),
    ];
    const toUpload = allFiles.filter(
      (f) => f && f instanceof File && f.size > 0
    );

    if (toUpload.length === 0) {
      return NextResponse.json(
        {
          error:
            'No files provided. Use form field "files" (multiple) or "file" (single).',
        },
        { status: 400 }
      );
    }

    if (toUpload.length > MAX_FILES) {
      return NextResponse.json(
        { error: `Maximum ${MAX_FILES} attachments per ask.` },
        { status: 400 }
      );
    }

    for (const file of toUpload) {
      if (file.size > MAX_SIZE_PER_FILE) {
        return NextResponse.json(
          {
            error: `File "${file.name}" is too large. Max 10MB per attachment.`,
          },
          { status: 400 }
        );
      }
      if (!ALLOWED_TYPES.includes(file.type)) {
        return NextResponse.json(
          {
            error: `File "${file.name}" has invalid type. Allowed: images, PDF, Word, PowerPoint, or plain text.`,
          },
          { status: 400 }
        );
      }
    }

    const basePath = `${user.id}/${Date.now()}`;
    const attachments: {
      url: string;
      name: string;
      type: string;
      size: number;
    }[] = [];
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!.replace(/\/$/, '');

    for (let i = 0; i < toUpload.length; i++) {
      const file = toUpload[i];
      const ext = file.name.split('.').pop()?.toLowerCase() || 'dat';
      const safeName = `${basePath}-${i}.${ext}`;
      const buf = await file.arrayBuffer();

      const { error } = await supabaseServer.storage
        .from(BUCKET)
        .upload(safeName, buf, {
          contentType: file.type,
          upsert: false,
        });

      if (error) {
        console.error('Barter attachment upload error:', error);
        const isDev = process.env.NODE_ENV === 'development';

        return NextResponse.json(
          {
            error: 'Attachment upload failed. Please try again.',
            ...(isDev && { details: error.message }),
          },
          { status: 500 }
        );
      }

      attachments.push({
        url: `${supabaseUrl}/storage/v1/object/public/${BUCKET}/${safeName}`,
        name: file.name,
        type: file.type,
        size: file.size,
      });
    }

    return NextResponse.json({ attachments });
  } catch (err) {
    console.error('Barter attachment upload error:', err);
    const isDev = process.env.NODE_ENV === 'development';
    return NextResponse.json(
      {
        error: 'Attachment upload failed',
        ...(isDev && {
          details: err instanceof Error ? err.message : String(err),
        }),
      },
      { status: 500 }
    );
  }
}

