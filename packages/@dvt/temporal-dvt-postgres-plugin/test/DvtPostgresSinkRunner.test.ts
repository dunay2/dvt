import { TextEncoder } from 'node:util';

import { jcsCanonicalize, sha256HexUtf8 } from '@dvt/crypto';
import { describe, expect, it, vi } from 'vitest';

import { DvtPostgresPluginRunner, DvtPostgresStepActivity } from '../src/index.js';

import {
  SHA,
  buildDvtSinkWorkload,
  buildRunExecutionContext,
  buildStep,
  buildStepContext,
} from './dvtPostgresPluginFixture.js';

describe('Explicit Sink activity and publication', () => {
  it('publishes only the Sink and binds its evidence to the exact workload', async () => {
    const workload = buildDvtSinkWorkload();
    const publish = vi.fn(async () => ({
      targetSchema: 'analytics',
      targetRelation: 'explicit_sink',
      rowsWritten: 3,
      publicationToken: SHA.publication,
      predecessorToken: SHA.predecessor,
      publicationOutcome: 'created' as const,
    }));
    const close = vi.fn(async () => undefined);
    const activity = new DvtPostgresStepActivity({
      runExecutionContextReader: { resolve: vi.fn(async () => buildRunExecutionContext()) },
      runner: new DvtPostgresPluginRunner({
        credentialResolver: { resolveCredential: vi.fn(async () => 'postgresql://runtime') },
        sqlArtifactReader: { read: vi.fn(async () => new TextEncoder().encode('select 1')) },
        publicationCapabilityFactory: () => ({ publish, close }),
      }),
    });
    const result = await activity.execute(
      { ...buildStep(workload), stepId: 'sink-a' },
      buildStepContext()
    );
    expect(publish).toHaveBeenCalledOnce();
    expect(publish).toHaveBeenCalledWith(
      expect.objectContaining({
        target: workload.publicationBoundaries[0]!.target,
        expectedSchemaDigestSha256: SHA.schema,
      })
    );
    expect(close).toHaveBeenCalledOnce();
    expect(result).toMatchObject({
      stepId: 'sink-a',
      status: 'COMPLETED',
      resultEvidence: {
        target: { schema: 'analytics', relation: 'explicit_sink' },
        workloadSha256: sha256HexUtf8(jcsCanonicalize(workload)),
        rowsWritten: 3,
      },
    });
  });

  it.each(['missing boundary', 'foreign connection', 'duplicate boundary'] as const)(
    'rejects %s before reading context or calling the runner',
    async (scenario) => {
      const workload = buildDvtSinkWorkload();
      const resolve = vi.fn();
      const execute = vi.fn();
      const boundary = workload.publicationBoundaries[0]!;
      const invalid = {
        ...workload,
        publicationBoundaries:
          scenario === 'missing boundary'
            ? []
            : scenario === 'duplicate boundary'
              ? [boundary, boundary]
              : [
                  {
                    ...boundary,
                    target: {
                      ...boundary.target,
                      connectionRef: { ...boundary.target.connectionRef, connectionId: 'foreign' },
                    },
                  },
                ],
      };
      const activity = new DvtPostgresStepActivity({
        runExecutionContextReader: { resolve },
        runner: { execute },
      });
      await expect(
        activity.execute({ ...buildStep(invalid), stepId: 'sink-a' }, buildStepContext())
      ).rejects.toMatchObject({ nonRetryable: true });
      expect(resolve).not.toHaveBeenCalled();
      expect(execute).not.toHaveBeenCalled();
    }
  );
});
