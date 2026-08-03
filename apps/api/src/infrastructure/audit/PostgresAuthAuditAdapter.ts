/**
 * @ownedConcern Persist and query tenant-scoped authorization decisions as append-only evidence.
 */
import { createHash } from 'node:crypto';

import type { Pool, PoolClient } from 'pg';

import type { AuthAuditEvent, IAuthAuditPort } from '../../application/ports/auth.js';

const ALLOWED_EVENT_FIELDS = new Set([
  'eventType',
  'requestId',
  'principalId',
  'principalType',
  'tenantId',
  'action',
  'denialReason',
  'occurredAt',
]);
const UNSCOPED_TENANT = '__unscoped__';

type AuditPool = Pick<Pool, 'connect' | 'query'>;

interface AuthAuditRow {
  event_type: AuthAuditEvent['eventType'];
  request_id: string;
  principal_id: string;
  principal_type: AuthAuditEvent['principalType'];
  tenant_id: string | null;
  action: string;
  denial_reason: string | null;
  occurred_at: Date;
}

export class CompositeAuthAuditPort implements IAuthAuditPort {
  public constructor(private readonly delegates: readonly IAuthAuditPort[]) {}

  public async record(event: AuthAuditEvent): Promise<void> {
    for (const delegate of this.delegates) {
      await delegate.record(event);
    }
  }
}

export class PostgresAuthAuditAdapter implements IAuthAuditPort {
  private readonly schema: string;
  private readonly table: string;

  public constructor(
    private readonly pool: AuditPool,
    schema = 'dvt'
  ) {
    this.schema = quoteIdentifier(schema);
    this.table = `${this.schema}.auth_audit_events`;
  }

  public async ensureSchema(): Promise<void> {
    await this.pool.query(`CREATE SCHEMA IF NOT EXISTS ${this.schema}`);
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS ${this.table} (
        event_id      TEXT        PRIMARY KEY,
        event_type    TEXT        NOT NULL CHECK (event_type IN ('AUTH_GRANTED', 'AUTH_DENIED')),
        request_id    TEXT        NOT NULL,
        principal_id  TEXT        NOT NULL,
        principal_type TEXT       NOT NULL CHECK (principal_type IN ('user', 'service')),
        tenant_id     TEXT,
        action        TEXT        NOT NULL,
        denial_reason TEXT,
        occurred_at   TIMESTAMPTZ NOT NULL,
        recorded_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await this.pool.query(`ALTER TABLE ${this.table} ENABLE ROW LEVEL SECURITY`);
    await this.pool.query(`ALTER TABLE ${this.table} FORCE ROW LEVEL SECURITY`);
    await this.pool.query(`DROP POLICY IF EXISTS auth_audit_tenant_insert ON ${this.table}`);
    await this.pool.query(`
      CREATE POLICY auth_audit_tenant_insert ON ${this.table}
      FOR INSERT
      WITH CHECK (
        COALESCE(tenant_id, '${UNSCOPED_TENANT}') = current_setting('dvt.tenant_id', true)
      )
    `);
    await this.pool.query(`DROP POLICY IF EXISTS auth_audit_tenant_select ON ${this.table}`);
    await this.pool.query(`
      CREATE POLICY auth_audit_tenant_select ON ${this.table}
      FOR SELECT
      USING (tenant_id = current_setting('dvt.tenant_id', true))
    `);
    await this.pool.query(`
      CREATE OR REPLACE FUNCTION ${this.schema}.reject_auth_audit_mutation()
      RETURNS TRIGGER AS $$
      BEGIN
        RAISE EXCEPTION 'AUTH_AUDIT_APPEND_ONLY' USING ERRCODE = '55000';
      END;
      $$ LANGUAGE plpgsql
    `);
    await this.pool.query(`DROP TRIGGER IF EXISTS reject_auth_audit_mutation ON ${this.table}`);
    await this.pool.query(`
      CREATE TRIGGER reject_auth_audit_mutation
      BEFORE UPDATE OR DELETE ON ${this.table}
      FOR EACH ROW EXECUTE FUNCTION ${this.schema}.reject_auth_audit_mutation()
    `);
    await this.pool.query(`REVOKE UPDATE, DELETE ON ${this.table} FROM PUBLIC`);
  }

  public async record(event: AuthAuditEvent): Promise<void> {
    assertAllowedFields(event);
    const client = await this.pool.connect();
    try {
      await inTenantTransaction(client, event.tenantId ?? UNSCOPED_TENANT, async () => {
        await client.query(
          `
            INSERT INTO ${this.table} (
              event_id,
              event_type,
              request_id,
              principal_id,
              principal_type,
              tenant_id,
              action,
              denial_reason,
              occurred_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            ON CONFLICT (event_id) DO NOTHING
          `,
          [
            buildEventId(event),
            event.eventType,
            event.requestId,
            event.principalId,
            event.principalType,
            event.tenantId ?? null,
            event.action,
            event.denialReason ?? null,
            event.occurredAt,
          ]
        );
      });
    } finally {
      client.release();
    }
  }

  public async listForTenant(
    tenantId: string,
    requestId?: string
  ): Promise<readonly AuthAuditEvent[]> {
    const client = await this.pool.connect();
    try {
      return await inTenantTransaction(client, tenantId, async () => {
        const result = await client.query<AuthAuditRow>(
          `
            SELECT event_type, request_id, principal_id, principal_type,
                   tenant_id, action, denial_reason, occurred_at
            FROM ${this.table}
            WHERE tenant_id = $1
              AND ($2::TEXT IS NULL OR request_id = $2)
            ORDER BY occurred_at, event_id
          `,
          [tenantId, requestId ?? null]
        );
        return result.rows.map(toAuthAuditEvent);
      });
    } finally {
      client.release();
    }
  }
}

async function inTenantTransaction<T>(
  client: PoolClient,
  tenantId: string,
  work: () => Promise<T>
): Promise<T> {
  await client.query('BEGIN');
  try {
    await client.query(`SELECT set_config('dvt.tenant_id', $1, true)`, [tenantId]);
    const result = await work();
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  }
}

function assertAllowedFields(event: AuthAuditEvent): void {
  if (Object.keys(event).some((field) => !ALLOWED_EVENT_FIELDS.has(field))) {
    throw new Error('AUTH_AUDIT_EVENT_FIELDS_REJECTED');
  }
}

function buildEventId(event: AuthAuditEvent): string {
  return createHash('sha256')
    .update(
      [
        event.eventType,
        event.requestId,
        event.principalId,
        event.principalType,
        event.tenantId ?? '',
        event.action,
        event.denialReason ?? '',
      ].join('\0')
    )
    .digest('hex');
}

function toAuthAuditEvent(row: AuthAuditRow): AuthAuditEvent {
  return {
    eventType: row.event_type,
    requestId: row.request_id,
    principalId: row.principal_id,
    principalType: row.principal_type,
    ...(row.tenant_id === null ? {} : { tenantId: row.tenant_id }),
    action: row.action,
    ...(row.denial_reason === null ? {} : { denialReason: row.denial_reason }),
    occurredAt: row.occurred_at,
  };
}

function quoteIdentifier(value: string): string {
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(value)) {
    throw new Error('Invalid PostgreSQL identifier');
  }
  return `"${value}"`;
}
