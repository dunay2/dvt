import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const SOURCE = readFileSync(
  join(import.meta.dirname, '../views/canvas/semanticWorkbenchProjection.ts'),
  'utf8'
);

describe('semantic workbench projection architecture', () => {
  it('delegates layout to the shared Canvas Dagre authority', () => {
    expect(SOURCE).toContain("from './canvasGraphUtils'");
    expect(SOURCE).toContain('getLayoutedElements(');
    expect(SOURCE).not.toContain("from 'dagre'");
    expect(SOURCE).not.toContain('dagre.layout');
  });

  it('preserves the retained relation identity projection', () => {
    expect(SOURCE).toContain('relationId: string;');
    expect(SOURCE).toContain('relationId,');
  });
});
