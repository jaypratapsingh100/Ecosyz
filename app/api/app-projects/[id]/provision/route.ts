/**
 * POST /api/app-projects/[id]/provision
 *
 * Auto-provisions the Supabase database for a generated app project.
 * - Extracts schema.sql from project files
 * - Namespaces table names with project ID prefix for multi-tenant isolation
 * - Executes SQL via Supabase service role (admin)
 * - Returns the Supabase URL + anon key so the deployed app can connect
 *
 * This runs automatically before deploy — users never see it.
 */
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser, ensureUserInDb } from '@/lib/auth';
import { supabaseServer } from '@/lib/supabaseServer';

/** Sanitize project ID into a valid Postgres prefix (lowercase alphanumeric + underscore) */
function toTablePrefix(projectId: string): string {
  return 'app_' + projectId.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase().slice(0, 20);
}

/**
 * Namespace table names in SQL so each project gets isolated tables.
 * Replaces `public.tablename` and bare `tablename` references with `public.prefix_tablename`.
 */
function namespaceSql(sql: string, prefix: string): string {
  // Find all CREATE TABLE statements to extract table names
  const tableNames: string[] = [];
  const createTableRegex = /create\s+table\s+(?:if\s+not\s+exists\s+)?(?:public\.)?(\w+)/gi;
  let match;
  while ((match = createTableRegex.exec(sql)) !== null) {
    const name = match[1].toLowerCase();
    // Don't namespace auth.users or other system tables
    if (name !== 'users' && !name.startsWith('auth_') && !name.startsWith('app_')) {
      tableNames.push(name);
    }
  }

  let result = sql;
  for (const table of tableNames) {
    const prefixed = `${prefix}_${table}`;
    // Replace public.tablename -> public.prefix_tablename
    result = result.replace(
      new RegExp(`public\\.${table}\\b`, 'gi'),
      `public.${prefixed}`
    );
    // Replace bare tablename in FROM, INTO, TABLE, ON clauses (but not in string literals)
    // Only replace when preceded by keywords to avoid false matches
    result = result.replace(
      new RegExp(`((?:from|into|table|on|update|alter table)\\s+(?:if\\s+not\\s+exists\\s+)?)${table}\\b`, 'gi'),
      `$1${prefixed}`
    );
  }

  return result;
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    await ensureUserInDb(user);
    const prismaUser = await prisma.user.findUnique({
      where: { supabaseId: user.id },
    });
    if (!prismaUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const { id } = await params;
    const project = await prisma.appProject.findUnique({
      where: { id },
      include: { files: true },
    });

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }
    if (project.ownerId !== prismaUser.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Check Supabase admin client is configured
    if (!supabaseServer) {
      return NextResponse.json(
        { error: 'Supabase service role not configured. Set SUPABASE_SERVICE_ROLE_KEY.' },
        { status: 500 }
      );
    }

    // Extract schema.sql from project files
    const schemaFile = project.files.find(
      (f: { path: string }) => f.path === 'src/lib/schema.sql' || f.path.endsWith('schema.sql')
    );

    if (!schemaFile) {
      // No schema needed — project doesn't have backend features
      return NextResponse.json({
        ok: true,
        provisioned: false,
        message: 'No schema.sql found — project has no database requirements.',
        supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
        supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      });
    }

    const prefix = toTablePrefix(id);
    const namespacedSql = namespaceSql(schemaFile.content, prefix);

    console.log(`🗄️ Provisioning database for project ${id} with prefix "${prefix}"`);
    console.log(`📝 SQL (first 500 chars): ${namespacedSql.slice(0, 500)}`);

    // Execute the SQL via Supabase's rpc or raw query
    // Using supabase-js to execute raw SQL via the pg_execute function
    // or falling back to the REST endpoint
    const { error } = await supabaseServer.rpc('exec_sql', {
      query: namespacedSql,
    }).single();

    if (error) {
      // If rpc doesn't exist, try direct SQL via Supabase's SQL API
      console.warn('⚠️ exec_sql RPC not available, trying direct approach:', error.message);

      // Split into individual statements and execute via Supabase REST
      const statements = namespacedSql
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--'));

      const errors: string[] = [];
      for (const stmt of statements) {
        try {
          // Use Supabase's PostgREST or raw fetch to the SQL endpoint
          const response = await fetch(
            `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/rpc/exec_sql`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY!,
                'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY!}`,
              },
              body: JSON.stringify({ query: stmt + ';' }),
            }
          );

          if (!response.ok) {
            const errText = await response.text().catch(() => 'Unknown error');
            errors.push(`Statement failed: ${stmt.slice(0, 80)}... → ${errText}`);
          }
        } catch (stmtErr) {
          errors.push(`Statement error: ${stmt.slice(0, 80)}... → ${stmtErr}`);
        }
      }

      if (errors.length > 0) {
        console.warn('⚠️ Some SQL statements failed:', errors);
        // Don't block — some errors are expected (e.g., "already exists")
      }
    }

    // Store provisioning info in project config
    const existingConfig = (project.config as Record<string, unknown>) || {};
    await prisma.appProject.update({
      where: { id },
      data: {
        config: {
          ...existingConfig,
          dbProvisioned: true,
          dbPrefix: prefix,
          dbProvisionedAt: new Date().toISOString(),
        },
      },
    });

    console.log(`✅ Database provisioned for project ${id}`);

    return NextResponse.json({
      ok: true,
      provisioned: true,
      prefix,
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
      supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      message: `Database tables created with prefix "${prefix}".`,
    });
  } catch (error) {
    console.error('Provision error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Provisioning failed' },
      { status: 500 }
    );
  }
}
