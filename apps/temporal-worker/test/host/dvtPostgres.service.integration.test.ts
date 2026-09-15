import { describe, expect, it } from 'vitest';

import { executeDvtPostgresServiceVertical } from '../support/dvtPostgresServiceFixture.js';

const describeIfPg = process.env['DVT_PG_INTEGRATION'] === '1' ? describe : describe.skip;

describeIfPg('DVT PostgreSQL worker vertical', () => {
  it('executes immutable SQL through Temporal and publishes authoritative evidence', async () => {
    const result = await executeDvtPostgresServiceVertical();

    expect(result.rows).toEqual([{ order_id: '7', status: 'ready' }]);
    expect(result.evidence).toMatchObject({
      evidenceType: 'dvt-postgres-publication',
      target: { connectionRef: { connectionId: 'warehouse-a' } },
      publication: { predecessorToken: null, outcome: 'created' },
      rowsWritten: 1,
    });
  }, 120_000);
});
