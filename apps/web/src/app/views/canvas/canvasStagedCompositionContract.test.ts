/** Every registered operation must obey the same graph contract, without a pairwise matrix. */
import { describe, expect, it } from 'vitest';
import {
  canvasStagedCompositionSignatures,
  canvasStagedOperationAppliedOperation,
  connectCanvasStagedOperation,
  createCanvasStagedOperation,
  deriveCanvasStagedCompositionState,
  disconnectCanvasStagedOperation,
  isCanvasStagedOperationKind,
  readCanvasStagedCompositionSignature,
  type CanvasStagedOperation,
} from './canvasStagedOperation';
import {
  admitCanvasStagedConnection,
  type CanvasStagedConnectionScope,
} from './canvasStagedConnectionAdmission';
import { isCanvasCompositionOperation } from './canvasRelationalOperationChoices';
import { projectCanvasStagedOperation } from './canvasStagedOperationProjection';

const kinds = Object.keys(canvasStagedCompositionSignatures).filter(isCanvasStagedOperationKind);
const producerIds = ['source:0', 'source:1'];
const scope: CanvasStagedConnectionScope = { editable: true, producerIds, consumedProducerIds: [] };

describe.each(['union_all', 'union_distinct'] as const)('%s repeated inputs', (kind) => {
  it('appends an ordered third producer and removes only the middle input', () => {
    let operation = createCanvasStagedOperation(kind);
    for (const [port, id] of ['north', 'south', 'west'].entries())
      operation = connectCanvasStagedOperation(operation, port, id);
    expect(operation.inputs).toEqual(['north', 'south', 'west']);
    expect(deriveCanvasStagedCompositionState(operation)).toBe('ready');
    const removed = disconnectCanvasStagedOperation(operation, 1);
    expect(removed.id).toBe(operation.id);
    expect(removed.inputs).toEqual(['north', 'west']);
    expect(disconnectCanvasStagedOperation(removed, 0).inputs).toEqual([null, 'west']);
  });
});

describe.each(kinds)('composition contract: %s', (kind) => {
  const signature = readCanvasStagedCompositionSignature(kind);

  it('uses the registered arity, presentation and canonical operation without another classifier', () => {
    const operation = createCanvasStagedOperation(kind);
    expect(operation.inputs).toEqual(signature.inputs.map(() => null));
    expect(projectCanvasStagedOperation(operation)).toMatchObject({
      relationId: operation.id,
      operation: kind,
      operator: signature.operator,
      output: { fields: [] },
    });
    expect(isCanvasCompositionOperation(kind)).toBe(signature.inputs.length === 2);
    expect(canvasStagedOperationAppliedOperation(kind, 'left_join')).toBe(
      signature.appliedOperation === 'inherit' ? 'left_join' : signature.appliedOperation
    );
  });

  it('derives lifecycle and preserves identity across connect, no-op, and disconnect', () => {
    const initial = createCanvasStagedOperation(kind);
    Object.freeze(initial.inputs);
    Object.freeze(initial);
    expect(deriveCanvasStagedCompositionState(initial)).toBe('unbound');
    let current = initial;
    for (let port = 0; port < signature.inputs.length; port += 1) {
      current = connectCanvasStagedOperation(current, port, producerIds[port]!);
      expect(current.id).toBe(initial.id);
      expect(current.operation).toBe(kind);
      expect(connectCanvasStagedOperation(current, port, producerIds[port]!)).toBe(current);
      expect(deriveCanvasStagedCompositionState(current)).toBe(
        port + 1 === signature.inputs.length ? 'ready' : 'partially-bound'
      );
    }
    for (let port = 0; port < signature.inputs.length; port += 1) {
      current = disconnectCanvasStagedOperation(current, port);
      expect(current.id).toBe(initial.id);
      expect(disconnectCanvasStagedOperation(current, port)).toBe(current);
    }
    expect(current.inputs).toEqual(initial.inputs);
    expect(deriveCanvasStagedCompositionState(current)).toBe('unbound');
    expect(current).not.toHaveProperty('state');
  });

  it('rejects malformed ports and blank producers without changing the operation', () => {
    const operation = createCanvasStagedOperation(kind);
    for (const port of [-1, 0.5, NaN, Infinity, signature.inputs.length]) {
      expect(connectCanvasStagedOperation(operation, port, producerIds[0]!)).toBe(operation);
      expect(disconnectCanvasStagedOperation(operation, port)).toBe(operation);
      expect(
        admitCanvasStagedConnection(scope, [operation], operation.id, port, producerIds[0]!)
      ).toBeNull();
    }
    expect(connectCanvasStagedOperation(operation, 0, '  ')).toBe(operation);
  });

  it('admits only declared intents and empty available slots', () => {
    const operation = createCanvasStagedOperation(kind);
    signature.inputs.forEach((input, port) => {
      for (const intent of ['relation', 'field'] as const) {
        expect(
          admitCanvasStagedConnection(
            scope,
            [operation],
            operation.id,
            port,
            producerIds[port]!,
            intent
          )
        ).toBe(input.accepts.includes(intent) ? operation : null);
      }
      const connected = connectCanvasStagedOperation(operation, port, producerIds[0]!);
      expect(
        admitCanvasStagedConnection(scope, [connected], connected.id, port, producerIds[1]!)
      ).toBeNull();
      expect(
        admitCanvasStagedConnection(
          scope,
          [connected],
          connected.id,
          port,
          producerIds[0]!,
          'field'
        )
      ).toBeNull();
    });
  });

  it('rejects readonly, missing, consumed, cyclic and multiply consumed producers without mutation', () => {
    const operation = createCanvasStagedOperation(kind);
    const serialized = JSON.stringify(operation);
    const admit = (
      overrides: Partial<typeof scope>,
      producer = producerIds[0]!
    ): CanvasStagedOperation | null =>
      admitCanvasStagedConnection(
        { ...scope, ...overrides },
        [operation],
        operation.id,
        0,
        producer
      );
    expect(admit({ editable: false })).toBeNull();
    expect(admit({}, 'missing')).toBeNull();
    expect(admit({ consumedProducerIds: [producerIds[0]!] })).toBeNull();
    expect(admit({ producerIds: [operation.id] }, operation.id)).toBeNull();
    const downstream = {
      ...createCanvasStagedOperation('field_transform'),
      inputs: [operation.id],
    };
    expect(
      admitCanvasStagedConnection(
        { ...scope, producerIds: [downstream.id] },
        [operation, downstream],
        operation.id,
        0,
        downstream.id
      )
    ).toBeNull();
    const consumer = { ...downstream, inputs: [producerIds[0]!] };
    expect(
      admitCanvasStagedConnection(scope, [operation, consumer], operation.id, 0, producerIds[0]!)
    ).toBeNull();
    expect(JSON.stringify(operation)).toBe(serialized);
  });
});

it('rejects unknown and inherited names instead of treating them as operation kinds', () => {
  for (const value of ['unknown', '__proto__', 'constructor', 'toString']) {
    expect(isCanvasStagedOperationKind(value)).toBe(false);
    expect(isCanvasCompositionOperation(value)).toBe(false);
  }
  expect(isCanvasCompositionOperation(null)).toBe(false);
  expect(isCanvasCompositionOperation(undefined)).toBe(false);
});
