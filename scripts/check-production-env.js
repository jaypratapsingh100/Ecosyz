/**
 * Quick script to check production environment setup
 * Run this to verify your production configuration
 */

console.log('\n🔍 Checking Production Environment Setup\n');
console.log('='.repeat(60));

// Check environment variables
const requiredVars = [
  'DATABASE_URL',
  'DIRECT_URL',
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'NEXTAUTH_SECRET',
  'NEXTAUTH_URL',
];

console.log('\n📋 Required Environment Variables:\n');

let allSet = true;
requiredVars.forEach(varName => {
  const value = process.env[varName];
  if (value) {
    // Mask sensitive values
    const displayValue = varName.includes('SECRET') || varName.includes('KEY') || varName.includes('URL')
      ? value.substring(0, 20) + '...' + (value.length > 40 ? value.substring(value.length - 10) : '')
      : value;
    console.log(`   ✅ ${varName}: ${displayValue}`);
  } else {
    console.log(`   ❌ ${varName}: NOT SET`);
    allSet = false;
  }
});

if (!allSet) {
  console.log('\n⚠️  Some environment variables are missing!');
  console.log('\n💡 To fix:');
  console.log('   1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables');
  console.log('   2. Add missing variables');
  console.log('   3. Redeploy your application');
} else {
  console.log('\n✅ All required environment variables are set!');
}

console.log('\n' + '='.repeat(60));
console.log('\n📝 Next Steps:');
console.log('   1. Ensure user logs in to production at least once');
console.log('   2. Run: node scripts/diagnose-production-user.js tesla@gmail.com');
console.log('   3. Check Vercel logs if issues persist');
console.log('\n');
