import { describe, expect, it, vi } from 'vitest';

import { buildCanvasShellPanels } from './canvasShellPanelsBuilder';
import type { CanvasShellPanelsBuilderArgs } from './canvasShellBuilder.types';
import { buildTestCanvasKind, buildTestNodeKind } from './canvasKindRegistration.testSupport';
import type { CanonicalNode } from '../../types/canonical';

function buildArgs(
  overrides?: Partial<CanvasShellPanelsBuilderArgs>
): CanvasShellPanelsBuilderArgs {
  return {
    panelState: {
      explorerNodes: [],
      inspectorNode: null,
      inspectorGraphNodes: [],
      inspectorGraphEdges: [],
      canEditInspectorNode: true,
      applyInspectorNodeDraft: vi.fn(),
      activeRunId: null,
      registeredPlugins: new Set(['dvt']),
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
  it('projects controller explorer nodes into workspace explorer resource groups', () => {
    const explorerNode = {
      id: 'node.orders',
      name: 'orders',
      pluginId: 'dbt',
      kind: 'dbt:model',
      role: 'transform',
      status: 'idle',
      tags: [],
    } satisfies CanonicalNode;
    const panels = buildCanvasShellPanels(
      buildArgs({
        panelState: {
          ...buildArgs().panelState,
          explorerNodes: [explorerNode],
        },
      })
    );

    const resources = panels.explorerResourceGroups.flatMap((group) => group.resources);

    expect(resources.find((resource) => resource.id === 'node.orders')).toMatchObject({
      id: 'node.orders',
      label: 'orders',
      resourceType: 'canvas_node',
    });
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
});
