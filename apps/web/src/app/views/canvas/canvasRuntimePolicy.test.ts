import { describe, expect, it } from 'vitest';

import { DBT_NODE_KINDS } from '../../plugins/nodeTypeCatalog.dbt';
import { DVT_AUTHORING_NODE_KINDS } from '../../plugins/dvt/dvtNodeTypeCatalog';
import { OBJECT_FILE_POSTGRES_NODE_KINDS } from '../../plugins/objectFilePostgres/objectFilePostgresNodeTypeCatalog';
import type { CanonicalNode } from '../../types/canonical';
import {
  applyCanvasDraftPostureToRuntimePolicyInput,
  deriveCanvasDraftAccessPosture,
} from './canvasDraftAccessPostureModel';
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
  it('blocks mutating and execution commands before a canvas document exists', () => {
    const policy = resolveCanvasRuntimePolicy({
      activeRuntime: {
        kind: 'missing_document',
        executionStrategy: { kind: 'not_executable' },
        nodeKinds: DVT_AUTHORING_NODE_KINDS,
      },
      canMutateGraph: true,
      canOpenSourceImport: true,
      canPlan: true,
      canRun: true,
      canReloadLatestDraft: true,
    });

    expect(policy.document).toEqual({
      kind: 'missing_document',
    });
    expect(policy.commands).toEqual({
      canMutateGraph: false,
      canEditInspectorNode: false,
      canOpenSourceImport: false,
      canPlan: false,
      canRun: false,
      canReloadLatestDraft: true,
    });
  });

  it('fails closed for unsupported persisted canvas kinds', () => {
    const policy = resolveCanvasRuntimePolicy({
      activeRuntime: {
        kind: 'unsupported_kind',
        canvasKind: 'retired-canvas-kind',
      },
      canMutateGraph: true,
      canOpenSourceImport: true,
      canPlan: true,
      canRun: true,
      canReloadLatestDraft: true,
    });

    expect(policy.document).toEqual({
      kind: 'unsupported_kind',
      canvasKind: 'retired-canvas-kind',
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

  it('fails closed for registered canvas kinds whose owning plugin is disabled', () => {
    const policy = resolveCanvasRuntimePolicy({
      activeRuntime: {
        kind: 'disabled_plugin',
        canvasKind: 'dbt',
        pluginId: 'dbt',
        reason: 'disabled_for_workspace',
      },
      canMutateGraph: true,
      canOpenSourceImport: true,
      canPlan: true,
      canRun: true,
      canReloadLatestDraft: true,
    });

    expect(policy.document).toEqual({
      kind: 'disabled_plugin',
      canvasKind: 'dbt',
      pluginId: 'dbt',
      reason: 'disabled_for_workspace',
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
    expect(policy.admission.allowsNodeKind('dvt:transform')).toBe(false);
  });

  it('keeps dbt export metadata on the shared Model without adding a node profile', () => {
    const policy = resolveCanvasRuntimePolicy({
      activeRuntime: {
        kind: 'ready',
        canvasKind: 'transformation',
        executionStrategy: {
          kind: 'not_executable',
        },
        nodeKinds: DVT_AUTHORING_NODE_KINDS,
      },
      canMutateGraph: true,
      canOpenSourceImport: true,
      canPlan: true,
      canRun: true,
      canReloadLatestDraft: false,
    });

    expect(policy.document).toEqual({
      kind: 'ready',
      canvasKind: 'transformation',
    });
    expect(policy.commands.canMutateGraph).toBe(true);
    expect(policy.commands.canEditInspectorNode).toBe(true);
    expect(policy.commands.canPlan).toBe(false);
    expect(policy.commands.canRun).toBe(false);
    expect(policy.execution.kind).toBe('not_executable');
    expect(
      policy.admission.allowsCanonicalNode(
        buildCanonicalNode({
          pluginId: 'dvt',
          kind: 'dvt:transform',
          role: 'transform',
          metadata: { dbt: { materialized: 'view' } },
        })
      )
    ).toBe(true);
  });

  it('keeps DVT authoring admitted while its retired execution path is unavailable', () => {
    const policy = resolveCanvasRuntimePolicy({
      activeRuntime: {
        kind: 'ready',
        canvasKind: 'transformation',
        executionStrategy: {
          kind: 'not_executable',
        },
        nodeKinds: DVT_AUTHORING_NODE_KINDS,
      },
      canMutateGraph: true,
      canOpenSourceImport: true,
      canPlan: true,
      canRun: true,
      canReloadLatestDraft: false,
    });

    expect(policy.execution.kind).toBe('not_executable');
    expect(policy.commands.canMutateGraph).toBe(true);
    expect(policy.commands.canPlan).toBe(false);
    expect(policy.commands.canRun).toBe(false);
    expect(
      policy.admission.allowsCanonicalNode(
        buildCanonicalNode({
          pluginId: 'dvt',
          kind: 'dvt:source',
        })
      )
    ).toBe(true);
    expect(
      policy.admission.allowsCanonicalNode(
        buildCanonicalNode({
          pluginId: 'dvt',
          kind: 'dvt:source',
          role: 'output',
        })
      )
    ).toBe(false);
    expect(
      policy.admission.allowsCanonicalNode(
        buildCanonicalNode({
          pluginId: 'dbt',
          kind: 'dvt:transform',
          role: 'transform',
        })
      )
    ).toBe(false);
    expect(
      policy.admission.allowsCanonicalNode(
        buildCanonicalNode({
          pluginId: 'dvt',
          kind: 'dvt:transform',
          role: 'transform',
        })
      )
    ).toBe(true);
  });

  it('admits a composed plugin node by its explicit catalog ownership', () => {
    const policy = resolveCanvasRuntimePolicy({
      activeRuntime: {
        kind: 'ready',
        canvasKind: 'dbt',
        executionStrategy: {
          kind: 'planner_generic_preview',
          previewProfile: 'planner-generic-v1',
          sourceFamily: 'dbt',
        },
        nodeKinds: [...DBT_NODE_KINDS, ...OBJECT_FILE_POSTGRES_NODE_KINDS],
      },
      canMutateGraph: true,
      canOpenSourceImport: true,
      canPlan: true,
      canRun: true,
      canReloadLatestDraft: false,
    });

    expect(
      policy.admission.allowsCanonicalNode(
        buildCanonicalNode({
          pluginId: 'dvt.object-file-postgres',
          kind: 'dvt:object_file_load',
          role: 'transform',
        })
      )
    ).toBe(true);
  });

  it('blocks plan and run when draft posture is read-only', () => {
    const draftAdmission = applyCanvasDraftPostureToRuntimePolicyInput({
      posture: deriveCanvasDraftAccessPosture({
        draftAccessMode: 'read_only',
        draftCapabilityReason: 'write_denied',
        draftFormatError: null,
        authTransportPosture: 'none',
        recoveryReason: null,
        draftSaveStatus: 'idle',
      }),
      canMutateGraph: true,
      canPlan: true,
      canRun: true,
      canReloadLatestDraft: false,
    });
    const policy = resolveCanvasRuntimePolicy({
      activeRuntime: {
        kind: 'ready',
        canvasKind: 'transformation',
        executionStrategy: { kind: 'not_executable' },
        nodeKinds: DVT_AUTHORING_NODE_KINDS,
      },
      canOpenSourceImport: true,
      ...draftAdmission,
    });

    expect(policy.commands).toMatchObject({
      canMutateGraph: false,
      canEditInspectorNode: false,
      canOpenSourceImport: false,
      canPlan: false,
      canRun: false,
    });
  });

  it('allows preview planning and blocks run while a writable draft save is pending', () => {
    const draftAdmission = applyCanvasDraftPostureToRuntimePolicyInput({
      posture: deriveCanvasDraftAccessPosture({
        draftAccessMode: 'writable',
        draftCapabilityReason: 'authorized',
        draftFormatError: null,
        authTransportPosture: 'none',
        recoveryReason: null,
        draftSaveStatus: 'saving',
      }),
      canMutateGraph: true,
      canPlan: true,
      canRun: true,
      canReloadLatestDraft: false,
    });

    expect(draftAdmission).toEqual({
      canMutateGraph: true,
      canPlan: true,
      canRun: false,
      canReloadLatestDraft: false,
    });
  });
});
