/** Owned concern: nodePropertyPresentation. */

import type { CanvasNodePresentationCopy } from '../canvas/canvasNodePresentationCopy.contract';
import type { NodePropertyRow, NodePropertyTableRow } from './nodePropertiesContracts';

export function interpolatePresentationTemplate(
  template: string,
  values: Record<string, string>
): string {
  return Object.entries(values).reduce(
    (resolved, [key, value]) => resolved.replaceAll(`{${key}}`, value),
    template
  );
}

function localizePresentationValue(
  value: string,
  presentationCopy: CanvasNodePresentationCopy | undefined
): string {
  return presentationCopy?.valueLabels?.[value.trim().toLowerCase()] ?? value;
}

export function localizePropertyRows(
  rows: readonly NodePropertyRow[],
  presentationCopy: CanvasNodePresentationCopy | undefined
): readonly NodePropertyRow[] {
  return rows.map((row) => ({
    ...row,
    label: presentationCopy?.rowLabels?.[row.id] ?? row.label,
    value: localizePresentationValue(row.value, presentationCopy),
  }));
}

export function localizePropertyTableRows(
  rows: readonly NodePropertyTableRow[],
  presentationCopy: CanvasNodePresentationCopy | undefined
): readonly NodePropertyTableRow[] {
  return rows.map((row) => ({
    ...row,
    cells: Object.fromEntries(
      Object.entries(row.cells).map(([key, value]) => [
        key,
        localizePresentationValue(value, presentationCopy),
      ])
    ),
  }));
}
