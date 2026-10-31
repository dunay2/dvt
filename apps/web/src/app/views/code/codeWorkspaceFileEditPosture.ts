/** Owned concern: resolve workspace-file editability from the active authoring authority. */

export type CodeWorkspaceFileAccess = 'read-only' | 'editable';

export type CodeWorkspaceFileEditPosture =
  | Readonly<{ kind: 'editable' }>
  | Readonly<{ kind: 'workspace_read_only' }>
  | Readonly<{ kind: 'graph_owned_read_only' }>
  | Readonly<{ kind: 'authority_unavailable_read_only' }>;

export function resolveCodeWorkspaceFileEditPosture(args: {
  access?: CodeWorkspaceFileAccess;
  authority: 'graph-draft' | 'dbt-project-files' | 'missing' | 'mixed';
  selectedPath: string | undefined;
  graphOwnedPaths: ReadonlySet<string>;
}): CodeWorkspaceFileEditPosture {
  if (args.authority === 'missing' || args.authority === 'mixed') {
    return { kind: 'authority_unavailable_read_only' };
  }

  if (args.access === 'read-only') {
    return { kind: 'workspace_read_only' };
  }

  if (
    args.authority === 'graph-draft' &&
    args.selectedPath !== undefined &&
    args.graphOwnedPaths.has(args.selectedPath)
  ) {
    return { kind: 'graph_owned_read_only' };
  }

  return { kind: 'editable' };
}
