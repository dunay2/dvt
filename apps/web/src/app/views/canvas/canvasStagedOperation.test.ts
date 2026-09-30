/** Pending cards must preserve the operation users chose before configuration. */
import { describe, expect, it } from 'vitest';
import {
  canvasStagedOperationAppliedOperation,
  canvasStagedOperationArity,
  connectCanvasStagedOperation,
  createsCanvasStagedOperationCycle,
  createCanvasStagedOperation,
  deriveCanvasStagedCompositionState,
  disconnectCanvasStagedOperation,
  projectCanvasStagedOperation,
  readCanvasStagedCompositionSignature,
  type CanvasStagedOperationKind,
} from './canvasStagedOperation';
import { CanvasRelationAnalysisSession } from './canvasRelationAnalysisSession';
import { connectedNamesProjectionDraft } from './canvasProjectionCommand.test-support';
import { configureCanvasStagedTransform } from './canvasStagedTransformConfiguration';

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

  it('derives composition contracts and staged state without persisting another status', () => {
    const join = createCanvasStagedOperation('inner_join');
    expect(readCanvasStagedCompositionSignature('inner_join')).toMatchObject({
      output: 'relation',
      operator: 'join',
    });
    expect(readCanvasStagedCompositionSignature('field_transform').inputs[0]?.accepts).toEqual([
      'relation',
      'field',
    ]);
    expect(readCanvasStagedCompositionSignature('filter').inputs[0]?.accepts).toEqual([
      'relation',
    ]);
    expect(canvasStagedOperationArity('inner_join')).toBe(2);
    expect(deriveCanvasStagedCompositionState(join)).toBe('unbound');

    const partial = connectCanvasStagedOperation(join, 0, 'producer:left');
    expect(deriveCanvasStagedCompositionState(partial)).toBe('partially-bound');
    const ready = connectCanvasStagedOperation(partial, 1, 'producer:right');
    expect(deriveCanvasStagedCompositionState(ready)).toBe('ready');

    expect(canvasStagedOperationAppliedOperation('field_transform', null)).toBe('projection');
    expect(canvasStagedOperationAppliedOperation('inner_join', null)).toBe('inner_join');
    expect(canvasStagedOperationAppliedOperation('filter', 'left_join')).toBe('left_join');
    expect(canvasStagedOperationAppliedOperation('filter', null)).toBe('projection');
  });

  it('connects and disconnects ports without changing the selected operation', () => {
    const staged = createCanvasStagedOperation('inner_join');
    const connected = connectCanvasStagedOperation(staged, 1, 'producer:right');
    expect(connected).toMatchObject({ operation: 'inner_join', inputs: [null, 'producer:right'] });
    expect(disconnectCanvasStagedOperation(connected, 1)).toMatchObject({
      operation: 'inner_join',
      inputs: [null, null],
    });
  });

  it('projects configured staged outputs and their exact producer inputs without another card', async () => {
    const document = connectedNamesProjectionDraft();
    const source = new CanvasRelationAnalysisSession('staged-card');
    source.receive(document);
    const field = (await source.query(source.rootId)).bindings[1]!;
    const staged = await configureCanvasStagedTransform(
      { id: 'pending-operation:one', operation: 'field_transform', inputs: [source.rootId] },
      document,
      field.fieldId
    );
    expect(deriveCanvasStagedCompositionState(staged)).toBe('configured');
    const projected = projectCanvasStagedOperation(staged);
    expect(projected.locator).toBe(staged.id);
    expect(projected.output.fields.map((output) => output.displayName)).toEqual([
      field.displayName,
    ]);
    expect(projected.children).toHaveLength(1);
    expect(projected.children[0]!.node.relationId).toBe(source.rootId);
    expect(projected.children[0]!.node.output.fields.length).toBeGreaterThan(1);
    source.dispose();
  });

  it('rejects direct and transitive operation cycles in either connection order', () => {
    const first = { ...createCanvasStagedOperation('filter'), id: 'first', inputs: ['source'] };
    const second = { ...createCanvasStagedOperation('aggregate'), id: 'second', inputs: ['first'] };
    expect(createsCanvasStagedOperationCycle([first, second], 'second', 'first')).toBe(true);
    expect(createsCanvasStagedOperationCycle([first, second], 'source', 'second')).toBe(false);
    expect(createsCanvasStagedOperationCycle([first, second], 'first', 'first')).toBe(true);
  });
});
