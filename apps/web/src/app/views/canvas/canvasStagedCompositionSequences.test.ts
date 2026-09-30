/** Graph invariants use a separate edge oracle; no pairwise operation table. */
import { describe, expect, it } from 'vitest';
import { DvtRelationalAuthoringDraftV1Schema } from '@dvt/contracts';
import {
  compositionGraphHarness,
  compositionKinds,
  orderedCompositionKinds,
} from './canvasCompositionSequence.test-support';
import { readCanvasStagedCompositionSignature } from './canvasStagedOperation';
import {
  createCanvasRelationalAuthoringDraft,
  restoreCanvasRelationalAuthoringDraft,
} from './canvasRelationalAuthoringDraft';

describe('generated composition command sequences', () => {
  it.each(compositionKinds)('rejects every readonly graph mutation for %s', (kind) => {
    const harness = compositionGraphHarness();
    const id = harness.commands().stage(kind)!;
    const producer = harness.state.sources[0]!.read.binding.relationId;
    harness.commands().connect(id, 0, producer);
    const before = harness.state.operations;
    const readonly = harness.commands(false);
    expect(readonly.stage(kind)).toBeNull();
    readonly.connect(id, 0, producer);
    readonly.disconnect(id, 0);
    expect(harness.state.operations).toBe(before);
    readonly.disconnectProducer(producer);
    expect(harness.state.operations).toBe(before);
    readonly.remove(id);
    expect(harness.state.operations).toBe(before);
  });

  it.each([1, 7, 23, 91, 3472, 65537])(
    'preserves graph and durable identity through seed %i',
    (seed) => {
      const harness = compositionGraphHarness();
      const expected = new Map<string, (string | null)[]>();
      const sourceIds = harness.state.sources.map((entry) => entry.read.binding.relationId);
      const trace: string[] = [];
      const check = (): void => {
        const actual = new Map(
          harness.state.operations.map((operation) => [operation.id, [...operation.inputs]])
        );
        expect(actual, trace.join(' -> ')).toEqual(expected);
        const allInputs = [...actual.values()].flat().filter((input) => input != null);
        expect(new Set(allInputs).size).toBe(allInputs.length);
        const visited = new Set(sourceIds);
        const remaining = new Map(actual);
        while (remaining.size > 0) {
          const ready = [...remaining].filter(([, inputs]) =>
            inputs.every((id) => id == null || visited.has(id))
          );
          expect(ready.length, 'Cycles and dangling inputs cannot make progress').toBeGreaterThan(
            0
          );
          for (const [id] of ready) {
            visited.add(id);
            remaining.delete(id);
          }
        }
      };
      const roundtrip = (): void => {
        const draft = createCanvasRelationalAuthoringDraft({
          ...harness.state,
          outputRelationId: null,
          positions: new Map(),
        });
        const parsed = DvtRelationalAuthoringDraftV1Schema.parse(JSON.parse(JSON.stringify(draft)));
        const reopened = restoreCanvasRelationalAuthoringDraft(parsed, harness.inputs)!;
        expect(reopened.operations).toEqual(harness.state.operations);
        expect(reopened.sources.map((entry) => entry.read)).toEqual(
          harness.state.sources.map((entry) => entry.read)
        );
        harness.state.operations = reopened.operations;
        check();
      };
      let head = sourceIds[0]!;
      let sourceIndex = 1;
      for (const kind of orderedCompositionKinds(seed)) {
        trace.push(`stage:${kind}`);
        const id = harness.commands().stage(kind)!;
        const slots = readCanvasStagedCompositionSignature(kind).inputs;
        expected.set(
          id,
          slots.map(() => null)
        );
        check();
        const ports =
          seed % 2 === 0 ? slots.map((_, port) => port) : slots.map((_, port) => port).reverse();
        for (const port of ports) {
          const producer = port === 0 ? head : sourceIds[sourceIndex++]!;
          harness.commands().connect(id, port, producer);
          expected.get(id)![port] = producer;
          check();
        }
        head = id;
      }
      roundtrip();
      const first = [...expected.keys()][0]!;
      harness.commands().disconnect(first, 0);
      expected.get(first)![0] = null;
      check();
      const before = harness.state.operations;
      harness.commands().connect(first, 0, head);
      harness.commands().connect(first, 0, 'unavailable');
      harness.commands().connect(first, NaN, sourceIds[0]!);
      expect(harness.state.operations).toBe(before);
      roundtrip();
      for (const id of [...expected.keys()].filter((_, index) => index % 3 === seed % 3)) {
        trace.push('remove');
        harness.commands().remove(id);
        expected.delete(id);
        for (const [consumer, inputs] of expected)
          expected.set(
            consumer,
            inputs.map((input) => (input === id ? null : input))
          );
        check();
        roundtrip();
      }
      const detached = sourceIds[1]!;
      harness.commands().disconnectProducer(detached);
      for (const [id, inputs] of expected)
        expected.set(
          id,
          inputs.map((input) => (input === detached ? null : input))
        );
      roundtrip();
    }
  );
});
