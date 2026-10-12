/** Compose already resolved column facts; no relation inspection or execution admission. */
import type {
  CanvasNodeColumnTruth,
  CanvasNodePresentationColumn,
} from '../../components/canvas/canvasNodePresentationTruth.contract';
import { projectTransformColumnsInStableOrder } from './canvasTransformColumnOrderProjection';

export function canvasColumnTruth(
  declared: readonly CanvasNodePresentationColumn[],
  inherited: readonly CanvasNodePresentationColumn[],
  visible: readonly CanvasNodePresentationColumn[] = declared.length > 0 ? declared : inherited
): CanvasNodeColumnTruth {
  const hasDeclared = visible.some((column) => column.provenance === 'declared');
  const hasInherited = visible.some((column) => column.provenance === 'inherited');
  return {
    declared,
    inherited,
    visible,
    declaredCount: declared.length,
    inheritedCount: inherited.length,
    visibleCount: visible.length,
    visibleProvenance: hasDeclared
      ? hasInherited
        ? 'mixed'
        : 'declared'
      : hasInherited
        ? 'inherited'
        : 'none',
  };
}

export function projectSemanticColumns(
  declared: readonly CanvasNodePresentationColumn[],
  inherited: readonly CanvasNodePresentationColumn[]
): CanvasNodeColumnTruth {
  const visible = projectTransformColumnsInStableOrder({
    declared,
    inherited,
    outputs: declared.map((column) => ({
      ...column,
      selectsSourceField: column.children == null && (column.operations?.length ?? 0) === 0,
    })),
  });
  return canvasColumnTruth(declared, inherited, visible);
}

export function projectSourceSelection(
  physical: readonly CanvasNodePresentationColumn[],
  outputs: readonly CanvasNodePresentationColumn[]
): CanvasNodeColumnTruth {
  const byName = new Map(physical.map((column) => [column.name, column]));
  const selected = outputs.map((output) => ({
    ...byName.get(output.sourceFieldName ?? output.name),
    ...output,
    reference: undefined,
    selected: true,
  }));
  const names = new Set(selected.map((column) => column.name));
  const visible = [
    ...selected,
    ...physical
      .filter((column) => !names.has(column.name))
      .map((column) => ({ ...column, selected: false })),
  ];
  return canvasColumnTruth(visible, [], visible);
}
