// Node types in dbt
export type NodeType =
  | 'SOURCE'
  | 'MODEL'
  | 'SEED'
  | 'SNAPSHOT'
  | 'TEST'
  | 'EXPOSURE'
  | 'METRIC'
  | 'MACRO';

// Node status
export type NodeStatus = 'idle' | 'running' | 'success' | 'failed' | 'skipped' | 'warning';

// dbt Node
export interface DbtNode {
  id: string;
  uniqueId: string;
  name: string;
  type: NodeType;
  packageName: string;
  path: string;
  tags: string[];
  status: NodeStatus;
  lastDuration?: number; // in ms
  lastCost?: number;
  config?: Record<string, any>;
  compiledSql?: string;
  columns?: DbtColumn[];
  tests?: DbtTest[];
  dependencies: string[]; // uniqueIds of dependencies
}

export interface DbtColumn {
  name: string;
  type: string;
  nullable: boolean;
  description?: string;
}

export interface DbtTest {
  id: string;
  name: string;
  status: NodeStatus;
  lastRun?: string;
}

// Execution Plan
export interface ExecutionPlan {
  planId: string;
  planVersion: string;
  generatedAt: string;
  adapter: string;
  target: string;
  steps: ExecutionStep[];
  estimatedCost?: number;
  estimatedDuration?: number;
}

export interface ExecutionStep {
  id: string;
  type: 'DBT_COMPILE' | 'DBT_RUN' | 'DBT_TEST' | 'CUSTOM_PLUGIN_STEP';
  nodes: string[];
  policies: {
    retries: number;
    timeout: number;
    concurrency: number;
    warehouse?: string;
  };
  status?: NodeStatus;
  startedAt?: string;
  completedAt?: string;
  duration?: number;
}

// Run
export interface DbtRun {
  runId: string;
  status: 'queued' | 'running' | 'success' | 'failed' | 'cancelled';
  environment: string;
  gitSha: string;
  gitBranch: string;
  startedAt: string;
  completedAt?: string;
  duration?: number;
  steps: ExecutionStep[];
  events: RunEvent[];
}

export interface RunEvent {
  id: string;
  timestamp: string;
  type:
    | 'StepStarted'
    | 'StepCompleted'
    | 'StepFailed'
    | 'NodeStarted'
    | 'NodeCompleted'
    | 'NodeFailed';
  message: string;
  stepId?: string;
  nodeId?: string;
}

// Connection Status
export type ConnectionStatus = 'ok' | 'degraded' | 'offline';

// Environment
export type Environment = 'dev' | 'stage' | 'prod';

// Impact Analysis
export interface ImpactAnalysis {
  nodeId: string;
  upstreamCount: number;
  downstreamCount: number;
  exposuresAffected: string[];
  breakingChanges: BreakingChange[];
  testsAtRisk: number;
}

export interface BreakingChange {
  type: 'column_removed' | 'column_renamed' | 'type_changed';
  columnName: string;
  oldValue?: string;
  newValue?: string;
  severity: 'low' | 'medium' | 'high';
}

// Diff
export interface DiffResult {
  diffId: string;
  shaA: string;
  shaB: string;
  nodesAdded: string[];
  nodesRemoved: string[];
  nodesChanged: DiffNodeChange[];
  catalogDiff: CatalogDiff[];
}

export interface DiffNodeChange {
  nodeId: string;
  sqlChanged: boolean;
  configChanged: boolean;
}

export interface CatalogDiff {
  nodeId: string;
  columnsAdded: string[];
  columnsRemoved: string[];
  typeChanges: Array<{
    column: string;
    oldType: string;
    newType: string;
  }>;
}

// Plugin
export interface Plugin {
  id: string;
  name: string;
  version: string;
  description: string;
  capabilities: ('custom_nodes' | 'validators' | 'panels' | 'cost_policies')[];
  permissionsRequested: string[];
  enabled: boolean;
  installedAt: string;
}

// RBAC
export interface Role {
  id: string;
  name: string;
  description: string;
  permissions: Permission[];
}

export interface Permission {
  resource: string;
  actions: ('read' | 'plan' | 'run' | 'edit')[];
  scope: {
    tenant?: string;
    project?: string;
    environment?: Environment;
  };
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  action: string;
  resource: string;
  details: string;
}
