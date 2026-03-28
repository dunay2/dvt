export type CoreNodeRole = 'input' | 'transform' | 'check' | 'output' | 'control';

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
