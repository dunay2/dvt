/** Prove catalog identity resolves an existing context without choosing or allocating an occurrence. */
import { expect, it } from 'vitest';
import type { CanonicalNode } from '../../types/canonical';
import { resolveCanvasModelNavigationTarget } from './canvasModelNavigationTarget';
const definition: CanonicalNode = {
  id: 'definition',
  name: 'Model',
  pluginId: 'dvt',
  kind: 'dvt:transform',
  role: 'transform',
  status: 'idle',
  tags: [],
};
const first = { ...definition, id: 'first', definitionId: definition.id, name: 'Model first' };
const second = { ...definition, id: 'second', definitionId: definition.id, name: 'Model second' };
it('keeps an unplaced definition and selects its sole existing context when placed', () => {
  expect(resolveCanvasModelNavigationTarget(definition.id, [definition])).toEqual({
    kind: 'model',
    nodeId: definition.id,
  });
  expect(resolveCanvasModelNavigationTarget(definition.id, [definition, first])).toEqual({
    kind: 'model',
    nodeId: first.id,
  });
});
it('retains an explicit occurrence or a matching selected context', () => {
  expect(resolveCanvasModelNavigationTarget(first.id, [definition, first, second])).toEqual({
    kind: 'model',
    nodeId: first.id,
  });
  expect(
    resolveCanvasModelNavigationTarget(definition.id, [definition, first, second], second.id)
  ).toEqual({ kind: 'model', nodeId: second.id });
});
it('exposes all contexts for an ambiguous definition without using the first or a stale selection', () => {
  expect(
    resolveCanvasModelNavigationTarget(definition.id, [definition, first, second], 'missing')
  ).toEqual({
    kind: 'contexts',
    contexts: [
      { nodeId: first.id, label: first.name },
      { nodeId: second.id, label: second.name },
    ],
  });
});
