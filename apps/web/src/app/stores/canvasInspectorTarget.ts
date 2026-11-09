/** Owned concern: identify one scoped Inspector resource without graph placement or execution identity. */
import type { DbtProjectFilesAuthorityBinding } from '../ports/dbtProjectGraph';
import type { WorkspaceScope } from '../ports/sessionContext';

export type CanvasInspectorResource =
  | Readonly<{ kind: 'canonical-node'; nodeId: string }>
  | Readonly<{
      kind: 'dbt-file-model';
      binding: DbtProjectFilesAuthorityBinding;
      uniqueId: string;
    }>;

export type CanvasInspectorWorkspaceScope = Readonly<
  Pick<WorkspaceScope, 'tenantId' | 'projectId' | 'environmentId'>
>;

export type CanvasInspectorTarget = CanvasInspectorResource &
  Readonly<{ workspaceScope: CanvasInspectorWorkspaceScope }>;

/** Existing graph-card calls use a canonical ID; catalogue files carry their actual authority. */
export type CanvasInspectorRequest = string | CanvasInspectorResource;

export type CanvasInspectorCommand = (
  request: CanvasInspectorRequest,
  preferredTabId?: string | null
) => void | boolean | Promise<void | boolean>;

export function isCanvasInspectorScopeCurrent(
  captured: CanvasInspectorWorkspaceScope | undefined,
  current: CanvasInspectorWorkspaceScope
): boolean {
  return (
    captured?.tenantId === current.tenantId &&
    captured.projectId === current.projectId &&
    captured.environmentId === current.environmentId
  );
}
