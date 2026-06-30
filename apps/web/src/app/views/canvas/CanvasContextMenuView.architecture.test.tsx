import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import { readArchitectureSiblingSource } from '../architecture.test.support';

const CANVAS_CONTEXT_MENU_VIEW_SOURCE = readArchitectureSiblingSource(
  import.meta.dirname,
  'CanvasContextMenuView.tsx'
);
const CANVAS_CONTEXT_MENU_PRIMITIVES_PATH = resolve(
  import.meta.dirname,
  'CanvasContextMenuPrimitives.tsx'
);

describe('CanvasContextMenuView architecture', () => {
  it('keeps Canvas context menu presentation in primitives instead of ad hoc view markup', () => {
    expect(existsSync(CANVAS_CONTEXT_MENU_PRIMITIVES_PATH)).toBe(true);
    expect(CANVAS_CONTEXT_MENU_VIEW_SOURCE).toContain("from './CanvasContextMenuPrimitives'");
    expect(CANVAS_CONTEXT_MENU_VIEW_SOURCE).toContain('CanvasContextMenuSurface');
    expect(CANVAS_CONTEXT_MENU_VIEW_SOURCE).toContain('CanvasContextMenuSection');
    expect(CANVAS_CONTEXT_MENU_VIEW_SOURCE).toContain('CanvasContextMenuItem');
    expect(CANVAS_CONTEXT_MENU_VIEW_SOURCE).not.toContain('CONTEXT_MENU_SURFACE_CLASS_NAME');
    expect(CANVAS_CONTEXT_MENU_VIEW_SOURCE).not.toContain('CONTEXT_MENU_SECTION_TITLE_CLASS_NAME');
    expect(CANVAS_CONTEXT_MENU_VIEW_SOURCE).not.toContain('CONTEXT_MENU_ITEM_CLASS_NAME');
    expect(CANVAS_CONTEXT_MENU_VIEW_SOURCE).not.toContain('className="fixed z-50');
  });
});
