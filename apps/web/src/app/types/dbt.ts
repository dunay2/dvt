// DBT Artifact Types

export type DbtNodeType =
  | 'SOURCE'
  | 'MODEL'
  | 'SEED'
  | 'SNAPSHOT'
  | 'TEST'
  | 'EXPOSURE'
  | 'METRIC'
  | 'MACRO';

export type NodeStatus = 'idle' | 'running' | 'success' | 'failed' | 'skipped' | 'warn';

export interface DbtNode {
  id: string;
  name: string;
  type: DbtNodeType;
  package: string;
  path: string;
  tags: string[];
  status: NodeStatus;
  lastDuration?: number;
  lastCost?: number;
  description?: string;
  config?: Record<string, any>;
  compiledSql?: string;
  dependencies: string[];
  columns?: DbtColumn[];
}

export interface DbtColumn {
  name: string;
  type: string;
  nullable: boolean;
  description?: string;
}

export interface DbtEdge {
  id: string;
  source: string;
  target: string;
  type: 'ref' | 'source' | 'test' | 'exposure' | 'metric';
}

export interface ExecutionPlan {
  planId: string;
  planVersion: string;
  generatedAt: string;
  adapter: string;
  target: string;
  steps: ExecutionStep[];
  estimatedCost?: number;
  capabilities: string[];
}

export interface ExecutionStep {
  id: string;
  type: 'DBT_COMPILE' | 'DBT_RUN' | 'DBT_TEST' | 'CUSTOM_PLUGIN_STEP';
  name: string;
  nodes: string[];
  policies: {
    retries?: number;
    timeout?: number;
    concurrency?: number;
    warehouse?: string;
  };
  status?: NodeStatus;
  duration?: number;
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
  stepId?: string;
  nodeId?: string;
  message: string;
  metadata?: Record<string, any>;
}

export interface Run {
  runId: string;
  planId: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  environment: string;
  gitSha: string;
  startTime: string;
  endTime?: string;
  duration?: number;
  events: RunEvent[];
  steps: ExecutionStep[];
  artifacts?: {
    manifest?: string;
    runResults?: string;
    catalog?: string;
  };
}

export interface DiffChange {
  id: string;
  nodeId: string;
  type: 'added' | 'removed' | 'changed';
  severity: 'breaking' | 'warning' | 'info';
  description: string;
  oldValue?: any;
  newValue?: any;
}

export interface Plugin {
  id: string;
  name: string;
  version: string;
  description: string;
  capabilities: string[];
  enabled: boolean;
  permissions: string[];
}

export interface Role {
  id: string;
  name: string;
  permissions: {
    canPlan: boolean;
    canRun: boolean;
    canEditEdges: boolean;
    canManagePlugins: boolean;
    canManageRBAC: boolean;
  };
  scope: {
    tenant?: string;
    project?: string;
    environment?: string;
  };
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  user: string;
  action: string;
  resource: string;
  details: string;
  status: 'success' | 'failed';
}
