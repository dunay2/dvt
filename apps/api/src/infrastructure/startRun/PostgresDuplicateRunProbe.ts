import type { Pool } from 'pg';

import type { DuplicateRunProbe, DuplicateRunProbeResult } from '../../application/ports/DuplicateRunProbe.js';

interface DuplicateMatchRow {
  kind: DuplicateRunProbeResult['kind'];
  run_id: string;
}

function quoteIdentifier(value: string): string {
  return `"${value.replaceAll('"', '""')}"`;
}

export class PostgresDuplicateRunProbe implements DuplicateRunProbe {
  public constructor(
    private readonly deps: {
      readonly pool: Pool;
      readonly schema: string;
      readonly queryTimeoutMs?: number;
    }
  ) {}

  public async findExisting(tenantId: string, runId: string): Promise<DuplicateRunProbeResult> {
    const result = await this.deps.pool.query<DuplicateMatchRow>({
      text: `
        WITH persisted_run AS (
          SELECT 'found_run'::text AS kind, run_id, 1 AS priority
          FROM ${quoteIdentifier(this.deps.schema)}.run_metadata
          WHERE tenant_id = $1
            AND run_id = $2
          LIMIT 1
        ),
        active_intent AS (
          SELECT 'found_intent'::text AS kind, run_id, 2 AS priority
          FROM ${quoteIdentifier(this.deps.schema)}.start_run_intents
          WHERE tenant_id = $1
            AND run_id = $2
            AND status IN ('PENDING', 'DISPATCHED')
          LIMIT 1
        )
        SELECT kind, run_id
        FROM (
          SELECT * FROM persisted_run
          UNION ALL
          SELECT * FROM active_intent
        ) matches
        ORDER BY priority ASC
        LIMIT 1
      `,
      values: [tenantId, runId],
      ...(this.deps.queryTimeoutMs && this.deps.queryTimeoutMs > 0
        ? { signal: AbortSignal.timeout(this.deps.queryTimeoutMs) }
        : {}),
    });

    const row = result.rows[0];
    if (!row) {
      return { kind: 'not_found' };
    }

    return row.kind === 'found_run'
      ? { kind: 'found_run', runId: row.run_id }
      : { kind: 'found_intent', runId: row.run_id };
  }
}
