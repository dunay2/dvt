import { describe, expect, it } from 'vitest';

import { withObjectFilePostgresServiceFixture } from '../support/objectFilePostgresServiceFixture.js';

const describeIfServices =
  process.env['DVT_HET1_SERVICE_INTEGRATION'] === '1' ? describe : describe.skip;

describeIfServices('object-file PostgreSQL worker vertical', () => {
  it('reads a content-addressed MinIO object and replaces PostgreSQL rows idempotently', async () => {
    await withObjectFilePostgresServiceFixture(async (fixture) => {
      await expect(fixture.execute('created')).resolves.toMatchObject({
        executor: 'postgres',
        sinkTable: `${fixture.targetSchema}.${fixture.relation}`,
        rowsWritten: 2,
        publicationOutcome: 'created',
        sourceArtifact: {
          sha256: fixture.sha256,
          sizeBytes: fixture.sizeBytes,
          mediaType: 'text/csv',
        },
      });

      await expect(fixture.execute('replaced')).resolves.toMatchObject({
        rowsWritten: 2,
        publicationOutcome: 'replaced',
      });

      await expect(fixture.readRows()).resolves.toEqual([
        { order_id: '1', amount: '10.25', active: true },
        { order_id: '2', amount: null, active: false },
      ]);
    });
  }, 120_000);
});
