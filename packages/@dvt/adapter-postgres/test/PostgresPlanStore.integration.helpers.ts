import { createHash } from 'node:crypto';

import type { PlannerBuildResultV1 } from '@dvt/contracts';
import { Client } from 'pg';
import { describe } from 'vitest';

import { PostgresPlanStore } from '../src/index.js';
import { quoteIdentifier } from '../src/sqlUtils.js';

export const NOW = '2026-03-21T00:00:00.000Z';
export const describeIfPg = process.env.DVT_PG_INTEGRATION === '1' ? describe : describe.skip;

export async function dropSchema(schema: string): Promise<void> {
  const client = await createPgClient();
  try {
    await client.query(`DROP SCHEMA IF EXISTS ${quoteIdentifier(schema)} CASCADE`);
  } finally {
    await client.end();
  }
}

export async function withStore(
  schema: string,
  fn: (store: PostgresPlanStore) => Promise<void>
): Promise<void> {
  const store = createStore(schema);
  try {
    await store.migrate();
    await fn(store);
  } finally {
    await store.close();
  }
}

export function createStore(schema: string): PostgresPlanStore {
  return new PostgresPlanStore({
    schema,
    toExecutablePlan: (buildResult) => ({
      schemaVersion: 'v1.2',
      text: JSON.stringify({
        metadata: {
          planId: buildResult.plan.metadata.planId,
          planVersion: buildResult.plan.metadata.planVersion,
          schemaVersion: 'v1.2',
          contractVersion: '1.0.0',
          inputHashSha256: buildResult.plan.metadata.inputHashSha256,
        },
        steps: buildResult.plan.steps,
      }),
    }),
  });
}

export async function createPgClient(): Promise<Client> {
  const connectionString = process.env.DVT_PG_URL ?? process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('missing postgres connection string for integration test');
  }
  const client = new Client({ connectionString });
  await client.connect();
  return client;
}

export function makeBuildResult(planId: string): PlannerBuildResultV1 {
  return {
    plan: {
      metadata: {
        planId,
        planVersion: '1.0',
        schemaVersion: 'v1.2',
        contractVersion: '1.0.0',
        inputHashSha256: '1'.repeat(64),
        createdAtIso: NOW,
      },
      steps: [{ stepId: `${planId}.step`, kind: 'DBT_MODEL', dependsOn: [] }],
    },
    canonicalPlanJson: JSON.stringify({
      metadata: {
        planId,
        planVersion: '1.0',
        schemaVersion: 'v1.2',
        contractVersion: '1.0.0',
        inputHashSha256: '1'.repeat(64),
        createdAtIso: NOW,
      },
      steps: [{ stepId: `${planId}.step`, kind: 'DBT_MODEL', dependsOn: [] }],
    }),
  };
}

export function toCanonicalPlanId(seed: string): string {
  return createHash('sha256').update(seed).digest('hex');
}

export function makeRejection(planId: string): {
  status: 'ERROR';
  planId: string;
  adapterId: 'mock';
  code: 'REJECTED';
  degradable: false;
  reason: string;
} {
  return {
    status: 'ERROR' as const,
    planId,
    adapterId: 'mock',
    code: 'REJECTED' as const,
    degradable: false,
    reason: 'invalid transition test',
  };
}
