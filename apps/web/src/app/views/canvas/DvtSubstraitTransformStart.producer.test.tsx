// @vitest-environment jsdom
import { fireEvent } from '@testing-library/dom';
import { act } from 'react';
import { describe, expect, it } from 'vitest';
import { useAuthoringFieldsHarness } from './DvtAuthoringFields.test-support';
import {
  buildCanonicalTransform,
  SOURCE,
  EDGE,
  TRANSFORM,
} from './canvasOutputProjection.test-support';

describe('explicit model-producer Transform control', () => {
  const view = useAuthoringFieldsHarness();
  it('creates authority only when the user requests the Transform', async () => {
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
    expect(button).not.toBeNull();
    expect(button!.disabled).toBe(false);
    expect(view.draftJson()).toContain('"mode":"uninitialized"');
    await act(async () => {
      fireEvent.click(button!);
    });
    const draft = JSON.parse(view.draftJson());
    expect(draft.shape).toBe('projection');
    expect(draft.sidecar.relations).toHaveLength(2);
    expect(draft.sidecar.relations[0].producerRef.nodeId).toBe(producer.id);
    expect(draft.sidecar.relations[0].sourceRef).toBeUndefined();
    expect(JSON.stringify(nodes)).toBe(before);
  });
});
