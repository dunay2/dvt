/**
 * Owned concern: define the graph-first editable aggregate persisted as a
 * workspace graph authoring draft.
 *
 * This contract owns visible nodes, positions, semantic nodes, and semantic
 * edges. It does not own auth, audit, compare-and-swap, React Flow state,
 * compile projection, or runtime execution eligibility.
 *
 * @baseline ADR-0035: Planner Public Contract Evolution Protocol
 * @decision Persist workspace authoring as a graph-first aggregate, not as UI widget state.
 * @consequence Planner and canvas boundaries share one editable authoring truth.
 * @version 1.0.0
 */
import { z } from 'zod';

import { isNonBlankString, NON_BLANK_STRING_MESSAGE } from '../../utils/contractPrimitives.js';

import {
  DVT_TRANSFORM_AUTHORING_AUTHORITY_METADATA_KEY,
  DvtTransformAuthoringAuthorityV1Schema,
} from './DvtTransformAuthoringAuthority.v1.js';

const NonBlankStringSchema = z
  .string()
  .min(1)
  .refine((value) => isNonBlankString(value), {
    message: NON_BLANK_STRING_MESSAGE,
  })
  .brand<'NonBlankString'>();

const RecordStringUnknownSchema = z.record(z.string(), z.unknown());

export const WORKSPACE_GRAPH_AUTHORING_NODE_ROLE = {
  input: 'input',
  transform: 'transform',
  check: 'check',
  output: 'output',
  control: 'control',
} as const;

export const WORKSPACE_GRAPH_AUTHORING_NODE_STATUS = {
  idle: 'idle',
  running: 'running',
  success: 'success',
  failed: 'failed',
  skipped: 'skipped',
  warn: 'warn',
} as const;

export const WORKSPACE_GRAPH_AUTHORING_EDGE_RELATION = {
  lineage: 'lineage',
  validation: 'validation',
  consumption: 'consumption',
  metric: 'metric',
  custom: 'custom',
} as const;

export type WorkspaceGraphAuthoringNodeRole =
  (typeof WORKSPACE_GRAPH_AUTHORING_NODE_ROLE)[keyof typeof WORKSPACE_GRAPH_AUTHORING_NODE_ROLE];
export type WorkspaceGraphAuthoringNodeStatus =
  (typeof WORKSPACE_GRAPH_AUTHORING_NODE_STATUS)[keyof typeof WORKSPACE_GRAPH_AUTHORING_NODE_STATUS];
export type WorkspaceGraphAuthoringEdgeRelation =
  (typeof WORKSPACE_GRAPH_AUTHORING_EDGE_RELATION)[keyof typeof WORKSPACE_GRAPH_AUTHORING_EDGE_RELATION];

export interface WorkspaceGraphAuthoringNodePosition {
  x: number;
  y: number;
}

export interface WorkspaceGraphAuthoringVisibleEdge {
  sourceId: string;
  targetId: string;
}

export interface WorkspaceGraphAuthoringCanvasDocument {
  id?: string | undefined;
  kind: string;
  title: string;
  environmentId?: string | undefined;
  defaultPermission?: 'read' | 'write' | undefined;
}

export interface WorkspaceGraphAuthoringNode {
  id: string;
  name: string;
  pluginId: string;
  kind: string;
  role: WorkspaceGraphAuthoringNodeRole;
  status: WorkspaceGraphAuthoringNodeStatus;
  tags: string[];
  path?: string | undefined;
  description?: string | undefined;
  lastDuration?: number | undefined;
  lastCost?: number | undefined;
  metadata?: Record<string, unknown> | undefined;
}

export interface WorkspaceGraphAuthoringEdge {
  id: string;
  sourceId: string;
  targetId: string;
  relation: WorkspaceGraphAuthoringEdgeRelation;
  metadata?: Record<string, unknown> | undefined;
}

export interface WorkspaceGraphAuthoringCanvasWorkspace {
  canvas: WorkspaceGraphAuthoringCanvasDocument & { id: string };
  nodeIds: string[];
  nodePositions: Record<string, WorkspaceGraphAuthoringNodePosition>;
  nodes: WorkspaceGraphAuthoringNode[];
  edges: WorkspaceGraphAuthoringEdge[];
}

export interface WorkspaceGraphAuthoringDraft {
  canvas: WorkspaceGraphAuthoringCanvasDocument;
  activeCanvasId?: string | undefined;
  canvases?: WorkspaceGraphAuthoringCanvasWorkspace[] | undefined;
  nodeIds: string[];
  nodePositions: Record<string, WorkspaceGraphAuthoringNodePosition>;
  nodes: WorkspaceGraphAuthoringNode[];
  edges: WorkspaceGraphAuthoringEdge[];
}

export const WorkspaceGraphAuthoringNodePositionSchema = z
  .object({
    x: z.float64(),
    y: z.float64(),
  })
  .strict() satisfies z.ZodType<WorkspaceGraphAuthoringNodePosition>;

export const WorkspaceGraphAuthoringVisibleEdgeSchema = z
  .object({
    sourceId: NonBlankStringSchema,
    targetId: NonBlankStringSchema,
  })
  .strict() satisfies z.ZodType<WorkspaceGraphAuthoringVisibleEdge>;

export const WorkspaceGraphAuthoringCanvasDocumentSchema = z
  .object({
    id: NonBlankStringSchema.optional(),
    kind: NonBlankStringSchema,
    title: NonBlankStringSchema,
    environmentId: NonBlankStringSchema.optional(),
    defaultPermission: z.enum(['read', 'write']).optional(),
  })
  .strict() satisfies z.ZodType<WorkspaceGraphAuthoringCanvasDocument>;

export const WorkspaceGraphAuthoringNodeSchema = z
  .object({
    id: NonBlankStringSchema,
    name: NonBlankStringSchema,
    pluginId: NonBlankStringSchema,
    kind: NonBlankStringSchema,
    role: z.enum([
      WORKSPACE_GRAPH_AUTHORING_NODE_ROLE.input,
      WORKSPACE_GRAPH_AUTHORING_NODE_ROLE.transform,
      WORKSPACE_GRAPH_AUTHORING_NODE_ROLE.check,
      WORKSPACE_GRAPH_AUTHORING_NODE_ROLE.output,
      WORKSPACE_GRAPH_AUTHORING_NODE_ROLE.control,
    ]),
    status: z.enum([
      WORKSPACE_GRAPH_AUTHORING_NODE_STATUS.idle,
      WORKSPACE_GRAPH_AUTHORING_NODE_STATUS.running,
      WORKSPACE_GRAPH_AUTHORING_NODE_STATUS.success,
      WORKSPACE_GRAPH_AUTHORING_NODE_STATUS.failed,
      WORKSPACE_GRAPH_AUTHORING_NODE_STATUS.skipped,
      WORKSPACE_GRAPH_AUTHORING_NODE_STATUS.warn,
    ]),
    tags: z.array(NonBlankStringSchema),
    path: NonBlankStringSchema.optional(),
    description: NonBlankStringSchema.optional(),
    lastDuration: z.float64().nonnegative().optional(),
    lastCost: z.float64().nonnegative().optional(),
    metadata: RecordStringUnknownSchema.optional(),
  })
  .strict() satisfies z.ZodType<WorkspaceGraphAuthoringNode>;

export const WorkspaceGraphAuthoringEdgeSchema = z
  .object({
    id: NonBlankStringSchema,
    sourceId: NonBlankStringSchema,
    targetId: NonBlankStringSchema,
    relation: z.enum([
      WORKSPACE_GRAPH_AUTHORING_EDGE_RELATION.lineage,
      WORKSPACE_GRAPH_AUTHORING_EDGE_RELATION.validation,
      WORKSPACE_GRAPH_AUTHORING_EDGE_RELATION.consumption,
      WORKSPACE_GRAPH_AUTHORING_EDGE_RELATION.metric,
      WORKSPACE_GRAPH_AUTHORING_EDGE_RELATION.custom,
    ]),
    metadata: RecordStringUnknownSchema.optional(),
  })
  .strict() satisfies z.ZodType<WorkspaceGraphAuthoringEdge>;

export const WorkspaceGraphAuthoringCanvasWorkspaceSchema = z
  .object({
    canvas: WorkspaceGraphAuthoringCanvasDocumentSchema.and(
      z.object({ id: NonBlankStringSchema }).strict()
    ),
    nodeIds: z.array(NonBlankStringSchema),
    nodePositions: z.record(NonBlankStringSchema, WorkspaceGraphAuthoringNodePositionSchema),
    nodes: z.array(WorkspaceGraphAuthoringNodeSchema),
    edges: z.array(WorkspaceGraphAuthoringEdgeSchema),
  })
  .strict() satisfies z.ZodType<WorkspaceGraphAuthoringCanvasWorkspace>;

type WorkspaceGraphAuthoringGraphShape = Pick<
  WorkspaceGraphAuthoringDraft,
  'nodeIds' | 'nodePositions' | 'nodes' | 'edges'
>;

function addGraphShapeIssues(
  graph: WorkspaceGraphAuthoringGraphShape,
  ctx: z.RefinementCtx,
  pathPrefix: Array<string | number> = []
): void {
  const visibleNodeIds = new Set<string>(graph.nodeIds);
  if (visibleNodeIds.size !== graph.nodeIds.length) {
    ctx.addIssue({
      code: 'custom',
      path: [...pathPrefix, 'nodeIds'],
      message: 'WorkspaceGraphAuthoringDraft nodeIds must be unique.',
    });
  }

  const positionedNodeIds = Object.keys(graph.nodePositions);
  if (
    positionedNodeIds.length !== graph.nodeIds.length ||
    positionedNodeIds.some((nodeId) => !visibleNodeIds.has(nodeId))
  ) {
    ctx.addIssue({
      code: 'custom',
      path: [...pathPrefix, 'nodePositions'],
      message:
        'WorkspaceGraphAuthoringDraft nodePositions must exist for exactly the visible nodeIds.',
    });
  }

  const semanticNodeIds = new Set(graph.nodes.map((node) => node.id));
  if (semanticNodeIds.size !== graph.nodes.length) {
    ctx.addIssue({
      code: 'custom',
      path: [...pathPrefix, 'nodes'],
      message: 'WorkspaceGraphAuthoringDraft nodes must have unique ids.',
    });
  }

  graph.nodes.forEach((node, index) => {
    if (
      node.kind !== 'dvt:transform' ||
      node.metadata === undefined ||
      !Object.hasOwn(node.metadata, DVT_TRANSFORM_AUTHORING_AUTHORITY_METADATA_KEY)
    ) {
      return;
    }
    if (
      !DvtTransformAuthoringAuthorityV1Schema.safeParse(
        node.metadata[DVT_TRANSFORM_AUTHORING_AUTHORITY_METADATA_KEY]
      ).success
    ) {
      ctx.addIssue({
        code: 'custom',
        message: 'DVT Transform authoring metadata must contain canonical Substrait authority.',
        path: [
          ...pathPrefix,
          'nodes',
          index,
          'metadata',
          DVT_TRANSFORM_AUTHORING_AUTHORITY_METADATA_KEY,
        ],
      });
    }
  });

  for (const nodeId of graph.nodeIds) {
    if (!semanticNodeIds.has(nodeId)) {
      ctx.addIssue({
        code: 'custom',
        path: [...pathPrefix, 'nodeIds'],
        message:
          'WorkspaceGraphAuthoringDraft visible nodeIds must reference declared semantic nodes.',
      });
      break;
    }
  }

  const semanticEdgeIds = new Set(graph.edges.map((edge) => edge.id));
  if (semanticEdgeIds.size !== graph.edges.length) {
    ctx.addIssue({
      code: 'custom',
      path: [...pathPrefix, 'edges'],
      message: 'WorkspaceGraphAuthoringDraft edges must have unique ids.',
    });
  }

  for (const edge of graph.edges) {
    if (!semanticNodeIds.has(edge.sourceId) || !semanticNodeIds.has(edge.targetId)) {
      ctx.addIssue({
        code: 'custom',
        path: [...pathPrefix, 'edges'],
        message: 'WorkspaceGraphAuthoringDraft edges must reference declared semantic node ids.',
      });
      break;
    }
  }
}

function areCanvasDocumentsEquivalent(
  left: WorkspaceGraphAuthoringCanvasDocument,
  right: WorkspaceGraphAuthoringCanvasDocument
): boolean {
  return (
    left.id === right.id &&
    left.kind === right.kind &&
    left.title === right.title &&
    left.environmentId === right.environmentId &&
    left.defaultPermission === right.defaultPermission
  );
}

function areGraphShapesEquivalent(
  left: WorkspaceGraphAuthoringGraphShape,
  right: WorkspaceGraphAuthoringGraphShape
): boolean {
  return (
    JSON.stringify(left.nodeIds) === JSON.stringify(right.nodeIds) &&
    JSON.stringify(left.nodePositions) === JSON.stringify(right.nodePositions) &&
    JSON.stringify(left.nodes) === JSON.stringify(right.nodes) &&
    JSON.stringify(left.edges) === JSON.stringify(right.edges)
  );
}

export const WorkspaceGraphAuthoringDraftSchema = z
  .object({
    canvas: WorkspaceGraphAuthoringCanvasDocumentSchema,
    activeCanvasId: NonBlankStringSchema.optional(),
    canvases: z.array(WorkspaceGraphAuthoringCanvasWorkspaceSchema).optional(),
    nodeIds: z.array(NonBlankStringSchema),
    nodePositions: z.record(NonBlankStringSchema, WorkspaceGraphAuthoringNodePositionSchema),
    nodes: z.array(WorkspaceGraphAuthoringNodeSchema),
    edges: z.array(WorkspaceGraphAuthoringEdgeSchema),
  })
  .strict()
  .superRefine((draft, ctx) => {
    addGraphShapeIssues(draft, ctx);

    if (draft.canvases == null) {
      return;
    }

    if (draft.canvases.length === 0) {
      ctx.addIssue({
        code: 'custom',
        path: ['canvases'],
        message: 'WorkspaceGraphAuthoringDraft canvases must not be empty when declared.',
      });
      return;
    }

    const canvasIds = draft.canvases.map((workspace) => workspace.canvas.id);
    const canvasIdSet = new Set(canvasIds);
    if (canvasIdSet.size !== canvasIds.length) {
      ctx.addIssue({
        code: 'custom',
        path: ['canvases'],
        message: 'WorkspaceGraphAuthoringDraft canvases must have unique ids.',
      });
    }

    if (draft.activeCanvasId == null || !canvasIdSet.has(draft.activeCanvasId)) {
      ctx.addIssue({
        code: 'custom',
        path: ['activeCanvasId'],
        message:
          'WorkspaceGraphAuthoringDraft activeCanvasId must reference a declared canvas workspace.',
      });
    }

    draft.canvases.forEach((workspace, index) => {
      addGraphShapeIssues(workspace, ctx, ['canvases', index]);
    });

    const activeWorkspace = draft.canvases.find(
      (workspace) => workspace.canvas.id === draft.activeCanvasId
    );
    if (activeWorkspace == null) {
      return;
    }

    if (!areCanvasDocumentsEquivalent(draft.canvas, activeWorkspace.canvas)) {
      ctx.addIssue({
        code: 'custom',
        path: ['canvas'],
        message:
          'WorkspaceGraphAuthoringDraft canvas must mirror the active canvas workspace identity.',
      });
    }

    if (!areGraphShapesEquivalent(draft, activeWorkspace)) {
      ctx.addIssue({
        code: 'custom',
        path: ['canvases'],
        message:
          'WorkspaceGraphAuthoringDraft active canvas workspace must mirror the top-level graph.',
      });
    }
  }) satisfies z.ZodType<WorkspaceGraphAuthoringDraft>;
