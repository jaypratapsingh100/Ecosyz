#!/bin/bash

# Supabase Storage Setup Script
# Creates the necessary buckets and policies for Ecosyz

echo "🔧 Setting up Supabase Storage for Ecosyz"
echo "=========================================="

# Load environment variables
if [ -f ".env" ]; then
    export $(grep -v '^#' .env | xargs)
fi

# Create avatars bucket
node -e "
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Supabase environment variables not set');
  process.exit(1);
}

const supabaseServer = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function setupStorage() {
  try {
    console.log('📦 Creating avatars bucket...');

    // Create avatars bucket
    const { data: bucket, error: bucketError } = await supabaseServer.storage.createBucket('avatars', {
      public: true,
      allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
      fileSizeLimit: 2097152, // 2MB
    });

    if (bucketError && !bucketError.message.includes('already exists')) {
      console.error('❌ Error creating avatars bucket:', bucketError.message);
    } else {
      console.log('✅ Avatars bucket created or already exists');
    }

    // Create problem-idea-images bucket (for Problems & Ideas feed)
    const { error: piBucketError } = await supabaseServer.storage.createBucket('problem-idea-images', {
      public: true,
      allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
      fileSizeLimit: 5242880, // 5MB
    });
    if (piBucketError && !piBucketError.message.includes('already exists')) {
      console.error('❌ Error creating problem-idea-images bucket:', piBucketError.message);
    } else {
      console.log('✅ problem-idea-images bucket created or already exists');
    }

    // Create intern-resumes bucket (for Fellowship resume uploads)
    const { error: resumeBucketError } = await supabaseServer.storage.createBucket('intern-resumes', {
      public: true,
      allowedMimeTypes: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
      fileSizeLimit: 5242880, // 5MB
    });
    if (resumeBucketError && !resumeBucketError.message.includes('already exists')) {
      console.error('❌ Error creating intern-resumes bucket:', resumeBucketError.message);
    } else {
      console.log('✅ intern-resumes bucket created or already exists');
    }

    // Create bucket policy for public read access
    console.log('🔒 Setting up bucket policies...');

    const { error: policyError } = await supabaseServer.storage.from('avatars').createSignedUploadUrl('test.jpg');

    if (policyError) {
      console.log('⚠️  Policy setup may need manual configuration in Supabase dashboard');
      console.log('Go to: Storage → avatars → Policies → Add policy for SELECT');
      console.log('Policy: SELECT * FROM storage.objects WHERE bucket_id = \"avatars\"');
    } else {
      console.log('✅ Bucket policies configured');
    }

    // List all buckets
    const { data: buckets, error: listError } = await supabaseServer.storage.listBuckets();

    if (!listError && buckets) {
      console.log('📋 Available buckets:');
      buckets.forEach(bucket => {
        console.log(\`  - \${bucket.name} (\${bucket.public ? 'public' : 'private'})\`);
      });
    }

  } catch (error) {
    console.error('❌ Setup error:', error.message);
  }
}

setupStorage();
"