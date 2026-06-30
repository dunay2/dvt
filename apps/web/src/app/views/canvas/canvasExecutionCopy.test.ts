import { describe, expect, it } from 'vitest';

import { canvasViewExecutionCopyByKey } from './canvasCopyCatalog.execution';
import { canvasViewExecutionCopyEs } from './canvasCopyCatalog.execution.es';
import { canvasViewToolbarCopyEs } from './canvasCopyCatalog.toolbar.es';
import { canvasViewToolbarCopyByKey } from './canvasCopyCatalog.toolbar';

function executionFallbacks(): string[] {
  return Object.values(canvasViewExecutionCopyByKey).map((entry) => entry.fallback);
}

function spanishExecutionCopy(): string[] {
  return [
    ...Object.values(canvasViewExecutionCopyEs),
    canvasViewToolbarCopyEs.toolbarWorkflowPlanRequiredLabel,
  ].filter((value): value is string => typeof value === 'string');
}

describe('canvas execution copy', () => {
  it('names user-visible preview actions without ambiguous Plan commands', () => {
    const visibleExecutionCopy = [
      ...executionFallbacks(),
      canvasViewToolbarCopyByKey.toolbarWorkflowPlanRequiredLabel.fallback,
    ].join('\n');

    expect(visibleExecutionCopy).toContain('Execution Preview');
    expect(visibleExecutionCopy).not.toMatch(/\b(?:run|re-run)[^\S\r\n]+Plan\b/i);
    expect(visibleExecutionCopy).not.toContain('Plan required');
  });

  it('keeps Spanish visible execution copy on Execution Preview vocabulary', () => {
    const visibleExecutionCopy = spanishExecutionCopy().join('\n');

    expect(visibleExecutionCopy).toContain('Execution Preview');
    expect(visibleExecutionCopy).not.toMatch(/\bplanes?\b/i);
    expect(visibleExecutionCopy).not.toMatch(/\bplan de ejecuci[oó]n\b/i);
  });

  it('keeps English readiness feedback on Execution Preview vocabulary', () => {
    const visibleExecutionCopy = executionFallbacks().join('\n');

    expect(visibleExecutionCopy).toContain('Execution Preview');
    expect(visibleExecutionCopy).not.toMatch(/\bplans?\b/i);
    expect(visibleExecutionCopy).not.toMatch(/\bexecution plan\b/i);
  });
});
