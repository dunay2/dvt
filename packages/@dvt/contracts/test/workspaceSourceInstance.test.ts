import { describe, expect, it } from 'vitest';

import {
  WorkspaceGraphAuthoringDraftSchema,
  type WorkspaceGraphAuthoringDraft,
  type WorkspaceGraphAuthoringNode,
} from '../src/contracts/planner/WorkspaceGraphAuthoringDraft.v1.js';
import { resolveWorkspaceSourceInstances } from '../src/contracts/planner/WorkspaceSourceInstance.v1.js';

const source: WorkspaceGraphAuthoringNode = {
  id: 'source',
  name: 'orders',
  role: 'input',
  kind: 'dvt:source',
  pluginId: 'dvt',
  status: 'idle',
  tags: [],
  metadata: { config: { schema: 'raw', table: 'orders' } },
};
const instance: WorkspaceGraphAuthoringNode = {
  ...source,
  id: 'instance',
  sourceDefinitionId: source.id,
  metadata: undefined,
};
const draft = (nodes: WorkspaceGraphAuthoringNode[]): WorkspaceGraphAuthoringDraft => ({
  canvas: { kind: 'dvt', title: 'Canvas' },
  nodeIds: ['instance'],
  nodePositions: { instance: { x: 0, y: 0 } },
  nodes,
  edges: [],
});

describe('workspace source instances', () => {
  it('resolves shared configuration without mutating stored identities', () => {
    const nodes = [source, instance];
    const projected = resolveWorkspaceSourceInstances(nodes);
    expect(projected[1]?.metadata).toBe(source.metadata);
    expect(projected[1]?.id).toBe('instance');
    expect(instance.metadata).toBeUndefined();
    expect(WorkspaceGraphAuthoringDraftSchema.safeParse(draft(nodes)).success).toBe(true);
  });
  it.each([
    { ...instance, sourceDefinitionId: 'missing' },
    { ...instance, sourceDefinitionId: 'instance' },
    { ...instance, pluginId: 'other' },
    { ...instance, kind: 'other' },
    { ...instance, role: 'transform' as const },
    { ...instance, metadata: {} },
    { ...instance, path: 'copied.yml' },
  ])('rejects invalid reference or competing configuration %#', (node) => {
    expect(WorkspaceGraphAuthoringDraftSchema.safeParse(draft([source, node])).success).toBe(false);
  });
  it('rejects instance chains', () => {
    expect(
      WorkspaceGraphAuthoringDraftSchema.safeParse(
        draft([source, instance, { ...instance, id: 'chained', sourceDefinitionId: 'instance' }])
      ).success
    ).toBe(false);
  });
});
