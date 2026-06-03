/**
 * Owned concern: define serializable aggregate commands for editable workspace
 * graph authoring drafts.
 *
 * These commands describe pure aggregate mutations only. Application concerns
 * such as auth, idempotency, audit, compare-and-swap, and transport metadata
 * belong outside this contract.
 *
 * @baseline ADR-0035: Planner Public Contract Evolution Protocol
 * @decision Model workspace graph edits as aggregate commands instead of transport-specific patches.
 * @consequence Canvas authoring can evolve without duplicating planner command semantics.
 * @version 1.0.0
 */
import { z } from 'zod';

import {
  WorkspaceGraphAuthoringEdgeSchema,
  WorkspaceGraphAuthoringNodePositionSchema,
  WorkspaceGraphAuthoringNodeSchema,
} from './WorkspaceGraphAuthoringDraft.v1.js';

export const WORKSPACE_GRAPH_AUTHORING_COMMAND_TYPE = {
  addNode: 'add_node',
  updateNode: 'update_node',
  removeNode: 'remove_node',
  moveNode: 'move_node',
  connectNodes: 'connect_nodes',
  disconnectNodes: 'disconnect_nodes',
  applyImport: 'apply_import',
} as const;

export type WorkspaceGraphAuthoringCommandType =
  (typeof WORKSPACE_GRAPH_AUTHORING_COMMAND_TYPE)[keyof typeof WORKSPACE_GRAPH_AUTHORING_COMMAND_TYPE];

const NodeIdSchema = WorkspaceGraphAuthoringNodeSchema.shape.id;
const NodePatchSchema = WorkspaceGraphAuthoringNodeSchema.omit({ id: true }).partial().strict();

export const WorkspaceGraphAuthoringCommandSchema = z.discriminatedUnion('type', [
  z
    .object({
      type: z.literal(WORKSPACE_GRAPH_AUTHORING_COMMAND_TYPE.addNode),
      node: WorkspaceGraphAuthoringNodeSchema,
      position: WorkspaceGraphAuthoringNodePositionSchema,
    })
    .strict(),
  z
    .object({
      type: z.literal(WORKSPACE_GRAPH_AUTHORING_COMMAND_TYPE.updateNode),
      nodeId: NodeIdSchema,
      patch: NodePatchSchema,
    })
    .strict(),
  z
    .object({
      type: z.literal(WORKSPACE_GRAPH_AUTHORING_COMMAND_TYPE.removeNode),
      nodeId: NodeIdSchema,
    })
    .strict(),
  z
    .object({
      type: z.literal(WORKSPACE_GRAPH_AUTHORING_COMMAND_TYPE.moveNode),
      nodeId: NodeIdSchema,
      position: WorkspaceGraphAuthoringNodePositionSchema,
    })
    .strict(),
  z
    .object({
      type: z.literal(WORKSPACE_GRAPH_AUTHORING_COMMAND_TYPE.connectNodes),
      edge: WorkspaceGraphAuthoringEdgeSchema,
    })
    .strict(),
  z
    .object({
      type: z.literal(WORKSPACE_GRAPH_AUTHORING_COMMAND_TYPE.disconnectNodes),
      edgeId: NodeIdSchema,
    })
    .strict(),
  z
    .object({
      type: z.literal(WORKSPACE_GRAPH_AUTHORING_COMMAND_TYPE.applyImport),
      nodes: z.array(WorkspaceGraphAuthoringNodeSchema),
      edges: z.array(WorkspaceGraphAuthoringEdgeSchema),
      nodePositions: z.record(NodeIdSchema, WorkspaceGraphAuthoringNodePositionSchema),
    })
    .strict(),
]);

export type WorkspaceGraphAuthoringNodePatch = z.infer<typeof NodePatchSchema>;
export type WorkspaceGraphAuthoringCommand = z.infer<typeof WorkspaceGraphAuthoringCommandSchema>;
