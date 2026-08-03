import { randomUUID } from 'node:crypto';
import process from 'node:process';

import { Pool } from 'pg';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import type { AuthAuditEvent, IAuthAuditPort } from '../../../src/application/ports/auth.js';
import {
  CompositeAuthAuditPort,
  PostgresAuthAuditAdapter,
} from '../../../src/infrastructure/audit/PostgresAuthAuditAdapter.js';

const EVENT: AuthAuditEvent = {
  eventType: 'AUTH_GRANTED',
  requestId: 'request-1',
  principalId: 'user-1',
  principalType: 'user',
  tenantId: 'tenant-a',
  action: 'run:start',
  occurredAt: new Date('2026-08-03T08:00:00.000Z'),
};

describe('PostgresAuthAuditAdapter schema contract', () => {
  it('creates tenant-scoped append-only storage without a mutation API', async () => {
    const query = vi.fn(async (_statement: string) => ({ rows: [], rowCount: 0 }));
    const adapter = new PostgresAuthAuditAdapter({ query } as never, 'audit');

    await adapter.ensureSchema();

    const sql = query.mock.calls.map(([statement]) => String(statement)).join('\n');
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS "audit".auth_audit_events');
    expect(sql).toContain('ENABLE ROW LEVEL SECURITY');
    expect(sql).toContain('FORCE ROW LEVEL SECURITY');
    expect(sql).toContain('FOR INSERT');
    expect(sql).toContain('FOR SELECT');
    expect(sql).toContain('reject_auth_audit_mutation');
    expect(sql).toContain('BEFORE UPDATE OR DELETE');
  });

  it('rejects fields outside the audit allowlist before touching storage', async () => {
    const connect = vi.fn();
    const adapter = new PostgresAuthAuditAdapter({ connect } as never, 'audit');

    await expect(
      adapter.record({ ...EVENT, secret: 'plaintext-secret' } as AuthAuditEvent)
    ).rejects.toThrow('AUTH_AUDIT_EVENT_FIELDS_REJECTED');
    expect(connect).not.toHaveBeenCalled();
  });

  it('persists before emitting the operational log', async () => {
    const order: string[] = [];
    const durable: IAuthAuditPort = { record: vi.fn(async () => void order.push('durable')) };
    const operational: IAuthAuditPort = {
      record: vi.fn(async () => void order.push('operational')),
    };

    await new CompositeAuthAuditPort([durable, operational]).record(EVENT);

    expect(order).toEqual(['durable', 'operational']);
  });
});

const databaseUrl = process.env['DVT_PG_URL'] ?? process.env['DATABASE_URL'];
const describeWithPostgres = databaseUrl ? describe : describe.skip;
const schema = `it_auth_audit_${randomUUID().replaceAll('-', '')}`;
const pool = databaseUrl ? new Pool({ connectionString: databaseUrl }) : null;
const adapter = pool ? new PostgresAuthAuditAdapter(pool, schema) : null;

describeWithPostgres('PostgresAuthAuditAdapter persistence', () => {
  beforeAll(async () => {
    await adapter!.ensureSchema();
  });

  afterAll(async () => {
    await pool!.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
    await pool!.end();
  });

  it('deduplicates one decision identity and scopes operator reads by tenant', async () => {
    await adapter!.record(EVENT);
    await adapter!.record({ ...EVENT, occurredAt: new Date('2026-08-03T08:00:01.000Z') });

    await expect(adapter!.listForTenant('tenant-a', 'request-1')).resolves.toHaveLength(1);
    await expect(adapter!.listForTenant('tenant-b', 'request-1')).resolves.toEqual([]);
  });

  it.each(['UPDATE', 'DELETE'])('rejects committed-row %s operations', async (operation) => {
    await expect(
      pool!.query(
        operation === 'UPDATE'
          ? `UPDATE "${schema}".auth_audit_events SET action = 'other'`
          : `DELETE FROM "${schema}".auth_audit_events`
      )
    ).rejects.toThrow(/AUTH_AUDIT_APPEND_ONLY/);
  });
});
