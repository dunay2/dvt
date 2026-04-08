import type { RunContext } from '../types/engine';

export interface WorkspaceScope {
  tenantId: string;
  projectId: string;
  environmentId: string;
  targetAdapter: RunContext['targetAdapter'];
}

export interface SessionContextPort {
  getWorkspaceScope(): WorkspaceScope;
  getWorkspaceScopeSnapshot(): WorkspaceScope;
  subscribeWorkspaceScope(onStoreChange: () => void): () => void;
  buildRunContext(runId: string): RunContext;
}
