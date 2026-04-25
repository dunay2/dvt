/** Owned concern: define canonical graph primitive contracts shared across web plugins and views. */
export const CORE_NODE_ROLES = ['input', 'transform', 'check', 'output', 'control'] as const;
export type CoreNodeRole = (typeof CORE_NODE_ROLES)[number];

// ---------------------------------------------------------------------------
// Canonical task and run shapes
// ---------------------------------------------------------------------------

export const CANONICAL_NODE_DRAG_MIME_TYPE = 'application/x-dvt-canonical-node';

export const CANONICAL_TASK_STATUSES = [
  'pending',
  'running',
  'success',
  'failed',
  'skipped',
  'warn',
  'cancelled',
] as const;
export type CanonicalTaskStatus = (typeof CANONICAL_TASK_STATUSES)[number];

export interface CanonicalTask {
  taskId: string;
  runId: string;
  nodeId: string;
  pluginId: string;
  status: CanonicalTaskStatus;
  startedAt?: string;
  finishedAt?: string;
  durationMs?: number;
  logs?: string[];
  errorMessage?: string;
  metadata?: Record<string, unknown>;
}

export const CANONICAL_RUN_STATUSES = [
  'pending',
  'running',
  'completed',
  'failed',
  'cancelled',
] as const;
export type CanonicalRunStatus = (typeof CANONICAL_RUN_STATUSES)[number];

export interface CanonicalRun {
  runId: string;
  planId: string;
  pluginId: string;
  status: CanonicalRunStatus;
  startedAt: string;
  finishedAt?: string;
  durationMs?: number;
  environment: string;
  gitSha?: string;
  tasks: CanonicalTask[];
  metadata?: Record<string, unknown>;
}

export const CANONICAL_NODE_STATUSES = [
  'idle',
  'running',
  'success',
  'failed',
  'skipped',
  'warn',
] as const;
export type CanonicalNodeStatus = (typeof CANONICAL_NODE_STATUSES)[number];

export type PluginNodeKind = `${string}:${string}`;

export const CANONICAL_EDGE_RELATIONS = [
  'lineage',
  'validation',
  'consumption',
  'metric',
  'custom',
] as const;
export type CanonicalEdgeRelation = (typeof CANONICAL_EDGE_RELATIONS)[number];

export interface CanonicalNode {
  id: string;
  name: string;
  pluginId: string;
  kind: PluginNodeKind;
  role: CoreNodeRole;
  status: CanonicalNodeStatus;
  tags: string[];
  path?: string;
  description?: string;
  lastDuration?: number;
  lastCost?: number;
  metadata?: Record<string, unknown>;
}

export interface CanonicalEdge {
  id: string;
  sourceId: string;
  targetId: string;
  relation: CanonicalEdgeRelation;
  metadata?: Record<string, unknown>;
}
