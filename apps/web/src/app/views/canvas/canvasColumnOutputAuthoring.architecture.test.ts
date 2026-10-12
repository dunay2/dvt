/** Owned concern: keep output commands independent of passive presentation and Source dependency policy. */
import { describe, expect, it } from 'vitest';
import { readArchitectureSiblingSource } from '../architecture.test.support';

describe('Canvas column output authoring boundaries', () => {
  it('delegates Source policy and never manufactures model outputs from declared columns', () => {
    const source = readArchitectureSiblingSource(
      import.meta.dirname,
      'canvasColumnOutputAuthoring.ts'
    );
    expect(source).not.toContain('canvasNodePresentationProjection');
    expect(source).not.toContain('readCanvasNodeColumns');
    expect(source).not.toContain('automapCanvasColumns');
    expect(source).not.toContain('applyCanvasColumnMapping');
    expect(source).not.toContain('persistCanvasProjectionOutputs');
    expect(source).toContain('hasStructuredOutput');
    expect(source).toContain("from './canvasSourceOutputDependencyPolicy'");
    expect(source).not.toContain('function sourceOutputIsRequired');
  });
});
