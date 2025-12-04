/* SPDX-License-Identifier: MIT */
import neo4j, { Driver, Session } from 'neo4j-driver';

let driver: Driver | null = null;

export function getNeo4jDriver(): Driver {
  if (driver) return driver;
  const url = process.env.NEO4J_URI || 'bolt://localhost:7687';
  const user = process.env.NEO4J_USER || 'neo4j';
  const password = process.env.NEO4J_PASSWORD || 'neo4j';
  driver = neo4j.driver(url, neo4j.auth.basic(user, password), {
    encrypted: 'ENCRYPTION_OFF',
  });
  return driver;
}

export async function verifyNeo4jConnection(): Promise<boolean> {
  try {
    const d = getNeo4jDriver();
    await d.verifyConnectivity();
    return true;
  } catch {
    return false;
  }
}

export function getSession(database?: string): Session {
  const d = getNeo4jDriver();
  return d.session({ database: database || process.env.NEO4J_DATABASE || 'neo4j' });
}

export async function closeNeo4j(): Promise<void> {
  if (driver) {
    await driver.close();
    driver = null;
  }
}
