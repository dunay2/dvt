import { describe, expect, it } from 'vitest';

import {
  WorkspaceGraphAuthoringDraftSchema,
  type WorkspaceGraphAuthoringDraft,
  type WorkspaceGraphAuthoringNode,
} from '../src/contracts/planner/WorkspaceGraphAuthoringDraft.v1.js';
import {
  resolveWorkspaceNodeInstances,
  projectWorkspaceNodeInstanceEdges,
} from '../src/contracts/planner/WorkspaceNodeInstance.v1.js';

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

describe('workspace node instances', () => {
  it.each(['input', 'transform'] as const)(
    'resolves a %s definition without copying it or creating dependencies',
    (role) => {
      const definition = {
        ...source,
        role,
        kind: role === 'input' ? 'dvt:source' : 'dvt:transform',
      };
      const first = {
        ...instance,
        sourceDefinitionId: undefined,
        definitionId: definition.id,
        kind: definition.kind,
        role,
      };
      const second = { ...first, id: 'second' };
      const nodes = [definition, first, second];
      const saved = draft(nodes);
      expect(WorkspaceGraphAuthoringDraftSchema.safeParse(saved).success).toBe(true);
      const resolved = resolveWorkspaceNodeInstances(nodes);
      expect(resolved.slice(1).map((node) => node.metadata)).toEqual([
        definition.metadata,
        definition.metadata,
      ]);
      expect(resolved.map((node) => node.id)).toEqual([definition.id, first.id, second.id]);
      expect(projectWorkspaceNodeInstanceEdges(nodes, [])).toEqual([]);
      expect(first.metadata).toBeUndefined();
      expect(saved.edges).toEqual([]);
    }
  );
  it('projects model input context without connecting an instance to its definition', () => {
    const definition = {
      ...source,
      id: 'model',
      role: 'transform' as const,
      kind: 'dvt:transform',
    };
    const occurrence = {
      ...definition,
      id: 'instance',
      definitionId: definition.id,
      metadata: undefined,
    };
    const edges = [{ id: 'input', sourceId: source.id, targetId: definition.id }];
    const projected = projectWorkspaceNodeInstanceEdges([source, definition, occurrence], edges);
    expect(projected).toContainEqual({
      id: 'instance_edge_instance_input',
      sourceId: source.id,
      targetId: occurrence.id,
    });
    expect(
      projected.some((edge) => edge.sourceId === definition.id && edge.targetId === occurrence.id)
    ).toBe(false);
    expect(edges).toHaveLength(1);
    expect(edges[0]!.targetId).toBe(definition.id);
  });
  it('resolves shared configuration without mutating stored identities', () => {
    const nodes = [source, instance];
    const projected = resolveWorkspaceNodeInstances(nodes);
    expect(projected[1]?.metadata).toBe(source.metadata);
    expect(projected[1]?.id).toBe('instance');
    expect(instance.metadata).toBeUndefined();
    expect(WorkspaceGraphAuthoringDraftSchema.safeParse(draft(nodes)).success).toBe(true);
  });
  it('keeps projected dependency IDs unique when persisted edges occupy their namespace', () => {
    const definition = {
      ...source,
      id: 'model',
      role: 'transform' as const,
      kind: 'dvt:transform',
    };
    const occurrence = {
      ...definition,
      id: 'instance',
      definitionId: definition.id,
      metadata: undefined,
    };
    const edges = [
      { id: 'input', sourceId: source.id, targetId: definition.id },
      { id: 'instance_edge_instance_input', sourceId: source.id, targetId: 'other' },
    ];
    const projected = projectWorkspaceNodeInstanceEdges([source, definition, occurrence], edges);
    expect(new Set(projected.map((edge) => edge.id)).size).toBe(projected.length);
    expect(projected.find((edge) => edge.targetId === occurrence.id)?.sourceId).toBe(source.id);
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
