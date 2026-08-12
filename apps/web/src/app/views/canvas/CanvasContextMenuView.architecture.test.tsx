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
  it('reuses shared primitives and retires the duplicate Canvas menu implementation', () => {
    expect(existsSync(CANVAS_CONTEXT_MENU_PRIMITIVES_PATH)).toBe(false);
    expect(CANVAS_CONTEXT_MENU_VIEW_SOURCE).toContain("from '../../components/ui/context-menu'");
    expect(CANVAS_CONTEXT_MENU_VIEW_SOURCE).toContain("from '../../components/ui/dialog'");
    expect(CANVAS_CONTEXT_MENU_VIEW_SOURCE).toContain('ContextMenuContent');
    expect(CANVAS_CONTEXT_MENU_VIEW_SOURCE).toContain('ContextMenuItem');
    expect(CANVAS_CONTEXT_MENU_VIEW_SOURCE).toContain('ContextMenuTrigger');
    expect(CANVAS_CONTEXT_MENU_VIEW_SOURCE).not.toContain("from './CanvasContextMenuPrimitives'");
    expect(CANVAS_CONTEXT_MENU_VIEW_SOURCE).not.toContain('CONTEXT_MENU_SURFACE_CLASS_NAME');
    expect(CANVAS_CONTEXT_MENU_VIEW_SOURCE).not.toContain('CONTEXT_MENU_SECTION_TITLE_CLASS_NAME');
    expect(CANVAS_CONTEXT_MENU_VIEW_SOURCE).not.toContain('CONTEXT_MENU_ITEM_CLASS_NAME');
    expect(CANVAS_CONTEXT_MENU_VIEW_SOURCE).not.toContain('className="fixed z-50');
  });
});
