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
  kind: string;
  title: string;
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

export interface WorkspaceGraphAuthoringDraft {
  canvas: WorkspaceGraphAuthoringCanvasDocument;
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
    kind: NonBlankStringSchema,
    title: NonBlankStringSchema,
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

export const WorkspaceGraphAuthoringDraftSchema = z
  .object({
    canvas: WorkspaceGraphAuthoringCanvasDocumentSchema,
    nodeIds: z.array(NonBlankStringSchema),
    nodePositions: z.record(NonBlankStringSchema, WorkspaceGraphAuthoringNodePositionSchema),
    nodes: z.array(WorkspaceGraphAuthoringNodeSchema),
    edges: z.array(WorkspaceGraphAuthoringEdgeSchema),
  })
  .strict()
  .superRefine((draft, ctx) => {
    const visibleNodeIds = new Set<string>(draft.nodeIds);
    if (visibleNodeIds.size !== draft.nodeIds.length) {
      ctx.addIssue({
        code: 'custom',
        path: ['nodeIds'],
        message: 'WorkspaceGraphAuthoringDraft nodeIds must be unique.',
      });
    }

    const positionedNodeIds = Object.keys(draft.nodePositions);
    if (
      positionedNodeIds.length !== draft.nodeIds.length ||
      positionedNodeIds.some((nodeId) => !visibleNodeIds.has(nodeId))
    ) {
      ctx.addIssue({
        code: 'custom',
        path: ['nodePositions'],
        message:
          'WorkspaceGraphAuthoringDraft nodePositions must exist for exactly the visible nodeIds.',
      });
    }

    const semanticNodeIds = new Set(draft.nodes.map((node) => node.id));
    if (semanticNodeIds.size !== draft.nodes.length) {
      ctx.addIssue({
        code: 'custom',
        path: ['nodes'],
        message: 'WorkspaceGraphAuthoringDraft nodes must have unique ids.',
      });
    }

    for (const nodeId of draft.nodeIds) {
      if (!semanticNodeIds.has(nodeId)) {
        ctx.addIssue({
          code: 'custom',
          path: ['nodeIds'],
          message:
            'WorkspaceGraphAuthoringDraft visible nodeIds must reference declared semantic nodes.',
        });
        break;
      }
    }

    const semanticEdgeIds = new Set(draft.edges.map((edge) => edge.id));
    if (semanticEdgeIds.size !== draft.edges.length) {
      ctx.addIssue({
        code: 'custom',
        path: ['edges'],
        message: 'WorkspaceGraphAuthoringDraft edges must have unique ids.',
      });
    }

    for (const edge of draft.edges) {
      if (!semanticNodeIds.has(edge.sourceId) || !semanticNodeIds.has(edge.targetId)) {
        ctx.addIssue({
          code: 'custom',
          path: ['edges'],
          message: 'WorkspaceGraphAuthoringDraft edges must reference declared semantic node ids.',
        });
        break;
      }
    }
  }) satisfies z.ZodType<WorkspaceGraphAuthoringDraft>;
