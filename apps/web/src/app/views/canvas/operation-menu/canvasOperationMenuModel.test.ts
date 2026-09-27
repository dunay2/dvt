/** Owned concern: preserve operation admission, grouping and localized presentation. */
import { describe, expect, it } from 'vitest';
import { canvasRelationalOperationPresentation } from '../canvasRelationalOperationPresentation';
import { resolveCanvasViewCopy } from '../canvasCopyCatalog';
import type {
  CanvasRelationalOperation,
  CanvasRelationalOperationChoice,
} from '../canvasRelationalOperationChoices';
import { buildCanvasOperationMenuItems } from './canvasOperationMenuModel';

const operations = Object.keys(
  canvasRelationalOperationPresentation
) as CanvasRelationalOperation[];
const choices: CanvasRelationalOperationChoice[] = operations.map((operation) => ({
  operation,
  availability: 'available',
  selectable: true,
}));
const build = (
  editable = true,
  language = 'en'
): ReturnType<typeof buildCanvasOperationMenuItems> =>
  buildCanvasOperationMenuItems({
    choices,
    editable,
    copy: resolveCanvasViewCopy(language === 'es' ? 'es' : 'en'),
  });
describe('operation menu read model', () => {
  it.each(operations)('preserves the canonical selector and catalog label for %s', (id) => {
    for (const language of ['en', 'es'] as const) {
      const item = build(true, language).find((candidate) => candidate.id === id)!;
      expect(item.label).toBe(
        resolveCanvasViewCopy(language)[canvasRelationalOperationPresentation[id].labelKey]
      );
      expect(item.group).toBe(id === 'projection' ? 'transform' : 'combine');
      expect(item.draggable).toBe(true);
    }
  });
  it('includes every unary choice without requiring a selected producer', () => {
    const items = build().filter(
      (item) => !operations.includes(item.id as CanvasRelationalOperation)
    );
    expect(items.map(({ id }) => id)).toEqual([
      'field_transform',
      'filter',
      'aggregate',
      'window',
      'sort',
      'fetch',
    ]);
    expect(items.find(({ id }) => id === 'sort')).toMatchObject({
      group: 'order',
      draggable: true,
      reason: null,
    });
    expect(items.find(({ id }) => id === 'filter')).toMatchObject({
      group: 'transform',
      reason: null,
      draggable: true,
    });
  });
  it('does not upgrade admission in read-only mode', () => {
    expect(build(false).every((item) => !item.draggable && item.reason != null)).toBe(true);
  });
});
