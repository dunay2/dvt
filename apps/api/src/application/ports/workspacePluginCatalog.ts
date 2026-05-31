/**
 * Owned concern: define the protected workspace plugin catalog query port.
 */

export interface WorkspacePluginCatalogScope {
  readonly tenantId: string;
  readonly projectId: string;
  readonly environmentId: string;
}

export interface WorkspacePluginDescriptor {
  readonly id: string;
  readonly name: string;
  readonly version: string;
  readonly description: string;
  readonly capabilities: readonly string[];
  readonly enabled: boolean;
  readonly permissions: readonly string[];
  readonly backendPluginId?: string;
}

export interface IWorkspacePluginCatalogRepository {
  migrate(): Promise<void>;
  listPlugins(scope: WorkspacePluginCatalogScope): Promise<readonly WorkspacePluginDescriptor[]>;
}
