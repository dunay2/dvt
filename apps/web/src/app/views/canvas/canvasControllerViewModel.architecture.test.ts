import { describe, expect, it } from 'vitest';

import { readArchitectureSiblingSource } from '../architecture.test.support';

const VIEW_MODEL_SOURCE = readArchitectureSiblingSource(
  import.meta.dirname,
  'canvasControllerViewModel.ts'
);

describe('canvasControllerViewModel architecture', () => {
  it('delegates shell, interaction, execution, and draft slices to helper builders', () => {
    expect(VIEW_MODEL_SOURCE).toContain('buildCanvasShellViewModel');
    expect(VIEW_MODEL_SOURCE).toContain('buildCanvasInteractionViewModel');
    expect(VIEW_MODEL_SOURCE).toContain('buildCanvasExecutionViewModel');
    expect(VIEW_MODEL_SOURCE).toContain('buildCanvasDraftViewModel');
  });
});
