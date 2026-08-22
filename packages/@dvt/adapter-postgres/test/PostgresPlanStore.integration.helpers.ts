import { createHash } from 'node:crypto';

import { type PlanStoreScope, type PlannerBuildResultV1 } from '@dvt/contracts';
import { jcsCanonicalize } from '@dvt/crypto';
import { Client } from 'pg';
import { describe } from 'vitest';

import { PostgresPlanStore } from '../src/index.js';
import { quoteIdentifier } from '../src/sqlUtils.js';

export const NOW = '2026-03-21T00:00:00.000Z';
export const describeIfPg = process.env.DVT_PG_INTEGRATION === '1' ? describe : describe.skip;
export const PLAN_STORE_SCOPE = {
  tenantId: 'tenant-a',
  projectId: 'analytics',
  environmentId: 'prod',
} as const satisfies PlanStoreScope;

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
      schemaVersion: '1.0',
      text: JSON.stringify({
        metadata: {
          planId: buildResult.plan.metadata.planId,
          planVersion: buildResult.plan.metadata.planVersion,
          schemaVersion: '1.0',
          contractVersion: '1.0.0',
          inputHashSha256: buildResult.plan.metadata.inputHashSha256,
          ownership: buildResult.plan.metadata.ownership,
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
  const steps = [{ stepId: `${planId}.step`, kind: 'DBT_MODEL', dependsOn: [] }];
  const plan: PlannerBuildResultV1['plan'] = {
    metadata: {
      planId,
      planVersion: '1.0',
      schemaVersion: '1.0',
      contractVersion: '1.0.0',
      inputHashSha256: '1'.repeat(64),
      createdAtIso: NOW,
      ownership: PLAN_STORE_SCOPE,
    },
    steps,
  };

  return {
    plan,
    executionPolicy: {},
    canonicalPlanCoreJson: jcsCanonicalize({
      metadata: {
        planVersion: plan.metadata.planVersion,
        inputHashSha256: plan.metadata.inputHashSha256,
      },
      steps,
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
