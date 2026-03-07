/**
 * Creates the Supabase Storage bucket "intern-resumes" for Fellowship resume uploads.
 * Run from project root: node scripts/create-intern-resumes-bucket.js
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
  const { error } = await supabase.storage.createBucket('intern-resumes', {
    public: true,
    allowedMimeTypes: [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ],
    fileSizeLimit: 5242880, // 5MB
  });
  if (error && !error.message.includes('already exists')) {
    console.error('❌', error.message);
    process.exit(1);
  }
  console.log('✅ Bucket "intern-resumes" is ready.');
}

main();
