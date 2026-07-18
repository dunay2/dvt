/** Owned concern: model the explicit file authority targeted by the contextual SQL workbench. */
export type SqlContextWorkbenchTarget =
  Readonly<{ kind: 'project' }> | Readonly<{ kind: 'node'; nodeId: string; initialPath: string }>;
