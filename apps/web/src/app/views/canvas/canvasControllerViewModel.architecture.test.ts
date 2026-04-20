import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const VIEW_MODEL_SOURCE = readFileSync(
  path.resolve(import.meta.dirname, 'canvasControllerViewModel.ts'),
  'utf8'
);

describe('canvasControllerViewModel architecture', () => {
  it('delegates shell, interaction, execution, and draft slices to helper builders', () => {
    expect(VIEW_MODEL_SOURCE).toContain('buildCanvasShellViewModel');
    expect(VIEW_MODEL_SOURCE).toContain('buildCanvasInteractionViewModel');
    expect(VIEW_MODEL_SOURCE).toContain('buildCanvasExecutionViewModel');
    expect(VIEW_MODEL_SOURCE).toContain('buildCanvasDraftViewModel');
  });
});
