import {
  mockAuditLog,
  mockDiffChanges,
  mockEdges,
  mockNodes,
  mockPlugins,
  mockRoles,
} from '../../data/mockDbtData';
import type { AuditLogEntry, DbtEdge, DbtNode, DiffChange, Plugin, Role } from '../../types/dbt';
import { type ApiClient, createApiClient } from '../api/createApiClient';
import { resolveDataSource, type DataSourceMode } from '../config/dataSource';

export type WorkspaceGraphSnapshot = {
  nodes: DbtNode[];
  edges: DbtEdge[];
};

export interface WorkspaceService {
  getGraphSnapshot: () => Promise<WorkspaceGraphSnapshot>;
  getDiffChanges: () => Promise<DiffChange[]>;
  getPlugins: () => Promise<Plugin[]>;
  getRoles: () => Promise<Role[]>;
  getAuditLog: () => Promise<AuditLogEntry[]>;
}

function createMockWorkspaceService(): WorkspaceService {
  return {
    getGraphSnapshot: async () => ({
      nodes: mockNodes,
      edges: mockEdges,
    }),
    getDiffChanges: async () => mockDiffChanges,
    getPlugins: async () => mockPlugins,
    getRoles: async () => mockRoles,
    getAuditLog: async () => mockAuditLog,
  };
}

function createApiWorkspaceService(apiClient: ApiClient): WorkspaceService {
  return {
    getGraphSnapshot: () => apiClient.getJson<WorkspaceGraphSnapshot>('/workspace/graph'),
    getDiffChanges: () => apiClient.getJson<DiffChange[]>('/diff/changes'),
    getPlugins: () => apiClient.getJson<Plugin[]>('/plugins'),
    getRoles: () => apiClient.getJson<Role[]>('/admin/roles'),
    getAuditLog: () => apiClient.getJson<AuditLogEntry[]>('/admin/audit'),
  };
}

export function createWorkspaceService(
  mode: DataSourceMode = resolveDataSource(),
  apiClient: ApiClient = createApiClient()
): WorkspaceService {
  if (mode === 'api') {
    return createApiWorkspaceService(apiClient);
  }

  return createMockWorkspaceService();
}
