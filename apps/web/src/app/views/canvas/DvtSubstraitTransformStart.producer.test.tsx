// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { useAuthoringFieldsHarness } from './DvtAuthoringFields.test-support';
import {
  buildCanonicalTransform,
  SOURCE,
  EDGE,
  TRANSFORM,
} from './canvasOutputProjection.test-support';

describe('model-producer Transform inspector boundary', () => {
  const view = useAuthoringFieldsHarness();
  it('does not offer a second initializer or create authority while inspecting a producer', () => {
    const producer = buildCanonicalTransform();
    const consumer = { ...TRANSFORM, id: 'consumer' };
    const nodes = [SOURCE, producer, consumer];
    const before = JSON.stringify(nodes);
    const edges = [
      EDGE,
      { ...EDGE, id: 'producer-consumer', sourceId: producer.id, targetId: consumer.id },
    ];
    view.renderFields(consumer, undefined, undefined, nodes, edges, 'columns');
    const button = view.container.querySelector<HTMLButtonElement>(
      '[data-slot="dvt-start-substrait-projection"]'
    );
    expect(button).toBeNull();
    expect(view.draftJson()).toContain('"mode":"uninitialized"');
    expect(JSON.stringify(nodes)).toBe(before);
  });
});
