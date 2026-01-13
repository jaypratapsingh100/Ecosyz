# 🔧 Fix: Password Mismatch Between .env and .env.local

## The Problem

You have **two different database passwords**:
- `.env` has password: `GcQXvxI4LwNawqgJ` ✅ (This one works!)
- `.env.local` has password: `3PRETq1G7Ch8CPxS` ❌ (This one might be expired/wrong)

**Next.js prioritizes `.env.local` over `.env`**, so it's using the wrong password!

## ⚡ Quick Fix

### Option 1: Update .env.local with Correct Password (Recommended)

Update your `.env.local` file to use the working password from `.env`:

```env
DATABASE_URL="postgresql://postgres.ltenyoiaydemsnrvdbpc:GcQXvxI4LwNawqgJ@aws-1-ap-south-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1&pool_timeout=20&sslmode=require"
DIRECT_URL="postgresql://postgres:GcQXvxI4LwNawqgJ@db.ltenyoiaydemsnrvdbpc.supabase.co:5432/postgres"
```

### Option 2: Remove DATABASE_URL from .env.local

If you want to use `.env` instead, remove these lines from `.env.local`:
- `DATABASE_URL=...`
- `DIRECT_URL=...`

Then Next.js will use `.env` which has the working password.

### Option 3: Get Fresh Password from Supabase

If both passwords might be expired:

1. Go to https://app.supabase.com
2. Settings → Database
3. Click "Reset database password" (if needed)
4. Copy the new connection string
5. Update **both** `.env` and `.env.local`

## ✅ After Fixing

1. **Restart your dev server:**
   ```bash
   # Stop server (Ctrl+C)
   pnpm dev
   ```

2. **Test creating a project:**
   - Go to `/app-builder`
   - Click "+ New"
   - Should work now!

## 🎯 Recommended Solution

**Update `.env.local`** with the working password from `.env`:

```bash
# Edit .env.local and update these lines:
DATABASE_URL="postgresql://postgres.ltenyoiaydemsnrvdbpc:GcQXvxI4LwNawqgJ@aws-1-ap-south-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1&pool_timeout=20&sslmode=require"
DIRECT_URL="postgresql://postgres:GcQXvxI4LwNawqgJ@db.ltenyoiaydemsnrvdbpc.supabase.co:5432/postgres"
```

Then restart: `pnpm dev`






