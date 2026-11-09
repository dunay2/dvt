import { describe, expect, it, vi } from 'vitest';

import { buildCanvasShellPanels } from './canvasShellPanelsBuilder';
import type { CanvasShellPanelsBuilderArgs } from './canvasShellBuilder.types';
import { buildTestCanvasKind, buildTestNodeKind } from './canvasKindRegistration.testSupport';
import { CANONICAL_NODE_STATUSES, type CanonicalNode } from '../../types/canonical';
import type { CanvasInspectorTarget } from '../../stores/canvasInspectorTarget';

const INSPECTOR_TEST_NODE_KIND = buildTestNodeKind('dvt:source', 'Source');

function buildInspectorNode(overrides?: Partial<CanonicalNode>): CanonicalNode {
  return {
    id: 'node.orders',
    name: 'Orders',
    pluginId: INSPECTOR_TEST_NODE_KIND.pluginId,
    kind: INSPECTOR_TEST_NODE_KIND.kind,
    role: INSPECTOR_TEST_NODE_KIND.role,
    status: CANONICAL_NODE_STATUSES[0],
    tags: [],
    ...overrides,
  };
}

function buildArgs(
  overrides?: Partial<CanvasShellPanelsBuilderArgs>
): CanvasShellPanelsBuilderArgs {
  return {
    panelState: {
      inspectorNode: null,
      inspectorTarget: null,
      inspectorPreferredTabId: null,
      inspectorPreferredTabRequestId: 0,
      inspectorGraphNodes: [],
      inspectorGraphEdges: [],
      canEditInspectorNode: true,
      applyNodeDraft: vi.fn(),
      applyInspectorNodeDraft: vi.fn(),
      activeRunId: null,
      registeredPlugins: new Set(['dvt']),
      runtimeCapabilities: undefined,
      importedNodeFocusIds: [],
      executionEnvironmentOptions: [{ value: 'dev', label: 'dev' }],
    },
    userPermissions: {
      canPlan: true,
      canRun: true,
      canEditEdges: true,
      canPersistGraphDraft: true,
      canManagePlugins: false,
      canManageRBAC: false,
    },
    routePresentation: {
      workspaceScope: {
        tenantId: 'tenant',
        projectId: 'project',
        environmentId: 'dev',
        targetAdapter: 'temporal',
      },
      canvasDocument: {
        id: 'transformation-canvas',
        kind: 'transformation',
        title: 'Transformation canvas',
      },
      canvasDocuments: [
        {
          id: 'transformation-canvas',
          kind: 'transformation',
          title: 'Transformation canvas',
        },
      ],
      activeCanvasId: 'transformation-canvas',
      availableCanvasKinds: [
        buildTestCanvasKind('dbt', [buildTestNodeKind('dvt:transform', 'Model')]),
        buildTestCanvasKind('transformation', [buildTestNodeKind('dvt:source', 'Source')]),
      ],
    },
    ...overrides,
  };
}

describe('buildCanvasShellPanels', () => {
  it.each([
    null,
    buildInspectorNode(),
    buildInspectorNode({ id: 'unplaced-model', kind: 'dvt:transform', role: 'transform' }),
  ])(
    'keeps Model runtime authoring independent of the readonly Inspector target %j',
    (inspectorNode) => {
      // A stricter Properties admission must not disable another placed Model's pending editor.
      const args = buildArgs();
      const panels = buildCanvasShellPanels({
        ...args,
        panelState: { ...args.panelState, inspectorNode, canEditInspectorNode: false },
      });
      expect(panels.inspectorAuthoring.canEditNode).toBe(false);
      expect(panels.relationalTreeAuthoring?.canEditNode).toBe(true);
    }
  );

  it('cannot borrow Inspector editability when graph commands are readonly', () => {
    const args = buildArgs();
    const panels = buildCanvasShellPanels({
      ...args,
      userPermissions: { ...args.userPermissions, canEditEdges: false },
      panelState: { ...args.panelState, canEditInspectorNode: true },
    });
    expect(panels.relationalTreeAuthoring?.canEditNode).toBe(false);
  });

  it('derives active canvas authoring node kinds from the ready canvas kind', () => {
    const panels = buildCanvasShellPanels(buildArgs());

    expect(panels.authoringNodeKinds.map((registration) => registration.kind)).toEqual([
      'dvt:source',
    ]);
  });

  it('does not expose active canvas authoring node kinds when graph mutation is blocked', () => {
    const panels = buildCanvasShellPanels(
      buildArgs({
        userPermissions: {
          canPlan: false,
          canRun: false,
          canEditEdges: false,
          canPersistGraphDraft: false,
          canManagePlugins: false,
          canManageRBAC: false,
        },
      })
    );

    expect(panels.authoringNodeKinds).toEqual([]);
  });

  it('resolves authoring node kinds when canvas kind casing differs', () => {
    const panels = buildCanvasShellPanels(
      buildArgs({
        routePresentation: {
          workspaceScope: buildArgs().routePresentation.workspaceScope,
          canvasDocument: {
            id: 'transformation-canvas',
            kind: ' Transformation ',
            title: 'Transformation canvas',
          },
          canvasDocuments: [
            {
              id: 'transformation-canvas',
              kind: ' Transformation ',
              title: 'Transformation canvas',
            },
          ],
          activeCanvasId: 'transformation-canvas',
          availableCanvasKinds: [
            buildTestCanvasKind('dbt', [buildTestNodeKind('dvt:transform', 'Model')]),
            buildTestCanvasKind('transformation', [buildTestNodeKind('dvt:source', 'Source')]),
          ],
        },
      })
    );

    expect(panels.authoringNodeKinds.map((registration) => registration.kind)).toEqual([
      'dvt:source',
    ]);
  });

  it('projects only the authoring authority consumed by the contextual Workbench', () => {
    const onApplyNodeDraft = vi.fn();
    const onApplyNodeDraftForNode = vi.fn();
    const panels = buildCanvasShellPanels(
      buildArgs({
        panelState: {
          ...buildArgs().panelState,
          inspectorNode: buildInspectorNode(),
          applyNodeDraft: onApplyNodeDraftForNode,
          applyInspectorNodeDraft: onApplyNodeDraft,
        },
      })
    );

    expect(panels.inspectorAuthoring).toEqual({
      canEditNode: true,
      workspaceScope: buildArgs().routePresentation.workspaceScope,
      onApplyNodeDraft,
    });
    expect(panels.relationalTreeAuthoring).toEqual({
      canEditNode: true,
      onApplyNodeDraft: onApplyNodeDraftForNode,
    });
  });

  it('keeps node workbench tab preference only while an inspector node is active', () => {
    const inspectorNode = buildInspectorNode();

    expect(
      buildCanvasShellPanels(
        buildArgs({
          panelState: {
            ...buildArgs().panelState,
            inspectorNode,
            inspectorPreferredTabId: 'inputs-outputs',
            inspectorPreferredTabRequestId: 3,
          },
        })
      )
    ).toMatchObject({
      inspectorPreferredTabId: 'inputs-outputs',
      inspectorPreferredTabRequestId: 3,
    });

    expect(
      buildCanvasShellPanels(
        buildArgs({
          panelState: {
            ...buildArgs().panelState,
            inspectorNode: null,
            inspectorPreferredTabId: 'inputs-outputs',
            inspectorPreferredTabRequestId: 3,
          },
        })
      )
    ).toMatchObject({
      inspectorPreferredTabId: null,
      inspectorPreferredTabRequestId: 0,
    });
  });

  it('retains the file target preference without replacing the canonical catalogue', () => {
    // GH-3765: a real file target has no canonical node; clearing its preference would lose explicit Code intent.
    const args = buildArgs();
    const target: CanvasInspectorTarget = {
      kind: 'dbt-file-model',
      binding: {
        schemaVersion: 'canvas-authoring-authority-binding.v1',
        canvasId: 'file-canvas',
        authority: { kind: 'dbt-project-files', projectRoot: 'project' },
      },
      uniqueId: 'model.project.orders',
      workspaceScope: args.routePresentation.workspaceScope,
    };
    const catalogue = [buildInspectorNode()];
    const panels = buildCanvasShellPanels({
      ...args,
      panelState: {
        ...args.panelState,
        inspectorTarget: target,
        inspectorNode: null,
        inspectorPreferredTabId: 'code',
        inspectorPreferredTabRequestId: 4,
        inspectorGraphNodes: catalogue,
        canEditInspectorNode: false,
      },
    });

    expect(panels.inspectorTarget).toBe(target);
    expect(panels.inspectorNode).toBeNull();
    expect(panels.inspectorPreferredTabId).toBe('code');
    expect(panels.inspectorPreferredTabRequestId).toBe(4);
    expect(panels.inspectorGraphNodes).toBe(catalogue);
    expect(panels.inspectorAuthoring.canEditNode).toBe(false);
  });
});
