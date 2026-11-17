/** File Model input slots retain the existing canonical signature, without native authority. */
import { allocateDvtFieldId, allocateDvtRelationId } from '@dvt/contracts';
import { describe, expect, it } from 'vitest';
import { dbtModel } from './canvasDvtConnectionProvenance.test-support';
import { resolveCanvasDbtModelSignature } from './canvasDbtModelReference';
import { readCanvasPublishedInputFields } from './canvasPublishedInputFields';

describe('file Model published inputs', () => {
  it('offers the actual pinned publication with opaque IDs and no native transform metadata', async () => {
    const node = dbtModel();
    const original = resolveCanvasDbtModelSignature(node);
    if (original == null) throw new Error('Expected the existing file Model signature fixture.');
    const reference = {
      ...original.reference,
      relationId: allocateDvtRelationId(),
      fields: original.reference.fields.map((field) => ({
        ...field,
        fieldId: allocateDvtFieldId(),
      })),
    };
    node.metadata = { ...node.metadata, dbtModelReference: reference };
    expect(node.metadata?.transformAuthoring).toBeUndefined();
    expect(await readCanvasPublishedInputFields({ node, nodes: [node], edges: [] })).toEqual([
      { columnId: reference.fields[0]!.fieldId, name: 'id', type: 'string' },
    ]);
  });
  it('does not publish fields after cancellation', async () => {
    const node = dbtModel();
    const controller = new AbortController();
    controller.abort();
    expect(
      await readCanvasPublishedInputFields({ node, nodes: [node], edges: [] }, controller.signal)
    ).toEqual([]);
  });
});
