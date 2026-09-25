/** Translate a card action into one ordered canonical output selection. */
import { SubstraitAnalysisError } from '@dvt/substrait-analysis';
import type {
  GraphNodeColumnOutputToggleIdentity,
  GraphNodeColumnReorderIdentity,
} from '../../plugins/graph/graphNodeColumnContracts';
import type { RelationOutputSlot } from './canvasRelationOutputSchema';

export type RelationOutputIntent =
  GraphNodeColumnOutputToggleIdentity | GraphNodeColumnReorderIdentity;

export function relationOutputIntent(
  slots: readonly RelationOutputSlot[],
  intent: RelationOutputIntent
) {
  const field = slots.find((slot) => slot.key === intent.columnId);
  if (field == null)
    throw new SubstraitAnalysisError('invalid_binding', 'Field is outside the selected output.');
  const selected = slots
    .filter((slot) => slot.output != null)
    .sort((a, b) => a.output!.outputOrdinal - b.output!.outputOrdinal);
  if ('output' in intent && !intent.output)
    return selected
      .filter((slot) => slot !== field)
      .map((slot) => ({ slot: slot.slot, alias: slot.name }));
  if (!('output' in intent) && field.output == null)
    throw new SubstraitAnalysisError('invalid_binding', 'Cannot reorder an excluded field.');
  const placement = 'output' in intent ? intent.placement : intent;
  if (placement == null)
    return (field.output == null ? [...selected, field] : selected).map((slot) => ({
      slot: slot.slot,
      alias: slot.name,
    }));
  const remaining = selected.filter((slot) => slot !== field);
  const index = remaining.findIndex((slot) => slot.key === placement.targetColumnId);
  if (index < 0)
    throw new SubstraitAnalysisError('invalid_binding', 'Placement needs another selected output.');
  remaining.splice(index + (placement.placement === 'after' ? 1 : 0), 0, field);
  return remaining.map((slot) => ({ slot: slot.slot, alias: slot.name }));
}
