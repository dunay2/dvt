/** Pending cards must preserve the operation users chose before configuration. */
import { describe, expect, it } from 'vitest';
import {
  createCanvasStagedOperation,
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
});
