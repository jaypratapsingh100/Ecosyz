# Fix Database Connection Error

## Error
```
PrismaClientInitializationError: Authentication failed against database server
```

## Quick Fix

### Step 1: Check Your Database URL

Your `.env.local` file should have a valid `DATABASE_URL`. For Supabase, it should look like:

```env
DATABASE_URL="postgresql://postgres.ltenyoiaydemsnrvdbpc:[YOUR_PASSWORD]@aws-1-ap-south-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres:[YOUR_PASSWORD]@db.ltenyoiaydemsnrvdbpc.supabase.co:5432/postgres"
```

### Step 2: Get Fresh Credentials from Supabase

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Go to **Settings** → **Database**
4. Under **Connection string**, copy the **URI** (pooled connection)
5. Replace `[YOUR-PASSWORD]` with your actual database password
6. Update `.env.local` with the new `DATABASE_URL`

### Step 3: Test Connection

Run the test script:

```bash
node scripts/test-db-connection.js
```

This will verify your database connection.

### Step 4: Run Migrations (If Needed)

If the AppProject table doesn't exist:

```bash
pnpm prisma migrate dev --name add_app_builder_models
```

Or if you want to push schema without migrations:

```bash
pnpm prisma db push
```

## Common Issues

### Issue: "Authentication failed"
**Solution**: 
- Your database password might have changed
- Get fresh credentials from Supabase dashboard
- Make sure there are no extra spaces or quotes in `.env.local`

### Issue: "Table does not exist"
**Solution**:
- Run migrations: `pnpm prisma migrate dev`
- Or push schema: `pnpm prisma db push`

### Issue: "Connection timeout"
**Solution**:
- Check if you're using the correct connection URL (pooled vs direct)
- Verify your network can reach Supabase
- Check firewall settings

## Verify Environment Variables

Make sure `.env.local` has:

```env
# Database (Supabase)
DATABASE_URL="postgresql://postgres.ltenyoiaydemsnrvdbpc:[PASSWORD]@aws-1-ap-south-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres:[PASSWORD]@db.ltenyoiaydemsnrvdbpc.supabase.co:5432/postgres"

# Supabase Auth
NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-anon-key"
SUPABASE_SERVICE_ROLE_KEY="your-service-key"
```

## After Fixing

1. Restart your dev server: `pnpm dev`
2. Try accessing `/app-builder` again
3. The error should be resolved


