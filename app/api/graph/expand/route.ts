/* SPDX-License-Identifier: MIT */
import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '../../../../app/lib/graph/neo4j-client';

export const revalidate = 0;
export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  const limit = Math.min(100, Math.max(5, parseInt(searchParams.get('limit') || '30', 10)));
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  const session = getSession();
  try {
    let res;
    if (id.includes(':')) {
      // Entity encoded as Label:value
      const [label, value] = id.split(':');
      res = await session.run(
        `MATCH (e:${label} {value: $value})<-[r:MENTIONS]-(n:Resource)
         RETURN e as left, r, n as right
         LIMIT $limit`,
        { value, limit }
      );
    } else {
      // Resource id
      res = await session.run(
        `MATCH (n:Resource {id: $id})-[r:MENTIONS]->(e)
         RETURN n as left, r, e as right
         LIMIT $limit`,
        { id, limit }
      );
    }

    const nodesMap = new Map<string, any>();
    const edges: any[] = [];
    for (const record of res.records) {
      const left: any = record.get('left');
      const right: any = record.get('right');
      const rel: any = record.get('r');

      const leftId = left.labels.includes('Resource') ? String(left.properties.id) : `${String(left.labels[0])}:${String(left.properties.value)}`;
      const rightId = right.labels.includes('Resource') ? String(right.properties.id) : `${String(right.labels[0])}:${String(right.properties.value)}`;

      if (!nodesMap.has(leftId)) {
        nodesMap.set(leftId, {
          id: leftId,
          label: left.labels.includes('Resource') ? (left.properties.title || 'Resource') : left.properties.value,
          group: left.labels.includes('Resource') ? 'Resource' : String(left.labels[0])
        });
      }
      if (!nodesMap.has(rightId)) {
        nodesMap.set(rightId, {
          id: rightId,
          label: right.labels.includes('Resource') ? (right.properties.title || 'Resource') : right.properties.value,
          group: right.labels.includes('Resource') ? 'Resource' : String(right.labels[0])
        });
      }
      edges.push({ id: `${leftId}->${rightId}`, source: leftId, target: rightId, label: rel.properties?.type || 'MENTIONS', score: rel.properties?.score ?? 0 });
    }

    return NextResponse.json({ nodes: Array.from(nodesMap.values()), edges });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Expand failed' }, { status: 500 });
  } finally {
    await session.close();
  }
}


