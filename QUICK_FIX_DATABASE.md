# 🚨 Quick Fix: Database Connection Error

## The Problem
You're seeing: `Authentication failed against database server`

This means your `DATABASE_URL` in `.env.local` is either:
- ❌ Missing
- ❌ Invalid/expired
- ❌ Has wrong password

## ⚡ Quick Fix (5 minutes)

### Option 1: Fix Database Connection (Recommended)

1. **Open `.env.local`** in your project root

2. **Get your Supabase Database URL:**
   - Go to: https://app.supabase.com
   - Select your project
   - Go to **Settings** → **Database**
   - Scroll to **Connection string**
   - Copy the **URI** (pooled connection)
   - It looks like: `postgresql://postgres.ltenyoiaydemsnrvdbpc:[PASSWORD]@aws-1-ap-south-1.pooler.supabase.com:6543/postgres?pgbouncer=true`

3. **Update `.env.local`:**
   ```env
   DATABASE_URL="postgresql://postgres.ltenyoiaydemsnrvdbpc:[YOUR_PASSWORD]@aws-1-ap-south-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
   DIRECT_URL="postgresql://postgres:[YOUR_PASSWORD]@db.ltenyoiaydemsnrvdbpc.supabase.co:5432/postgres"
   ```
   ⚠️ **Replace `[YOUR_PASSWORD]` with your actual database password!**

4. **Test the connection:**
   ```bash
   node scripts/test-db-connection.js
   ```

5. **Run migrations (if needed):**
   ```bash
   pnpm prisma db push
   ```
   This creates all the tables including AppProject, AppFile, etc.

6. **Restart dev server:**
   ```bash
   pnpm dev
   ```

### Option 2: Use Local Database (For Testing)

If you want to test without Supabase:

1. **Install PostgreSQL locally** (if not installed):
   ```bash
   # macOS
   brew install postgresql
   brew services start postgresql
   
   # Create database
   createdb ecosyz_test
   ```

2. **Update `.env.local`:**
   ```env
   DATABASE_URL="postgresql://postgres:postgres@localhost:5432/ecosyz_test"
   DIRECT_URL="postgresql://postgres:postgres@localhost:5432/ecosyz_test"
   ```

3. **Push schema:**
   ```bash
   pnpm prisma db push
   ```

4. **Restart dev server**

## ✅ Verify It's Fixed

After fixing, try:
1. Go to `/app-builder`
2. Click "+ New" to create a project
3. Should work without errors!

## 🆘 Still Having Issues?

1. **Check if DATABASE_URL is loaded:**
   ```bash
   node -e "require('dotenv').config({path:'.env.local'}); console.log('DATABASE_URL:', process.env.DATABASE_URL ? 'SET' : 'NOT SET')"
   ```

2. **Test connection directly:**
   ```bash
   node scripts/test-db-connection.js
   ```

3. **Check Supabase dashboard:**
   - Make sure your project is active
   - Check if database is paused (free tier pauses after inactivity)
   - Reset database password if needed

4. **Common mistakes:**
   - ❌ Forgot to replace `[YOUR_PASSWORD]` placeholder
   - ❌ Extra spaces or quotes in the URL
   - ❌ Using wrong connection type (should use pooled for app)
   - ❌ Database password changed but `.env.local` not updated

## 📝 Need Help?

See detailed guide: `docs/FIX_DATABASE_CONNECTION.md`


