/** Owned concern: detect graph-draft source removals that can change generated workspace files. */
import {
  ConnectedSourceRefSchema,
  type WorkspaceGraphAuthoringDraft,
  type WorkspaceGraphAuthoringNode,
} from '@dvt/contracts';

export function hasRemovedImportedWarehouseSource(
  previousDraft: WorkspaceGraphAuthoringDraft | null,
  nextDraft: WorkspaceGraphAuthoringDraft
): boolean {
  if (!previousDraft) return false;
  const nextBindings = collectImportedWarehouseSourceBindings(nextDraft);
  return [...collectImportedWarehouseSourceBindings(previousDraft)].some(
    (binding) => !nextBindings.has(binding)
  );
}

function collectImportedWarehouseSourceBindings(
  draft: WorkspaceGraphAuthoringDraft
): ReadonlySet<string> {
  const bindings = new Set<string>();
  for (const node of [
    ...draft.nodes,
    ...(draft.canvases?.flatMap((canvas) => canvas.nodes) ?? []),
  ]) {
    const binding = readImportedWarehouseSourceBinding(node);
    if (binding) bindings.add(binding);
  }
  return bindings;
}

function readImportedWarehouseSourceBinding(node: WorkspaceGraphAuthoringNode): string | null {
  if (node.pluginId !== 'dvt.warehouse-source' || node.kind !== 'dvt:source') return null;
  if (!ConnectedSourceRefSchema.safeParse(node.metadata?.connectedSourceRef).success) return null;
  const sourceName = node.metadata?.sourceName;
  const tableName = node.metadata?.tableName;
  if (
    typeof node.path !== 'string' ||
    typeof sourceName !== 'string' ||
    typeof tableName !== 'string'
  ) {
    return null;
  }
  return JSON.stringify([node.path, sourceName, tableName]);
}
