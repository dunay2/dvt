import { describe, expect, it } from 'vitest';

import { DBT_NODE_KINDS } from '../../plugins/nodeTypeCatalog.dbt';
import { DVT_AUTHORING_NODE_KINDS } from '../../plugins/dvt/dvtNodeTypeCatalog';
import type { CanonicalNode } from '../../types/canonical';
import { resolveCanvasRuntimePolicy } from './canvasRuntimePolicy';

function buildCanonicalNode(overrides: Partial<CanonicalNode>): CanonicalNode {
  return {
    id: 'node-1',
    name: 'Node 1',
    pluginId: 'dvt',
    kind: 'dvt:source',
    role: 'input',
    status: 'idle',
    tags: [],
    ...overrides,
  };
}

describe('resolveCanvasRuntimePolicy', () => {
  it('fails closed for unsupported persisted canvas kinds', () => {
    const policy = resolveCanvasRuntimePolicy({
      activeRuntime: {
        kind: 'unsupported_kind',
        canvasKind: 'legacy',
      },
      canMutateGraph: true,
      canOpenSourceImport: true,
      canPlan: true,
      canRun: true,
      canReloadLatestDraft: true,
    });

    expect(policy.document).toEqual({
      kind: 'unsupported_kind',
      canvasKind: 'legacy',
    });
    expect(policy.commands).toEqual({
      canMutateGraph: false,
      canEditInspectorNode: false,
      canOpenSourceImport: false,
      canPlan: false,
      canRun: false,
      canReloadLatestDraft: true,
    });
    expect(policy.execution.kind).toBe('blocked');
    expect(policy.admission.nodeKinds).toEqual([]);
    expect(policy.admission.allowsNodeKind('dvt:source')).toBe(false);
  });

  it('keeps DBT authoring available while making execution unavailable', () => {
    const policy = resolveCanvasRuntimePolicy({
      activeRuntime: {
        kind: 'ready',
        canvasKind: 'dbt',
        executionStrategy: {
          kind: 'not_executable',
        },
        nodeKinds: DBT_NODE_KINDS,
      },
      canMutateGraph: true,
      canOpenSourceImport: true,
      canPlan: true,
      canRun: true,
      canReloadLatestDraft: false,
    });

    expect(policy.document).toEqual({
      kind: 'ready',
      canvasKind: 'dbt',
    });
    expect(policy.commands.canMutateGraph).toBe(true);
    expect(policy.commands.canEditInspectorNode).toBe(true);
    expect(policy.commands.canPlan).toBe(false);
    expect(policy.commands.canRun).toBe(false);
    expect(policy.execution.kind).toBe('not_executable');
    expect(policy.admission.allowsCanonicalNode(buildCanonicalNode({
      pluginId: 'dbt',
      kind: 'dbt:model',
      role: 'transform',
    }))).toBe(true);
  });

  it('admits only canonical nodes owned by the active runtime catalog', () => {
    const policy = resolveCanvasRuntimePolicy({
      activeRuntime: {
        kind: 'ready',
        canvasKind: 'transformation',
        executionStrategy: {
          kind: 'transformation_preview',
          previewProfile: 'transformation-sql-first-v1',
        },
        nodeKinds: DVT_AUTHORING_NODE_KINDS,
      },
      canMutateGraph: true,
      canOpenSourceImport: true,
      canPlan: true,
      canRun: true,
      canReloadLatestDraft: false,
    });

    expect(policy.execution.kind).toBe('executable');
    expect(policy.commands.canPlan).toBe(true);
    expect(policy.commands.canRun).toBe(true);
    expect(policy.admission.allowsCanonicalNode(buildCanonicalNode({
      pluginId: 'dvt',
      kind: 'dvt:source',
    }))).toBe(true);
    expect(policy.admission.allowsCanonicalNode(buildCanonicalNode({
      pluginId: 'dvt',
      kind: 'dvt:source',
      role: 'output',
    }))).toBe(false);
    expect(policy.admission.allowsCanonicalNode(buildCanonicalNode({
      pluginId: 'dbt',
      kind: 'dbt:model',
      role: 'transform',
    }))).toBe(false);
    expect(policy.admission.allowsCanonicalNode(buildCanonicalNode({
      pluginId: 'dvt',
      kind: 'dbt:model',
      role: 'transform',
    }))).toBe(false);
  });
});
