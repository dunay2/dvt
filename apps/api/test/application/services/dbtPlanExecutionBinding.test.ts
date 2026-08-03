import { asSha256HexString, type ExecutionPlan, type GitArtifactRef } from '@dvt/contracts';
import { describe, expect, it } from 'vitest';

import { resolveDbtPlanExecutionBinding } from '../../../src/application/services/dbtPlanExecutionBinding.js';

const TARGET = {
  provider: 'temporal',
  adapter: 'postgres',
  targetName: 'production',
  credentialRef: 'vault:dbt/production',
} as const;

describe('resolveDbtPlanExecutionBinding', () => {
  it('binds a file-backed plan to its exact project root, revision, and target profile', () => {
    expect(
      resolveDbtPlanExecutionBinding({
        plan: buildPlan(DBT_PROVENANCE),
        targetAdapter: 'temporal',
        executionTarget: TARGET,
      })
    ).toEqual({
      ok: true,
      projectRoot: 'analytics',
      expectedContentSetSha256: '1'.repeat(64),
      targetProfile: 'production',
      credentialRef: 'vault:dbt/production',
    });
  });

  it('rejects a persisted preview when the server-owned target has changed', () => {
    expect(
      resolveDbtPlanExecutionBinding({
        plan: buildPlan(DBT_PROVENANCE),
        targetAdapter: 'temporal',
        executionTarget: { ...TARGET, targetName: 'staging' },
      })
    ).toEqual({
      ok: false,
      reason: 'The configured DBT execution target changed after Preview. Run Preview again.',
    });
  });

  it('rejects non-DBT provenance attached to a DBT execution plan', () => {
    expect(
      resolveDbtPlanExecutionBinding({
        plan: buildPlan({
          kind: 'transformation-git-artifacts',
          graphArtifact: gitRef('graph.yml', '2'),
          sqlArtifact: gitRef('model.sql', '3'),
        }),
        targetAdapter: 'temporal',
        executionTarget: TARGET,
      })
    ).toEqual({
      ok: false,
      reason: 'The persisted plan provenance does not describe a DBT project.',
    });
  });

  it('keeps graph-authored DBT plans on the explicit workspace-root binding', () => {
    expect(
      resolveDbtPlanExecutionBinding({
        plan: buildPlan(undefined),
        targetAdapter: 'temporal',
        executionTarget: TARGET,
      })
    ).toEqual({
      ok: true,
      projectRoot: '.',
      targetProfile: 'production',
      credentialRef: 'vault:dbt/production',
    });
  });
});

const DBT_PROVENANCE = {
  kind: 'dbt-project-files',
  canvasId: 'analytics-canvas',
  projectRoot: 'analytics',
  contentSetSha256: '1'.repeat(64),
  analysisSha256: '2'.repeat(64),
  dbtVersion: '1.10.0',
  selectedUniqueIds: ['model.analytics.orders'],
  executionTarget: TARGET,
} as const;

function buildPlan(provenance: unknown): ExecutionPlan {
  return {
    metadata: {
      planId: 'a'.repeat(64),
      planVersion: '1.0',
      schemaVersion: '1.0',
      contractVersion: '1.0.0',
      inputHashSha256: 'b'.repeat(64),
      createdAtIso: '2026-07-15T00:00:00.000Z',
    },
    steps: [],
    ...(provenance === undefined
      ? {}
      : { observability: { extra: { planPreviewProvenance: provenance } } }),
  };
}

function gitRef(path: string, hashDigit: string): GitArtifactRef {
  return {
    repo: 'org/repo',
    path,
    ref: 'refs/heads/main',
    commitSha: hashDigit.repeat(40),
    contentSha256: asSha256HexString(hashDigit.repeat(64)),
  };
}
