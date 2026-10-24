import { describe, expect, it } from 'vitest';

import { canvasViewExecutionCopyByKey } from './canvasCopyCatalog.execution';
import { canvasViewExecutionCopyEs } from './canvasCopyCatalog.execution.es';
const englishExecutionCopy = Object.values(canvasViewExecutionCopyByKey).join('\n');
const spanishExecutionCopy = Object.values(canvasViewExecutionCopyEs).join('\n');

describe('canvas execution copy', () => {
  it('names user-visible preview actions without ambiguous Plan commands', () => {
    const visibleExecutionCopy = englishExecutionCopy;

    expect(visibleExecutionCopy).toContain('Execution Preview');
    expect(visibleExecutionCopy).not.toMatch(/\b(?:run|re-run)[^\S\r\n]+Plan\b/i);
    expect(visibleExecutionCopy).not.toContain('Plan required');
  });

  it('keeps Spanish visible execution copy on Execution Preview vocabulary', () => {
    const visibleExecutionCopy = spanishExecutionCopy;

    expect(visibleExecutionCopy).toContain('Execution Preview');
    expect(visibleExecutionCopy).not.toMatch(/\bplanes?\b/i);
    expect(visibleExecutionCopy).not.toMatch(/\bplan de ejecuci[oó]n\b/i);
  });

  it('keeps English readiness feedback on Execution Preview vocabulary', () => {
    const visibleExecutionCopy = englishExecutionCopy;

    expect(visibleExecutionCopy).toContain('Execution Preview');
    expect(visibleExecutionCopy).not.toMatch(/\bplans?\b/i);
    expect(visibleExecutionCopy).not.toMatch(/\bexecution plan\b/i);
  });
});
