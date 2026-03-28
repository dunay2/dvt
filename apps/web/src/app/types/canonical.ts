export type CoreNodeRole = 'input' | 'transform' | 'check' | 'output' | 'control';

// ---------------------------------------------------------------------------
// Canonical task and run shapes
// ---------------------------------------------------------------------------

export type CanonicalTaskStatus =
  | 'pending'
  | 'running'
  | 'success'
  | 'failed'
  | 'skipped'
  | 'warn'
  | 'cancelled';

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

export type CanonicalRunStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';

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

export type CanonicalNodeStatus = 'idle' | 'running' | 'success' | 'failed' | 'skipped' | 'warn';

export type PluginNodeKind = `${string}:${string}`;

export type CanonicalEdgeRelation = 'lineage' | 'validation' | 'consumption' | 'metric' | 'custom';

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
