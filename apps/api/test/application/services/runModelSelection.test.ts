/** Prove navigation is bound to the scoped plan and its model steps. */
import type { ExecutionPlan } from '@dvt/contracts';
import { describe, expect, it } from 'vitest';

import { projectRunModelSelection } from '../../../src/application/services/runModelSelection.js';

const scope = { tenantId: 'tenant', projectId: 'project', environmentId: 'dev' };
const model = 'model.demo.orders';
const selectedUniqueIds = [model, 'model.demo.sales'];
const provenance = {
  kind: 'dbt-project-files',
  canvasId: 'analytics',
  projectRoot: 'analytics',
  selectedUniqueIds,
  contentSetSha256: 'a'.repeat(64),
  analysisSha256: 'b'.repeat(64),
  dbtVersion: '1.10.0',
  executionTarget: {
    provider: 'temporal',
    adapter: 'postgres',
    targetName: 'dev',
    connectionRef: { schemaVersion: 'connection-ref.v1', connectionId: 'db', provider: 'postgres' },
    resolutionSource: 'environment-default',
    credentialRef: 'vault:dbt/dev',
  },
};
const plan: ExecutionPlan = {
  metadata: {
    planId: '1'.repeat(64),
    inputHashSha256: '0'.repeat(64),
    createdAtIso: '2026-10-10T00:00:00Z',
    schemaVersion: '1.0',
    contractVersion: '1.0.0',
    planVersion: '1.0',
    ownership: scope,
  },
  steps: [
    { stepId: model, kind: 'DBT_MODEL', dependsOn: [] },
    { stepId: 'model.demo.sales', kind: 'DBT_TEST', dependsOn: [] },
  ],
  observability: { extra: { planPreviewProvenance: provenance } },
};
describe('run model selection', () => {
  it('retains model steps scoped by the recorded file authority and omits tests', () => {
    expect(projectRunModelSelection(plan, scope)).toEqual({
      binding: {
        schemaVersion: 'canvas-authoring-authority-binding.v1',
        canvasId: 'analytics',
        authority: { kind: 'dbt-project-files', projectRoot: 'analytics' },
      },
      modelIds: [model],
    });
  });
  it('retains independent model identities for explicit multi-model navigation', () => {
    expect(
      projectRunModelSelection(
        {
          ...plan,
          steps: selectedUniqueIds.map((stepId) => ({ stepId, kind: 'DBT_MODEL', dependsOn: [] })),
        },
        scope
      )?.modelIds
    ).toEqual(selectedUniqueIds);
  });
  it('rejects scope changes, unavailable history and malformed protected workloads', () => {
    expect(projectRunModelSelection(plan, { ...scope, tenantId: 'other' })).toBeUndefined();
    expect(projectRunModelSelection({ ...plan, observability: {} }, scope)).toBeUndefined();
    expect(
      projectRunModelSelection(
        {
          ...plan,
          observability: {
            extra: {
              planPreviewProvenance: { kind: 'dvt-protected-workspace-graph', canvasId: 'canvas' },
            },
          },
          steps: [{ kind: 'DVT_POSTGRES_OPERATIONAL_WORKLOAD', stepId: model, dependsOn: [] }],
        },
        scope
      )
    ).toBeUndefined();
  });
});
