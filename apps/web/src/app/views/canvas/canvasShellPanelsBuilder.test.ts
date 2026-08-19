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
      inspectorPreferredTabRequestId: 0,
      inspectorGraphNodes: [],
      inspectorGraphEdges: [],
      canEditInspectorNode: true,
      applyInspectorNodeDraft: vi.fn(),
      convertInspectorVisualTransformToSql: vi.fn(),
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

  it('projects only the authoring authority consumed by the contextual Workbench', () => {
    const onApplyNodeDraft = vi.fn();
    const onConvertVisualTransformToSql = vi.fn();
    const panels = buildCanvasShellPanels(
      buildArgs({
        panelState: {
          ...buildArgs().panelState,
          inspectorNode: buildInspectorNode(),
          applyInspectorNodeDraft: onApplyNodeDraft,
          convertInspectorVisualTransformToSql: onConvertVisualTransformToSql,
        },
      })
    );

    expect(panels.inspectorAuthoring).toEqual({
      canEditNode: true,
      workspaceScope: buildArgs().routePresentation.workspaceScope,
      onApplyNodeDraft,
      onConvertVisualTransformToSql,
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
});
