/** Validate the interaction DTO arriving through the generic graph-node data seam. */
import type { GraphNodeMaterializationControl } from './graphNodeCardStrategyContracts';

export function readGraphNodeMaterializationControl(
  value: unknown
): GraphNodeMaterializationControl | undefined {
  if (value == null || typeof value !== 'object') return undefined;
  if (
    !('label' in value) ||
    typeof value.label !== 'string' ||
    !('value' in value) ||
    typeof value.value !== 'string' ||
    !('onChange' in value) ||
    typeof value.onChange !== 'function' ||
    ('disabled' in value && value.disabled != null && typeof value.disabled !== 'boolean') ||
    !('options' in value) ||
    !Array.isArray(value.options)
  )
    return undefined;
  const validOptions = value.options.every(
    (option: unknown) =>
      option != null &&
      typeof option === 'object' &&
      'value' in option &&
      typeof option.value === 'string' &&
      'label' in option &&
      typeof option.label === 'string'
  );
  return validOptions ? (value as GraphNodeMaterializationControl) : undefined;
}
