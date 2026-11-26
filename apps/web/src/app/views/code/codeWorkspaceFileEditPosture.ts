/** Owned concern: resolve workspace-file editability from the active authoring authority. */

export type CodeWorkspaceFileAccess = 'read-only' | 'editable' | 'operation-sql';

export function isWorkspaceOperationSqlPath(path: string | undefined): boolean {
  return path !== undefined && /^operations\/(?:[^/]+\/)*[^/]+\.sql$/i.test(path);
}

export type CodeWorkspaceFileEditPosture =
  | Readonly<{ kind: 'editable' }>
  | Readonly<{ kind: 'workspace_read_only' }>
  | Readonly<{ kind: 'graph_owned_read_only' }>
  | Readonly<{ kind: 'authority_unavailable_read_only' }>;

function permitsWorkspaceEdit(
  access: CodeWorkspaceFileAccess | undefined,
  path: string | undefined
): boolean {
  if (access === 'operation-sql') return isWorkspaceOperationSqlPath(path);
  return access !== 'read-only';
}

export function resolveCodeWorkspaceFileEditPosture(args: {
  access?: CodeWorkspaceFileAccess;
  authority: 'graph-draft' | 'dbt-project-files' | 'missing' | 'mixed';
  selectedPath: string | undefined;
  graphOwnedPaths: ReadonlySet<string>;
}): CodeWorkspaceFileEditPosture {
  if (args.authority === 'missing' || args.authority === 'mixed') {
    return { kind: 'authority_unavailable_read_only' };
  }

  if (!permitsWorkspaceEdit(args.access, args.selectedPath)) {
    return { kind: 'workspace_read_only' };
  }

  if (args.authority !== 'graph-draft' || args.selectedPath === undefined)
    return { kind: 'editable' };
  return args.graphOwnedPaths.has(args.selectedPath)
    ? { kind: 'graph_owned_read_only' }
    : { kind: 'editable' };
}
