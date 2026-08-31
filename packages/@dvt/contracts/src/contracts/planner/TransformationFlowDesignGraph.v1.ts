/**
 * SQL-first transformation design-graph contract (TF-A1-A).
 *
 * Baseline ADRs:
 * - ADR-0005 contract formalization tooling
 * - ADR-0006 repository-authoritative contract governance
 * - ADR-0018 shared-kernel ownership governance
 */
import { z } from 'zod';

import { isNonBlankString, NON_BLANK_STRING_MESSAGE } from '../../utils/contractPrimitives.js';
import { ConnectionRefSchema, type ConnectionRef } from '../source-import/ConnectedSourceRef.v1.js';

import type { GenericGraphSourceV1 } from './ExecutionPlan.v1.js';
import { GitArtifactRefSchema, type GitArtifactRef } from './PlanPreviewProvenance.v1.js';

const NonBlankStringSchema = z
  .string()
  .min(1)
  .refine((value) => isNonBlankString(value), {
    message: NON_BLANK_STRING_MESSAGE,
  })
  .brand<'NonBlankString'>();
export const TRANSFORMATION_EXECUTION_TARGET = 'postgres' as const;
export const TRANSFORMATION_DESIGN_GRAPH_SOURCE_FAMILY = 'transformation-design-graph' as const;
export const TRANSFORMATION_SQL_FIRST_SOURCE_VERSION = 'transformation-sql-first-v2' as const;

export type TransformationExecutionTarget = typeof TRANSFORMATION_EXECUTION_TARGET;
export type DesignNodeType = 'source' | 'sql_transform' | 'sink';

export interface DesignGraphContext {
  tenantId: string;
  projectId: string;
  environmentId: string;
  executionTarget: TransformationExecutionTarget;
  requestedBy?: string | undefined;
}

export interface DesignGraphSourceNode {
  id: string;
  type: 'source';
  payload: {
    kind: 'postgres_table';
    connectionRef: ConnectionRef;
    schema: string;
    table: string;
    alias: string;
  };
}

export interface DesignGraphSqlTransformNode {
  id: string;
  type: 'sql_transform';
  payload: {
    dialect: 'postgres';
    sqlArtifact: GitArtifactRef;
    entrypoint: string;
  };
}

export interface DesignGraphSinkNode {
  id: string;
  type: 'sink';
  payload: {
    kind: 'postgres_table';
    schema: string;
    table: string;
    materialization: 'table' | 'view';
    writeMode: 'replace' | 'append';
  };
}

export type DesignGraphNode =
  DesignGraphSourceNode | DesignGraphSqlTransformNode | DesignGraphSinkNode;

export interface DesignGraphEdge {
  fromNodeId: string;
  toNodeId: string;
}

export interface DesignGraphDraft {
  context: DesignGraphContext;
  nodes: readonly DesignGraphNode[];
  edges: readonly DesignGraphEdge[];
}

export interface TransformationSqlFirstGraphSourceV2 extends GenericGraphSourceV1 {
  sourceFamily: typeof TRANSFORMATION_DESIGN_GRAPH_SOURCE_FAMILY;
  sourceVersion: typeof TRANSFORMATION_SQL_FIRST_SOURCE_VERSION;
}

const DesignGraphContextSchema = z
  .object({
    tenantId: NonBlankStringSchema,
    projectId: NonBlankStringSchema,
    environmentId: NonBlankStringSchema,
    executionTarget: z.literal(TRANSFORMATION_EXECUTION_TARGET),
    requestedBy: NonBlankStringSchema.optional(),
  })
  .strict() satisfies z.ZodType<DesignGraphContext>;

const DesignGraphSourceNodeSchema = z
  .object({
    id: NonBlankStringSchema,
    type: z.literal('source'),
    payload: z
      .object({
        kind: z.literal('postgres_table'),
        connectionRef: ConnectionRefSchema.refine(
          (connectionRef) => connectionRef.provider === 'postgres',
          {
            message: 'SQL-first design sources require provider postgres.',
            path: ['provider'],
          }
        ),
        schema: NonBlankStringSchema,
        table: NonBlankStringSchema,
        alias: NonBlankStringSchema,
      })
      .strict(),
  })
  .strict() satisfies z.ZodType<DesignGraphSourceNode>;

const DesignGraphSqlTransformNodeSchema = z
  .object({
    id: NonBlankStringSchema,
    type: z.literal('sql_transform'),
    payload: z
      .object({
        dialect: z.literal('postgres'),
        sqlArtifact: GitArtifactRefSchema,
        entrypoint: NonBlankStringSchema,
      })
      .strict(),
  })
  .strict() satisfies z.ZodType<DesignGraphSqlTransformNode>;

const DesignGraphSinkNodeSchema = z
  .object({
    id: NonBlankStringSchema,
    type: z.literal('sink'),
    payload: z
      .object({
        kind: z.literal('postgres_table'),
        schema: NonBlankStringSchema,
        table: NonBlankStringSchema,
        materialization: z.enum(['table', 'view']),
        writeMode: z.enum(['replace', 'append']),
      })
      .strict(),
  })
  .strict() satisfies z.ZodType<DesignGraphSinkNode>;

const DesignGraphNodeSchema = z.discriminatedUnion('type', [
  DesignGraphSourceNodeSchema,
  DesignGraphSqlTransformNodeSchema,
  DesignGraphSinkNodeSchema,
]) satisfies z.ZodType<DesignGraphNode>;

const DesignGraphEdgeSchema = z
  .object({
    fromNodeId: NonBlankStringSchema,
    toNodeId: NonBlankStringSchema,
  })
  .strict() satisfies z.ZodType<DesignGraphEdge>;

export const DesignGraphDraftSchema = z
  .object({
    context: DesignGraphContextSchema,
    nodes: z.array(DesignGraphNodeSchema),
    edges: z.array(DesignGraphEdgeSchema),
  })
  .strict()
  .superRefine((draft, ctx) => {
    const nodeIds = draft.nodes.map((node) => node.id);
    const uniqueNodeIds = new Set(nodeIds);
    if (uniqueNodeIds.size !== nodeIds.length) {
      ctx.addIssue({
        code: 'custom',
        path: ['nodes'],
        message: 'DesignGraphDraft nodes must have unique ids.',
      });
    }

    const sourceNodes = draft.nodes.filter((node) => node.type === 'source');
    const transformNodes = draft.nodes.filter((node) => node.type === 'sql_transform');
    const sinkNodes = draft.nodes.filter((node) => node.type === 'sink');

    if (sourceNodes.length < 1 || sourceNodes.length > 2) {
      ctx.addIssue({
        code: 'custom',
        path: ['nodes'],
        message: 'DesignGraphDraft requires one or two source nodes.',
      });
    }
    if (transformNodes.length !== 1) {
      ctx.addIssue({
        code: 'custom',
        path: ['nodes'],
        message: 'DesignGraphDraft requires exactly one sql_transform node.',
      });
    }
    if (sinkNodes.length !== 1) {
      ctx.addIssue({
        code: 'custom',
        path: ['nodes'],
        message: 'DesignGraphDraft requires exactly one sink node.',
      });
    }

    if (draft.edges.length !== sourceNodes.length + 1) {
      ctx.addIssue({
        code: 'custom',
        path: ['edges'],
        message: 'DesignGraphDraft requires every source to feed the transform and one sink edge.',
      });
    }

    const firstSourceConnection = sourceNodes[0]?.payload.connectionRef;
    if (
      firstSourceConnection !== undefined &&
      sourceNodes.some(
        (sourceNode) =>
          sourceNode.payload.connectionRef.schemaVersion !== firstSourceConnection.schemaVersion ||
          sourceNode.payload.connectionRef.provider !== firstSourceConnection.provider ||
          sourceNode.payload.connectionRef.connectionId !== firstSourceConnection.connectionId
      )
    ) {
      ctx.addIssue({
        code: 'custom',
        path: ['nodes'],
        message: 'DesignGraphDraft sources must use the same complete ConnectionRef.',
      });
    }

    const knownIds = new Set(nodeIds);
    const edgeKeys = new Set<string>();
    for (const edge of draft.edges) {
      if (!knownIds.has(edge.fromNodeId) || !knownIds.has(edge.toNodeId)) {
        ctx.addIssue({
          code: 'custom',
          path: ['edges'],
          message: 'DesignGraphDraft edges must reference known node ids.',
        });
      }

      const key = `${edge.fromNodeId}->${edge.toNodeId}`;
      if (edgeKeys.has(key)) {
        ctx.addIssue({
          code: 'custom',
          path: ['edges'],
          message: 'DesignGraphDraft edges must be unique.',
        });
      }
      edgeKeys.add(key);
    }

    const transformNode = transformNodes[0];
    const sinkNode = sinkNodes[0];
    if (sourceNodes.length > 0 && transformNode && sinkNode) {
      const expectedEdges = new Set([
        ...sourceNodes.map((sourceNode) => `${sourceNode.id}->${transformNode.id}`),
        `${transformNode.id}->${sinkNode.id}`,
      ]);
      if (edgeKeys.size !== expectedEdges.size) {
        ctx.addIssue({
          code: 'custom',
          path: ['edges'],
          message:
            'DesignGraphDraft edges must match the governed source(s) -> sql_transform -> sink chain.',
        });
      }
      for (const expectedEdge of expectedEdges) {
        if (!edgeKeys.has(expectedEdge)) {
          ctx.addIssue({
            code: 'custom',
            path: ['edges'],
            message:
              'DesignGraphDraft edges must match the governed source(s) -> sql_transform -> sink chain.',
          });
          break;
        }
      }
    }
  }) satisfies z.ZodType<DesignGraphDraft>;
