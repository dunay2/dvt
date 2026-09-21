/** Owned concern: preserve operation admission, grouping and localized presentation. */
import { describe, expect, it } from 'vitest';
import { canvasRelationalOperationPresentation } from '../canvasRelationalOperationPresentation';
import { resolveCanvasViewCopy } from '../canvasCopyCatalog';
import type {
  CanvasRelationalOperation,
  CanvasRelationalOperationChoice,
} from '../canvasRelationalOperationChoices';
import { buildCanvasOperationMenuItems } from './canvasOperationMenuModel';
import { resolveCanvasOperationMenuCopy } from './canvasOperationMenuCopy';

const operations = Object.keys(
  canvasRelationalOperationPresentation
) as CanvasRelationalOperation[];
const choices: CanvasRelationalOperationChoice[] = operations.map((operation) => ({
  operation,
  availability: 'available',
  selectable: true,
}));
const build = (editable = true, language = 'en') =>
  buildCanvasOperationMenuItems({
    choices,
    tools: [{ id: 'sort', enabled: true, active: true, fields: [] }],
    operation: null,
    editable,
    copy: resolveCanvasViewCopy(language === 'es' ? 'es' : 'en'),
    menuCopy: resolveCanvasOperationMenuCopy(language),
  });
describe('operation menu read model', () => {
  it.each(operations)('preserves the canonical selector and catalog label for %s', (id) => {
    for (const language of ['en', 'es'] as const) {
      const item = build(true, language).find((candidate) => candidate.id === id)!;
      expect(item.label).toBe(
        resolveCanvasViewCopy(language)[canvasRelationalOperationPresentation[id].labelKey]
      );
      expect(item.group).toBe(id === 'projection' ? 'transform' : 'combine');
      expect(item.selectable).toBe(true);
      expect(item.draggable).toBe(true);
    }
  });
  it('includes every unary choice and keeps missing output unavailable', () => {
    const items = build().filter(
      (item) => !operations.includes(item.id as CanvasRelationalOperation)
    );
    expect(items.map(({ id }) => id)).toEqual(['filter', 'aggregate', 'window', 'sort', 'fetch']);
    expect(items.find(({ id }) => id === 'sort')).toMatchObject({
      group: 'order',
      active: true,
      selectable: true,
      draggable: false,
    });
    expect(items.find(({ id }) => id === 'filter')).toMatchObject({
      group: 'transform',
      selectable: false,
      reason: resolveCanvasOperationMenuCopy('en').needsOutput,
    });
  });
  it('does not upgrade admission in read-only mode', () => {
    expect(
      build(false).every((item) => !item.selectable && !item.draggable && item.reason != null)
    ).toBe(true);
  });
});
