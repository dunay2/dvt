import type { ConnectionRef } from '@dvt/contracts';
import { describe, expect, it } from 'vitest';

import { resolveCanvasCompositionConnection } from './canvasCompositionConnection';
import { createSourceDocument } from './canvasSourceDocument';
import { createCanvasInputRead } from './canvasSourceRelation';
import { compositionInput } from './stagedAnalysisContext.test-support';

describe('staged composition execution connection', () => {
  it.each([
    { name: 'Source and Source', models: [false, false] as const },
    { name: 'Source and Model', models: [false, true] as const },
    { name: 'Model and Source', models: [true, false] as const },
    { name: 'Model and Model', models: [true, true] as const },
  ])('retains the admitted connection for $name', ({ models }) => {
    const inputs = models.map((model, index) => compositionInput(`input-${index}`, model));
    const documents = inputs.map((input) => {
      const read = createCanvasInputRead(input, 1);
      return createSourceDocument([read], read);
    });

    expect(resolveCanvasCompositionConnection(documents, inputs)).toEqual({
      state: 'available',
      connection: inputs[0]!.sourceRef?.connectionRef ?? inputs[0]!.producer!.connection,
    });
  });

  it.each([false, true])('rejects a missing admitted input, Model=%s', (model) => {
    const input = compositionInput('missing', model);
    const read = createCanvasInputRead(input, 1);
    const document = createSourceDocument([read], read);

    expect(resolveCanvasCompositionConnection([document], [])).toEqual({
      state: 'unavailable',
      reason: 'missing-input',
    });
  });

  it.each([false, true])(
    'rejects different connection ids with the same provider, Model=%s',
    (model) => {
      const first = compositionInput('left', model);
      const connection: ConnectionRef = {
        ...(first.sourceRef?.connectionRef ?? first.producer!.connection),
        connectionId: 'another-warehouse',
      };
      const inputs = [first, compositionInput('right', model, connection)];
      const documents = inputs.map((input) => {
        const read = createCanvasInputRead(input, 1);
        return createSourceDocument([read], read);
      });

      expect(resolveCanvasCompositionConnection(documents, inputs)).toEqual({
        state: 'unavailable',
        reason: 'mixed-connections',
      });
    }
  );

  it('does not substitute another physical Source on the same connection', () => {
    const admitted = compositionInput('admitted', false);
    const foreign = compositionInput('foreign', false);
    const read = createCanvasInputRead(foreign, 1);

    expect(
      resolveCanvasCompositionConnection([createSourceDocument([read], read)], [admitted])
    ).toEqual({
      state: 'unavailable',
      reason: 'missing-input',
    });
  });

  it('does not substitute another Model on the same connection', () => {
    const admitted = compositionInput('admitted', true);
    const foreign = compositionInput('foreign', true);
    const read = createCanvasInputRead(foreign, 1);

    expect(
      resolveCanvasCompositionConnection([createSourceDocument([read], read)], [admitted])
    ).toEqual({
      state: 'unavailable',
      reason: 'missing-input',
    });
  });

  it('does not invent a connection when no input document exists', () => {
    expect(resolveCanvasCompositionConnection([], [compositionInput('unused', true)])).toEqual({
      state: 'unavailable',
      reason: 'missing-connection',
    });
  });
});
