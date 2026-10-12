/**
 * @ownedConcern PostgreSQL intent row mapping and transaction-scoped acquisition fence.
 * @baseline ADR-0030: Pre-dispatch intent ownership
 * @baseline ADR-0031: Tenant-isolated storage
 * @decision Lock the intent row on the caller's transaction without exposing its stored token.
 * @consequence Canonical writes and intent transitions share the same ownership boundary.
 * @version 1.0.0
 */
import type { StartRunIntent, StartRunIntentClaimReceipt, StartRunIntentRef } from '@dvt/engine';
import type { PoolClient } from 'pg';

import { quoteIdentifier } from './sqlUtils.js';

export const INTENT_SELECT_COLUMNS =
  'intent_id, tenant_id, run_id, provider, status, provider_outcome, compensation, reconciliation, created_at, updated_at, revision';

export interface StartRunIntentRow {
  intent_id: string;
  tenant_id: string;
  run_id: string;
  provider: StartRunIntent['provider'];
  status: StartRunIntent['status'];
  provider_outcome: StartRunIntent['providerOutcome'];
  compensation: StartRunIntent['compensation'];
  reconciliation: StartRunIntent['reconciliation'];
  created_at: Date | string;
  updated_at: Date | string;
  revision: number;
}

export function toStartRunIntent(row: StartRunIntentRow): StartRunIntent {
  return {
    intentId: row.intent_id,
    tenantId: row.tenant_id,
    runId: row.run_id,
    provider: row.provider,
    status: row.status,
    revision: row.revision,
    createdAt: iso(row.created_at),
    updatedAt: iso(row.updated_at),
    providerOutcome: row.provider_outcome,
    compensation: row.compensation,
    reconciliation: row.reconciliation,
  };
}

export async function readStartRunIntent(
  client: PoolClient,
  schema: string,
  ref: StartRunIntentRef
): Promise<StartRunIntent | null> {
  const result = await client.query<StartRunIntentRow>(
    `SELECT ${INTENT_SELECT_COLUMNS} FROM ${quoteIdentifier(schema)}.start_run_intents WHERE tenant_id = $1 AND intent_id = $2`,
    [ref.tenantId, ref.intentId]
  );
  return result.rows[0] ? toStartRunIntent(result.rows[0]) : null;
}

export type LockedStartRunIntent =
  { kind: 'owned'; intent: StartRunIntent } | { kind: 'missing' | 'not_owner' };

/** Caller MUST keep this transaction open until its protected write commits. */
export async function lockStartRunIntent(
  client: PoolClient,
  schema: string,
  receipt: StartRunIntentClaimReceipt
): Promise<LockedStartRunIntent> {
  const result = await client.query<StartRunIntentRow & { owned: boolean }>(
    `SELECT ${INTENT_SELECT_COLUMNS}, (claim_token::text = $3 AND run_id = $4) AS owned
       FROM ${quoteIdentifier(schema)}.start_run_intents
      WHERE tenant_id = $1 AND intent_id = $2 FOR UPDATE`,
    [receipt.tenantId, receipt.intentId, receipt.token, receipt.runId]
  );
  const row = result.rows[0];
  if (!row) return { kind: 'missing' };
  if (!row.owned) return { kind: 'not_owner' };
  return { kind: 'owned', intent: toStartRunIntent(row) };
}

function iso(timestamp: Date | string): string {
  return timestamp instanceof Date ? timestamp.toISOString() : new Date(timestamp).toISOString();
}
