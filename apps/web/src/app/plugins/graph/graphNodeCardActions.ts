/** Owned concern: derive node-card action affordances from renderer input data. */

export type GraphNodeCardPlayAction = Readonly<{
  label: string;
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
  return {
    label: selectedForExecution ? 'Deselect for execution' : 'Select for execution',
    onPress: () => {
      toggleNodeSelection(nodeId, !selectedForExecution);
    },
  };
}
