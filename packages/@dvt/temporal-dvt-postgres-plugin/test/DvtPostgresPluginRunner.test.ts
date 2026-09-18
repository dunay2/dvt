import { TextEncoder } from 'node:util';

import { PostgresDvtPublicationRejectedError } from '@dvt/adapter-postgres';
import { ArtifactReadError } from '@dvt/artifacts';
import { describe, expect, it, vi } from 'vitest';

import {
  DvtPostgresExecutionRejectedError,
  DvtPostgresPluginRunner,
  type DvtPostgresPluginExecutionInput,
} from '../src/index.js';

import {
  SHA,
  buildDvtWorkload,
  buildRunExecutionContext,
  buildStep,
  buildStepContext,
} from './dvtPostgresPluginFixture.js';

describe('DvtPostgresPluginRunner', () => {
  it('publishes verified SQL and returns authoritative PostgreSQL evidence', async () => {
    const close = vi.fn(async () => undefined);
    const publish = vi.fn(async () => ({
      targetSchema: 'analytics',
      targetRelation: 'orders_result',
      rowsWritten: 2,
      publicationToken: SHA.publication,
      predecessorToken: SHA.predecessor,
      publicationOutcome: 'replaced' as const,
    }));
    const resolveCredential = vi.fn(async () => 'postgresql://runtime');
    const runner = new DvtPostgresPluginRunner({
      credentialResolver: { resolveCredential },
      sqlArtifactReader: { read: vi.fn(async () => new TextEncoder().encode('select 1')) },
      publicationCapabilityFactory: () => ({ publish, close }),
      now: vi
        .fn()
        .mockReturnValueOnce(new Date('2026-09-15T12:00:00.000Z'))
        .mockReturnValueOnce(new Date('2026-09-15T12:00:00.025Z')),
    });

    const input = buildExecutionInput();
    const result = await runner.execute(input);

    expect(resolveCredential).toHaveBeenCalledWith('env:DVT_POSTGRES_URL');
    expect(publish).toHaveBeenCalledWith({
      sql: 'select 1',
      target: input.config.output.target,
      expectedSchemaDigestSha256: SHA.schema,
      publicationToken: SHA.publication,
      expectedPredecessorToken: SHA.predecessor,
    });
    expect(close).toHaveBeenCalledOnce();
    expect(result).toMatchObject({
      stepId: 'transform-a',
      status: 'COMPLETED',
      resultEvidence: {
        evidenceType: 'dvt-postgres-publication',
        plan: { planId: 'plan-a', planVersion: '1.0.0', sha256: SHA.plan },
        semanticPlanSha256: SHA.semantic,
        target: { schema: 'analytics', relation: 'orders_result' },
        publication: {
          token: SHA.publication,
          predecessorToken: SHA.predecessor,
          outcome: 'replaced',
        },
        rowsWritten: 2,
        durationMs: 25,
      },
    });
  });

  it('rejects an invalid SQL artifact before resolving credentials', async () => {
    const resolveCredential = vi.fn();
    const runner = new DvtPostgresPluginRunner({
      credentialResolver: { resolveCredential },
      sqlArtifactReader: {
        read: vi.fn(async () => {
          throw new ArtifactReadError('ARTIFACT_INTEGRITY_MISMATCH', 'mismatch');
        }),
      },
    });

    await expect(runner.execute(buildExecutionInput())).rejects.toEqual(
      new DvtPostgresExecutionRejectedError('DVT_SQL_ARTIFACT_INVALID')
    );
    expect(resolveCredential).not.toHaveBeenCalled();
  });

  it('maps publication fencing rejections to a permanent plugin reason', async () => {
    const close = vi.fn(async () => undefined);
    const runner = new DvtPostgresPluginRunner({
      credentialResolver: { resolveCredential: vi.fn(async () => 'postgresql://runtime') },
      sqlArtifactReader: { read: vi.fn(async () => new TextEncoder().encode('select 1')) },
      publicationCapabilityFactory: () => ({
        publish: vi.fn(async () => {
          throw new PostgresDvtPublicationRejectedError('STALE_PUBLICATION');
        }),
        close,
      }),
    });

    await expect(runner.execute(buildExecutionInput())).rejects.toEqual(
      new DvtPostgresExecutionRejectedError('STALE_PUBLICATION')
    );
    expect(close).toHaveBeenCalledOnce();
  });

  it('reports cleanup failure without rewriting a successful publication', async () => {
    const onCleanupFailure = vi.fn();
    const runner = new DvtPostgresPluginRunner({
      credentialResolver: { resolveCredential: vi.fn(async () => 'postgresql://runtime') },
      sqlArtifactReader: { read: vi.fn(async () => new TextEncoder().encode('select 1')) },
      publicationCapabilityFactory: () => ({
        publish: vi.fn(async () => ({
          targetSchema: 'analytics',
          targetRelation: 'orders_result',
          rowsWritten: 1,
          publicationToken: SHA.publication,
          predecessorToken: SHA.predecessor,
          publicationOutcome: 'replaced',
        })),
        close: vi.fn(async () => {
          throw new Error('close failed');
        }),
      }),
      onCleanupFailure,
    });

    await expect(runner.execute(buildExecutionInput())).resolves.toMatchObject({
      status: 'COMPLETED',
    });
    expect(onCleanupFailure).toHaveBeenCalledOnce();
  });
});

function buildExecutionInput(): DvtPostgresPluginExecutionInput {
  const context = buildStepContext();
  const runExecutionContext = buildRunExecutionContext();
  return {
    step: buildStep(),
    config: buildDvtWorkload(),
    executionIdentity: context.executionIdentity,
    runContext: context.runContext,
    runExecutionContext,
    pluginContext: runExecutionContext.pluginContexts['dvt-postgres'],
  };
}
