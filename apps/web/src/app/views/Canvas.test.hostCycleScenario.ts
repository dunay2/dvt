/** Owned concern: provide story-shaped Canvas host-cycle scenarios for route proofs. */
import { DVT_AUTHORING_NODE_KINDS } from '../plugins/dvt/dvtNodeTypeCatalog';
import type { NodeKindRegistration } from '../plugins/nodeTypeContracts';
import type { CanvasController } from './Canvas.test.controller';

type CanvasHostCycleNode = CanvasController['inspectorGraphNodes'][number];

export type CanvasHostCycleControllerStateDto =
  | { kind: 'needs_canvas' }
  | {
      kind: 'typed_empty';
      canvasKind: NonNullable<CanvasController['canvasDocument']>['kind'];
      title?: string;
      canEditEdges?: boolean;
      canOpenSourceImport?: boolean;
    }
  | {
      kind: 'restored_empty';
      canvasKind: NonNullable<CanvasController['canvasDocument']>['kind'];
      title?: string;
      canEditEdges?: boolean;
      canOpenSourceImport?: boolean;
    }
  | {
      kind: 'graph_ready';
      canvasKind: NonNullable<CanvasController['canvasDocument']>['kind'];
      title?: string;
      firstNodeKind?: NodeKindRegistration['kind'];
    }
  | {
      kind: 'restored_graph_ready';
      canvasKind: NonNullable<CanvasController['canvasDocument']>['kind'];
      title?: string;
      firstNodeKind?: NodeKindRegistration['kind'];
    };

function buildDefaultCanvasUserPermissions(): CanvasController['userPermissions'] {
  return {
    canPlan: true,
    canRun: true,
    canEditEdges: true,
    canPersistGraphDraft: true,
    canManagePlugins: false,
    canManageRBAC: false,
  };
}

function buildCanvasHostCycleNode(
  _kind: NonNullable<CanvasController['canvasDocument']>['kind'],
  firstNodeKind?: NodeKindRegistration['kind']
): CanvasHostCycleNode {
  return {
    id: 'node.source',
    name: 'Source',
    pluginId: 'dvt',
    kind: firstNodeKind ?? 'dvt:source',
    role: 'input',
    status: 'idle',
    tags: [],
  };
}

function buildCanvasKinds(): CanvasController['availableCanvasKinds'] {
  return [
    {
      kind: 'transformation',
      pluginId: 'dvt',
      label: 'Transformation',
      description: 'Flow-based transformation canvas for the protected authoring draft.',
      createTitle: 'Transformation canvas',
      nodeKinds: DVT_AUTHORING_NODE_KINDS,
    },
  ];
}

export function buildCanvasHostCycleControllerState(
  dto: CanvasHostCycleControllerStateDto
): Partial<CanvasController> {
  if (dto.kind === 'needs_canvas') {
    return {
      canvasDocument: null,
      canCreateCanvasDocument: true,
      availableCanvasKinds: buildCanvasKinds(),
    };
  }

  if (dto.kind === 'typed_empty' || dto.kind === 'restored_empty') {
    return {
      canvasDocument: {
        kind: dto.canvasKind,
        title: dto.title ?? 'Transformation canvas',
      },
      availableCanvasKinds: buildCanvasKinds(),
      canCreateCanvasDocument: false,
      userPermissions: {
        ...buildDefaultCanvasUserPermissions(),
        canEditEdges: dto.canEditEdges ?? true,
        canPersistGraphDraft: true,
      },
      canPlanGraph: false,
      canOpenSourceImport: dto.canOpenSourceImport ?? true,
    };
  }

  const graphNode = buildCanvasHostCycleNode(dto.canvasKind, dto.firstNodeKind);

  return {
    canvasDocument: {
      kind: dto.canvasKind,
      title: dto.title ?? 'Transformation canvas',
    },
    availableCanvasKinds: buildCanvasKinds(),
    canCreateCanvasDocument: false,
    inspectorGraphNodes: [graphNode],
    nodesWithImpact: [
      {
        id: graphNode.id,
        type: 'dbtNode',
        position: { x: 0, y: 0 },
        data: {
          name: graphNode.name,
          pluginKind: graphNode.kind,
          role: graphNode.role,
          status: graphNode.status,
          tags: graphNode.tags,
        },
      },
    ] as unknown as CanvasController['nodesWithImpact'],
    canPlanGraph: true,
  };
}
