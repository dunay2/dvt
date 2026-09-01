/** Owned concern: provide story-shaped Canvas host-cycle scenarios for route proofs. */
import { DVT_AUTHORING_NODE_KINDS } from '../plugins/dvt/dvtNodeTypeCatalog';
import { DBT_NODE_KINDS } from '../plugins/nodeTypeCatalog.dbt';
import type { NodeKindRegistration } from '../plugins/nodeTypeContracts';
import type { CanvasController } from './Canvas.test.controller';

type CanvasDocumentKind = Exclude<CanvasController['canvasAuthoringMode'], undefined>;
type CanvasHostCycleNode = CanvasController['inspectorGraphNodes'][number];

export type CanvasHostCycleControllerStateDto =
  | { kind: 'needs_canvas' }
  | {
      kind: 'typed_empty';
      canvasKind: CanvasDocumentKind;
      title?: string;
      canEditEdges?: boolean;
      canOpenSourceImport?: boolean;
    }
  | {
      kind: 'restored_empty';
      canvasKind: CanvasDocumentKind;
      title?: string;
      canEditEdges?: boolean;
      canOpenSourceImport?: boolean;
    }
  | {
      kind: 'graph_ready';
      canvasKind: CanvasDocumentKind;
      title?: string;
      firstNodeKind?: NodeKindRegistration['kind'];
    }
  | {
      kind: 'restored_graph_ready';
      canvasKind: CanvasDocumentKind;
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

function resolveCanvasHostCycleTitle(kind: CanvasDocumentKind): string {
  return kind === 'dbt' ? 'dbt canvas' : 'Transformation canvas';
}

function buildCanvasHostCycleNode(
  kind: CanvasDocumentKind,
  firstNodeKind?: NodeKindRegistration['kind']
): CanvasHostCycleNode {
  if (kind === 'dbt') {
    return {
      id: 'node.orders',
      name: 'orders',
      pluginId: 'dbt',
      kind: firstNodeKind ?? 'dbt:model',
      role: 'transform',
      status: 'idle',
      tags: [],
    };
  }

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
      kind: 'dbt',
      pluginId: 'dbt',
      label: 'dbt',
      description: 'Model-first canvas for dbt resources and dependencies.',
      createTitle: 'dbt canvas',
      emptyState: {
        title: 'Start dbt canvas',
        editableMessage:
          'Start this dbt canvas by adding a governed source, model, snapshot, exposure, or metric.',
      },
      nodeKinds: DBT_NODE_KINDS,
    },
    {
      kind: 'transformation',
      pluginId: 'dvt',
      label: 'Transformation',
      description: 'Flow-based transformation canvas for the protected authoring draft.',
      createTitle: 'Transformation canvas',
      emptyState: {
        title: 'Start transformation canvas',
        editableMessage:
          'Start this transformation canvas by adding a governed source, Transform, or sink node.',
      },
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
        title: dto.title ?? resolveCanvasHostCycleTitle(dto.canvasKind),
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
      canvasAuthoringMode: dto.canvasKind,
    };
  }

  const graphNode = buildCanvasHostCycleNode(dto.canvasKind, dto.firstNodeKind);

  return {
    canvasDocument: {
      kind: dto.canvasKind,
      title: dto.title ?? resolveCanvasHostCycleTitle(dto.canvasKind),
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
    canvasAuthoringMode: dto.canvasKind,
    canPlanGraph: true,
  };
}
