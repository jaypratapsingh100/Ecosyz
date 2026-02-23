import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { supabaseServer } from '@/lib/supabaseServer';

const BUCKET = 'problem-idea-images';
const MAX_FILES = 6;
const MAX_SIZE_PER_FILE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

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
          error: 'Image upload not configured. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY. Create a public bucket "problem-idea-images" in Supabase Storage.',
        },
        { status: 503 }
      );
    }

    const formData = await req.formData();
    const files = formData.getAll('images') as File[];
    const single = formData.get('image');
    const allFiles: File[] = [
      ...files,
      ...(single && single instanceof File ? [single] : []),
    ];
    const toUpload = allFiles.filter((f) => f && f instanceof File && f.size > 0);

    if (toUpload.length === 0) {
      return NextResponse.json(
        { error: 'No image files provided. Use form field "images" or "image".' },
        { status: 400 }
      );
    }

    if (toUpload.length > MAX_FILES) {
      return NextResponse.json(
        { error: `Maximum ${MAX_FILES} images per post.` },
        { status: 400 }
      );
    }

    for (const file of toUpload) {
      if (file.size > MAX_SIZE_PER_FILE) {
        return NextResponse.json(
          { error: `File "${file.name}" is too large. Max 5MB per image.` },
          { status: 400 }
        );
      }
      if (!ALLOWED_TYPES.includes(file.type)) {
        return NextResponse.json(
          { error: `File "${file.name}" has invalid type. Use JPEG, PNG, WebP or GIF.` },
          { status: 400 }
        );
      }
    }

    const basePath = `${user.id}/${Date.now()}`;
    const urls: string[] = [];
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!.replace(/\/$/, '');

    for (let i = 0; i < toUpload.length; i++) {
      const file = toUpload[i];
      const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
      const safeName = `${basePath}-${i}.${ext}`;
      const buf = await file.arrayBuffer();

      const { error } = await supabaseServer.storage
        .from(BUCKET)
        .upload(safeName, buf, {
          contentType: file.type,
          upsert: false,
        });

      if (error) {
        console.error('Upload error:', error);
        const isDev = process.env.NODE_ENV === 'development';
        const baseMessage = error.message.includes('Bucket')
          ? 'Storage bucket not found. Check your Supabase Storage configuration.'
          : 'Image upload failed. Please try again.';

        return NextResponse.json(
          {
            error: baseMessage,
            ...(isDev && { details: error.message }),
          },
          { status: 500 }
        );
      }

      urls.push(`${supabaseUrl}/storage/v1/object/public/${BUCKET}/${safeName}`);
    }

    return NextResponse.json({ urls });
  } catch (err) {
    console.error('Upload error:', err);
    const isDev = process.env.NODE_ENV === 'development';
    return NextResponse.json(
      {
        error: 'Upload failed',
        ...(isDev && { details: err instanceof Error ? err.message : String(err) }),
      },
      { status: 500 }
    );
  }
}
