/**
 * Owned concern: execute the protected ListWorkspacePlugins query.
 */
import type {
  IWorkspacePluginCatalogRepository,
  WorkspacePluginCatalogScope,
  WorkspacePluginDescriptor,
} from '../ports/workspacePluginCatalog.js';

export class ListWorkspacePluginsUseCase {
  public constructor(private readonly repository: IWorkspacePluginCatalogRepository) {}

  public execute(
    scope: WorkspacePluginCatalogScope
  ): Promise<readonly WorkspacePluginDescriptor[]> {
    return this.repository.listPlugins(scope);
  }
}
