import { PrismaClient, Prisma } from '@prisma/client';

declare global {
  var prisma: PrismaClient | undefined;
}

/**
 * Retry wrapper for Prisma operations that may fail due to connection pool timeouts
 * This is especially important for Vercel serverless environments
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries = 3,
  delayMs = 1000
): Promise<T> {
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error: any) {
      lastError = error;
      
      // Check if it's a connection pool timeout error
      const isConnectionError = 
        error?.message?.includes('connection pool') ||
        error?.message?.includes('Timed out fetching') ||
        error?.code === 'P1001' || // Connection error
        error?.code === 'P1017';   // Server closed connection
      
      if (isConnectionError && attempt < maxRetries) {
        // Exponential backoff
        const waitTime = delayMs * Math.pow(2, attempt - 1);
        console.warn(`Connection pool timeout (attempt ${attempt}/${maxRetries}), retrying in ${waitTime}ms...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        continue;
      }
      
      // Not a connection error or max retries reached
      throw error;
    }
  }
  
  throw lastError || new Error('Operation failed after retries');
}

const logLevels: Prisma.LogLevel[] = process.env.NODE_ENV === 'development' 
  ? ['query', 'error', 'warn'] 
  : ['error'];

// Only create PrismaClient if DATABASE_URL is available
// During build time (prisma generate), Prisma doesn't actually connect to the database
// but the client constructor still validates the URL format
const createPrismaClient = () => {
  if (!process.env.DATABASE_URL) {
    // During build/generate phase, use a dummy URL to allow Prisma Client generation
    // This URL is only used for validation, not actual connection during generate
    if (process.env.NEXT_PHASE === 'phase-production-build' || process.env.VERCEL_ENV) {
      // Use a valid PostgreSQL URL format for build-time validation
      return new PrismaClient({
        log: logLevels,
        datasources: {
          db: {
            url: 'postgresql://build:build@localhost:5432/build?schema=public',
          },
        },
      });
    }
    // For runtime without DATABASE_URL, throw error with helpful message
    const errorMessage = process.env.VERCEL 
      ? 'DATABASE_URL is required but not set in Vercel environment variables. Please add it in Vercel Dashboard → Settings → Environment Variables. See VERCEL_DATABASE_FIX.md for detailed instructions.'
      : 'DATABASE_URL is required but not set. Please configure it in your environment variables.';
    throw new Error(errorMessage);
  }

  // Check if DIRECT_URL is also set (required for migrations)
  if (!process.env.DIRECT_URL && process.env.NODE_ENV === 'production') {
    console.warn('DIRECT_URL is not set. This is required for database migrations. Add it in Vercel Dashboard → Settings → Environment Variables.');
  }

  // Validate DATABASE_URL for serverless environments (Vercel)
  // Connection pool parameters are critical for preventing timeouts
  if (process.env.VERCEL && process.env.DATABASE_URL) {
    const databaseUrl = process.env.DATABASE_URL;
    const url = new URL(databaseUrl);
    
    // Check if connection pool parameters are missing
    const hasConnectionLimit = url.searchParams.has('connection_limit');
    const hasPoolTimeout = url.searchParams.has('pool_timeout');
    const isPooledConnection = url.port === '6543' || url.searchParams.has('pgbouncer');
    
    if (!hasConnectionLimit || !hasPoolTimeout) {
      console.warn('⚠️ DATABASE_URL missing connection pool parameters for Vercel serverless.');
      console.warn('   Add these to your DATABASE_URL in Vercel environment variables:');
      console.warn('   ?connection_limit=10&pool_timeout=60');
      console.warn('   For Supabase pooled connections, use port 6543 with ?pgbouncer=true');
      console.warn('   See docs/VERCEL_CONNECTION_POOL_FIX.md for details');
    }
    
    // Warn if using direct connection instead of pooled connection
    if (!isPooledConnection && url.port === '5432') {
      console.warn('⚠️ Using direct database connection (port 5432) instead of pooled connection.');
      console.warn('   For Vercel serverless, use Supabase connection pooler (port 6543)');
      console.warn('   Example: postgresql://...@aws-0-*.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=10&pool_timeout=60');
    }
  }

  return new PrismaClient({
    log: logLevels,
  });
};

export const prisma = global.prisma || createPrismaClient();

if (process.env.NODE_ENV !== 'production') {
  global.prisma = prisma;
}
