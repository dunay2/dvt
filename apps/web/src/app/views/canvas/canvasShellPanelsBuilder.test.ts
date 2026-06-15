import { describe, expect, it, vi } from 'vitest';

import { buildCanvasShellPanels } from './canvasShellPanelsBuilder';
import type { CanvasShellPanelsBuilderArgs } from './canvasShellBuilder.types';
import { buildTestCanvasKind, buildTestNodeKind } from './canvasKindRegistration.testSupport';
import { CANONICAL_NODE_STATUSES, type CanonicalNode } from '../../types/canonical';

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
      inspectorPreferredTabId: null,
      inspectorNodeSelectedForExecution: false,
      inspectorGraphNodes: [],
      inspectorGraphEdges: [],
      canEditInspectorNode: true,
      applyInspectorNodeDraft: vi.fn(),
      handleDuplicateNode: vi.fn(),
      handleToggleNodeSelection: vi.fn(),
      handleRemoveNode: vi.fn(),
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
        buildTestCanvasKind('dbt', [buildTestNodeKind('dbt:model', 'Model')]),
        buildTestCanvasKind('transformation', [buildTestNodeKind('dvt:source', 'Source')]),
      ],
    },
    ...overrides,
  };
}

describe('buildCanvasShellPanels', () => {
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
            buildTestCanvasKind('dbt', [buildTestNodeKind('dbt:model', 'Model')]),
            buildTestCanvasKind('transformation', [buildTestNodeKind('dvt:source', 'Source')]),
          ],
        },
      })
    );

    expect(panels.authoringNodeKinds.map((registration) => registration.kind)).toEqual([
      'dvt:source',
    ]);
  });

  it('projects inspector modeler actions from route-owned graph handlers', () => {
    const inspectorNode = buildInspectorNode();
    const handleDuplicateNode = vi.fn();
    const handleToggleNodeSelection = vi.fn();
    const handleRemoveNode = vi.fn();
    const panels = buildCanvasShellPanels(
      buildArgs({
        panelState: {
          ...buildArgs().panelState,
          inspectorNode,
          inspectorNodeSelectedForExecution: true,
          handleDuplicateNode,
          handleToggleNodeSelection,
          handleRemoveNode,
        },
      })
    );

    expect(panels.inspectorAuthoring.modelerActions).toMatchObject({
      selectedForExecution: true,
      onDuplicateNode: handleDuplicateNode,
      onToggleNodeSelection: handleToggleNodeSelection,
      onRemoveNode: handleRemoveNode,
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
          },
        })
      ).inspectorPreferredTabId
    ).toBe('inputs-outputs');

    expect(
      buildCanvasShellPanels(
        buildArgs({
          panelState: {
            ...buildArgs().panelState,
            inspectorNode: null,
            inspectorPreferredTabId: 'inputs-outputs',
          },
        })
      ).inspectorPreferredTabId
    ).toBeNull();
  });

  it('keeps inspector execution selection available when graph mutation is blocked but planning is allowed', () => {
    const inspectorNode = buildInspectorNode();
    const handleToggleNodeSelection = vi.fn();
    const panels = buildCanvasShellPanels(
      buildArgs({
        panelState: {
          ...buildArgs().panelState,
          inspectorNode,
          handleToggleNodeSelection,
        },
        userPermissions: {
          canPlan: true,
          canRun: true,
          canEditEdges: false,
          canPersistGraphDraft: false,
          canManagePlugins: false,
          canManageRBAC: false,
        },
      })
    );

    expect(panels.inspectorAuthoring.modelerActions).toMatchObject({
      selectedForExecution: false,
      onToggleNodeSelection: handleToggleNodeSelection,
    });
    expect(panels.inspectorAuthoring.modelerActions?.onDuplicateNode).toBeUndefined();
    expect(panels.inspectorAuthoring.modelerActions?.onRemoveNode).toBeUndefined();
  });

  it('keeps inspector execution selection unavailable when planning and running are blocked', () => {
    const inspectorNode = buildInspectorNode();
    const panels = buildCanvasShellPanels(
      buildArgs({
        panelState: {
          ...buildArgs().panelState,
          inspectorNode,
          handleToggleNodeSelection: vi.fn(),
        },
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

    expect(panels.inspectorAuthoring.modelerActions).toMatchObject({
      selectedForExecution: false,
    });
    expect(panels.inspectorAuthoring.modelerActions?.onToggleNodeSelection).toBeUndefined();
    expect(panels.inspectorAuthoring.modelerActions?.onDuplicateNode).toBeUndefined();
    expect(panels.inspectorAuthoring.modelerActions?.onRemoveNode).toBeUndefined();
  });
});
