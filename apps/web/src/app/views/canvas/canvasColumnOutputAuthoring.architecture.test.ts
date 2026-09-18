/** Owned concern: keep output commands independent of passive presentation and Source dependency policy. */
import { describe, expect, it } from 'vitest';
import { readArchitectureSiblingSource } from '../architecture.test.support';

describe('Canvas column output authoring boundaries', () => {
  it('reads declared columns from authoring and delegates Source dependency policy', () => {
    const source = readArchitectureSiblingSource(
      import.meta.dirname,
      'canvasColumnOutputAuthoring.ts'
    );
    expect(source).not.toContain('canvasNodePresentationProjection');
    expect(source).toContain('readCanvasNodeColumns(targetNode)');
    expect(source).toContain("from './canvasSourceOutputDependencyPolicy'");
    expect(source).not.toContain('function sourceOutputIsRequired');
  });
});
