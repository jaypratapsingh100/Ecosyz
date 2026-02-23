/**
 * Creates the Supabase Storage bucket "problem-idea-images" for the Problems & Ideas feed.
 * Run from project root: node scripts/create-problem-idea-bucket.js
 * Requires .env with NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY
 */
require('dotenv').config({ path: '.env' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function main() {
  const { error } = await supabase.storage.createBucket('problem-idea-images', {
    public: true,
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
    fileSizeLimit: 5242880, // 5MB
  });
  if (error && !error.message.includes('already exists')) {
    console.error('❌', error.message);
    process.exit(1);
  }
  console.log('✅ Bucket "problem-idea-images" is ready.');
}

main();
