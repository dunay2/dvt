/** Owned concern: derive node-card action affordances from renderer input data. */

export type GraphNodeCardPlayAction = Readonly<{
  label: string;
  visualState: 'select' | 'deselect';
  disabled?: boolean;
  onPress: () => void;
}>;

type BuildGraphNodeCardPlayActionArgs = Readonly<{
  nodeId: string;
  data: Record<string, unknown>;
}>;

export function buildGraphNodeCardPlayAction({
  nodeId,
  data,
}: BuildGraphNodeCardPlayActionArgs): GraphNodeCardPlayAction | null {
  const toggleNodeSelection = data.onToggleNodeSelection;
  if (typeof toggleNodeSelection !== 'function') {
    return null;
  }

  const selectedForExecution = data.selectedForExecution === true;
  const selectionCopy = data.executionSelectionCopy as
    Readonly<{ selectLabel?: unknown; deselectLabel?: unknown }> | undefined;
  const selectLabel =
    typeof selectionCopy?.selectLabel === 'string'
      ? selectionCopy.selectLabel
      : 'Select for execution';
  const deselectLabel =
    typeof selectionCopy?.deselectLabel === 'string'
      ? selectionCopy.deselectLabel
      : 'Deselect for execution';
  return {
    label: selectedForExecution ? deselectLabel : selectLabel,
    visualState: selectedForExecution ? 'deselect' : 'select',
    onPress: () => {
      toggleNodeSelection(nodeId, !selectedForExecution);
    },
  };
}
