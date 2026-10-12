import { describe, expect, it } from 'vitest';
import { MemoryRelationAnalysisCache } from '@dvt/substrait-analysis';
import { CanvasPresentationAnalysis } from './canvasPresentationAnalysis';
import { buildCanonicalTransform } from './canvasOutputProjection.test-support';

describe('Canvas schema cache ownership', () => {
  it('reuses canonical facts across document replacement within one bounded cache', async () => {
    const cache = new MemoryRelationAnalysisCache({ maxEntries: 8, maxBytes: 32_768 });
    const owner = new CanvasPresentationAnalysis(cache);
    const model = buildCanonicalTransform();
    try {
      const first = await owner.query(model);
      expect(first?.session.work.analyzed).toBeGreaterThan(0);
      const received = { ...model, metadata: structuredClone(model.metadata) };
      const second = await owner.query(received);
      expect(second?.result.fields).toEqual(first?.result.fields);
      expect(second?.result.bindings).toEqual(first?.result.bindings);
      expect(second?.session.work.analyzed).toBe(0);
      expect(cache.usage.entries).toBeGreaterThan(0);
      expect(cache.usage.bytes).toBeLessThanOrEqual(32_768);
      const rootId = second!.session.rootId;
      owner.retain(new Set());
      await expect(second!.session.query(rootId)).rejects.toThrow();
    } finally {
      owner.dispose();
    }
  });
});
