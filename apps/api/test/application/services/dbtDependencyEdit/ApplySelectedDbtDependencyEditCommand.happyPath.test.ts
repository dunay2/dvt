import { describe, expect, it } from 'vitest';

import { DbtDependencyEditReceiptInvalidError } from '../../../../src/application/ports/dbtDependencyEdit.js';

import {
  AUTHORITY,
  createHarness,
  request,
  sha,
} from './ApplySelectedDbtDependencyEditCommand.test.fixtures.js';

describe('ApplySelectedDbtDependencyEditCommand happy path', () => {
  it('validates then atomically writes only the proven semantic patch', async () => {
    const harness = createHarness();

    const result = await harness.command.apply(request(harness));

    expect(result).toEqual({
      schemaVersion: 'dbt-dependency-edit-result.v1',
      kind: 'applied',
      receipt: expect.objectContaining({
        canvasId: AUTHORITY.canvasId,
        previousTargetUniqueId: 'source.analytics.raw.orders',
        nextTargetUniqueId: 'source.analytics.raw.customers',
        expectedContentSha256: sha("-- keep\nselect * from {{ source('raw', 'orders') }}\n"),
        appliedContentSha256: sha("-- keep\nselect * from {{ source('raw', 'customers') }}\n"),
        previousProjectContentSetSha256: harness.current.projectRevision.contentSetSha256,
        projectContentSetSha256: harness.candidate.projectRevision.contentSetSha256,
        analysisSha256: harness.candidate.analysisSha256,
      }),
    });
    expect(harness.analyzeCandidate).toHaveBeenCalledWith(
      expect.objectContaining({
        expectedFiles: harness.current.semanticEvidence.files,
        candidate: expect.objectContaining({ path: 'models/orders.sql' }),
      })
    );
    expect(harness.publish).toHaveBeenCalledTimes(1);
    expect(harness.publish).toHaveBeenCalledWith(
      request(harness).scope,
      expect.objectContaining({
        projectRoot: 'analytics',
        expectedProjectContentSetSha256: harness.current.projectRevision.contentSetSha256,
        expectedFiles: [
          {
            path: 'dbt_project.yml',
            revisionSha256: sha('config'),
            byteLength: 6,
            kind: 'project_config',
          },
          expect.objectContaining({ path: 'models/orders.sql' }),
          expect.objectContaining({ path: 'models/sources.yml' }),
        ],
        write: {
          path: 'analytics/models/orders.sql',
          expectedContentSha256: sha("-- keep\nselect * from {{ source('raw', 'orders') }}\n"),
          content: "-- keep\nselect * from {{ source('raw', 'customers') }}\n",
        },
        receipt: expect.objectContaining({
          appliedContentSha256: sha("-- keep\nselect * from {{ source('raw', 'customers') }}\n"),
          deduplicated: false,
        }),
      })
    );
  });

  it('replays the immutable receipt without another analysis or write', async () => {
    const harness = createHarness();
    await harness.command.apply(request(harness));

    const replay = await harness.command.apply(request(harness));

    expect(replay).toEqual(
      expect.objectContaining({
        kind: 'applied',
        receipt: expect.objectContaining({ deduplicated: true }),
      })
    );
    expect(harness.analyzeCandidate).toHaveBeenCalledTimes(1);
    expect(harness.publish).toHaveBeenCalledTimes(1);
  });

  it('rejects reuse of one idempotency key for a different semantic edit', async () => {
    const harness = createHarness();
    const input = request(harness);
    await harness.command.apply(input);

    await expect(
      harness.command.apply({
        ...input,
        nextTargetUniqueId: 'source.analytics.raw.orders',
      })
    ).rejects.toBeInstanceOf(DbtDependencyEditReceiptInvalidError);

    expect(harness.analyzeCandidate).toHaveBeenCalledTimes(1);
    expect(harness.publish).toHaveBeenCalledTimes(1);
  });

  it('returns a no-op without candidate analysis or persistence', async () => {
    const harness = createHarness();
    const input = request(harness);

    const result = await harness.command.apply({
      ...input,
      nextTargetUniqueId: input.expectedTargetUniqueId,
    });

    expect(result).toEqual(
      expect.objectContaining({
        kind: 'no_change',
        targetUniqueId: input.expectedTargetUniqueId,
        selectedAnalysisSha256: harness.selected.selectedAnalysisSha256,
      })
    );
    expect(harness.analyzeCandidate).not.toHaveBeenCalled();
    expect(harness.publish).not.toHaveBeenCalled();
  });
});
