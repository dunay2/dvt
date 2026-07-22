/** Owned concern: resolve workspace-file editability from the active authoring authority. */

export type CodeWorkspaceFileEditPosture =
  Readonly<{ kind: 'editable' }> | Readonly<{ kind: 'graph_owned_read_only' }>;

export function resolveCodeWorkspaceFileEditPosture(args: {
  authority: 'graph-draft' | 'dbt-project-files';
  selectedPath: string | undefined;
  graphOwnedPaths: ReadonlySet<string>;
}): CodeWorkspaceFileEditPosture {
  if (
    args.authority === 'graph-draft' &&
    args.selectedPath !== undefined &&
    args.graphOwnedPaths.has(args.selectedPath)
  ) {
    return { kind: 'graph_owned_read_only' };
  }

  return { kind: 'editable' };
}
