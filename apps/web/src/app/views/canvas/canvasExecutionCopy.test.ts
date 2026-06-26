import { describe, expect, it } from 'vitest';

import { canvasViewExecutionCopyByKey } from './canvasCopyCatalog.execution';
import { canvasViewToolbarCopyByKey } from './canvasCopyCatalog.toolbar';

function executionFallbacks(): string[] {
  return Object.values(canvasViewExecutionCopyByKey).map((entry) => entry.fallback);
}

describe('canvas execution copy', () => {
  it('names user-visible preview actions without ambiguous Plan commands', () => {
    const visibleExecutionCopy = [
      ...executionFallbacks(),
      canvasViewToolbarCopyByKey.toolbarWorkflowPlanRequiredLabel.fallback,
    ].join('\n');

    expect(visibleExecutionCopy).toContain('Preview execution plan');
    expect(visibleExecutionCopy).toContain('Execution Preview');
    expect(visibleExecutionCopy).not.toMatch(/\b(?:run|re-run)[^\S\r\n]+Plan\b/i);
    expect(visibleExecutionCopy).not.toContain('Plan required');
  });
});
