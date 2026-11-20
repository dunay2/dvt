/** Prove catalog identity resolves an existing context without choosing or allocating an occurrence. */
import { expect, it } from 'vitest';
import type { CanonicalNode } from '../../types/canonical';
import {
  resolveCanvasModelNavigationTarget,
  resolveCanvasModelViewEntry,
} from './canvasModelNavigationTarget';
import { projectCanvasExplorerModels } from './explorer/canvasExplorerItems';
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
it('admits only matching catalog definitions as the first Model in a filtered Explorer', () => {
  const matched = { ...definition, id: 'filtered', tags: ['finance'] };
  const nodes = [first, second, definition, matched];
  const input = {
    view: 'semantic' as const,
    nodes,
    catalogue: projectCanvasExplorerModels(nodes),
    modelIds: new Set(nodes.map((node) => node.id)),
    sourceLabel: 'Source',
  };
  expect(resolveCanvasModelViewEntry({ ...input, query: '' })).toBe(definition.id);
  expect(resolveCanvasModelViewEntry({ ...input, query: ' FINANCE ' })).toBe(matched.id);
  expect(resolveCanvasModelViewEntry({ ...input, query: 'no matches' })).toBeUndefined();
});
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
