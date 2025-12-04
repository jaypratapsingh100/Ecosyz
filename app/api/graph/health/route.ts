/* SPDX-License-Identifier: MIT */
import { NextResponse } from 'next/server';
import { verifyNeo4jConnection, getSession } from '../../../../app/lib/graph/neo4j-client';

export const revalidate = 0;
export const runtime = 'nodejs';

export async function GET() {
  const ok = await verifyNeo4jConnection();
  let version: string | null = null;
  if (ok) {
    const session = getSession();
    try {
      const res = await session.run('CALL dbms.components() YIELD name, versions RETURN head(versions) AS version LIMIT 1');
      version = res.records?.[0]?.get('version') || null;
    } catch {
      version = null;
    } finally {
      await session.close();
    }
  }
  return NextResponse.json({ neo4j: ok, version });
}
