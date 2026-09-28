/** Pending cards must preserve the operation users chose before configuration. */
import { describe, expect, it } from 'vitest';
import {
  connectCanvasStagedOperation,
  createsCanvasStagedOperationCycle,
  createCanvasStagedOperation,
  disconnectCanvasStagedOperation,
  projectCanvasStagedOperation,
  type CanvasStagedOperationKind,
} from './canvasStagedOperation';

describe('staged operation projection', () => {
  it.each([
    ['field_transform', 'project'],
    ['inner_join', 'join'],
    ['cross_join', 'cross'],
    ['union_all', 'set'],
    ['aggregate', 'aggregate'],
    ['window', 'window'],
  ] satisfies readonly [CanvasStagedOperationKind, string][])(
    'projects %s as %s',
    (operation, expected) => {
      expect(projectCanvasStagedOperation(createCanvasStagedOperation(operation)).operator).toBe(
        expected
      );
    }
  );

  it('connects and disconnects ports without changing the selected operation', () => {
    const staged = createCanvasStagedOperation('inner_join');
    const connected = connectCanvasStagedOperation(staged, 1, 'producer:right');
    expect(connected).toMatchObject({ operation: 'inner_join', inputs: [null, 'producer:right'] });
    expect(disconnectCanvasStagedOperation(connected, 1)).toMatchObject({
      operation: 'inner_join',
      inputs: [null, null],
    });
  });

  it('rejects direct and transitive operation cycles in either connection order', () => {
    const first = { ...createCanvasStagedOperation('filter'), id: 'first', inputs: ['source'] };
    const second = { ...createCanvasStagedOperation('aggregate'), id: 'second', inputs: ['first'] };
    expect(createsCanvasStagedOperationCycle([first, second], 'second', 'first')).toBe(true);
    expect(createsCanvasStagedOperationCycle([first, second], 'source', 'second')).toBe(false);
    expect(createsCanvasStagedOperationCycle([first, second], 'first', 'first')).toBe(true);
  });
});
