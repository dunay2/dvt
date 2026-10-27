// @vitest-environment jsdom

/** Owned concern: prove Inspector commands report and commit aggregate outcomes synchronously. */
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from 'vitest';

import type { CanonicalNode } from '../../types/canonical';
import { canvasDraftSession, type CanvasDraftSession } from './canvasDraftSession';
import { createCanvasInspectorNodeDraft } from './canvasInspectorAuthoringModel';
import type { CanvasInspectorNodeDraftApplyResult } from './canvasInspectorAuthoring.types';
import { useCanvasInspectorCommands } from './useCanvasInspectorCommands';
import { useCanvasWorkspaceDraftSession } from './useCanvasWorkspaceDraftSession';
import * as publication from './canvasPublishedInputFields';

const model: CanonicalNode = {
  id: 'model-orders',
  name: 'Orders model',
  pluginId: 'dvt',
  kind: 'dvt:transform',
  role: 'transform',
  status: 'idle',
  tags: [],
};
const workspaceScope = {
  tenantId: 'tenant-1',
  projectId: 'project-1',
  environmentId: 'environment-1',
  targetAdapter: 'temporal' as const,
};
const source: CanonicalNode = {
  id: 'source-client',
  name: 'Client',
  pluginId: 'dvt.warehouse-source',
  kind: 'dvt:source',
  role: 'input',
  status: 'idle',
  tags: [],
  metadata: {
    schema: 'public',
    tableName: 'client',
    columns: [
      { name: 'client_id', type: 'text' },
      { name: 'country', type: 'text' },
    ],
    connectedSourceRef: {
      schemaVersion: 'connected-source-ref.v1',
      connectionRef: {
        schemaVersion: 'connection-ref.v1',
        provider: 'postgres',
        connectionId: 'warehouse',
      },
      sourceObjectId: 'relation/database/public/client',
    },
  },
};

describe('useCanvasInspectorCommands', () => {
  let container: HTMLDivElement;
  let root: Root;
  let latest: {
    session: CanvasDraftSession;
    setSession: ReturnType<typeof useCanvasWorkspaceDraftSession>[1];
    commands: ReturnType<typeof useCanvasInspectorCommands>;
  } | null;

  beforeEach(() => {
    latest = null;
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    (
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    vi.restoreAllMocks();
  });

  function Harness({
    canEditNode = true,
    node = model,
    sourceNode = source,
    scope = workspaceScope,
    observed,
  }: {
    canEditNode?: boolean;
    node?: CanonicalNode;
    sourceNode?: CanonicalNode;
    scope?: typeof workspaceScope;
    observed?: CanvasDraftSession[];
  }): null {
    const [session, setSession, runDraftSessionCommand] = useCanvasWorkspaceDraftSession(
      'tenant-1::project-1::dev'
    );
    const commands = useCanvasInspectorCommands({
      canonicalNodesById: new Map([node, sourceNode].map((item) => [item.id, item])),
      inspectorNode: node,
      runDraftSessionCommand,
      workspaceScope: scope,
      canEditNode,
    });
    latest = { session, setSession, commands };
    if (observed != null && observed.at(-1) !== session) observed.push(session);
    return null;
  }

  function bootstrapInput(): CanvasDraftSession {
    act(() => {
      latest!.setSession(
        canvasDraftSession.workingSet.replaceEdges(
          canvasDraftSession.machine.bootstrap({
            remoteDraft: null,
            canonicalNodeIds: [source.id, model.id],
            canonicalEdges: [{ sourceId: source.id, targetId: model.id }],
          }),
          [
            {
              sourceId: source.id,
              targetId: model.id,
              inputBindings: {
                version: 'v1',
                fields: [{ inputId: `input:${source.id}:client_id`, producerFieldId: 'client_id' }],
              },
            },
          ]
        )
      );
    });
    return latest!.session;
  }

  function pausePublication(): Readonly<{
    release: () => void;
    started: Promise<void>;
    query: MockInstance<typeof publication.readCanvasPublishedInputFields>;
  }> {
    const original = publication.readCanvasPublishedInputFields;
    let release!: () => void;
    let entered!: () => void;
    const held = new Promise<void>((resolve) => {
      release = resolve;
    });
    const started = new Promise<void>((resolve) => {
      entered = resolve;
    });
    const query = vi
      .spyOn(publication, 'readCanvasPublishedInputFields')
      .mockImplementation(async (...args) => {
        const fields = await original(...args);
        entered();
        await held;
        return fields;
      });
    return { release, started, query };
  }

  it('changes only materialization on the current node and rejects unsupported values', () => {
    act(() => root.render(<Harness />));
    act(() =>
      latest!.setSession(
        canvasDraftSession.machine.bootstrap({
          remoteDraft: null,
          canonicalNodeIds: [model.id],
          canonicalEdges: [],
        })
      )
    );
    act(() => {
      latest!.commands.applyNodeDraft(model.id, {
        ...createCanvasInspectorNodeDraft(model),
        name: 'Current model name',
      });
      expect(latest!.commands.setNodeMaterialization(model.id, 'table').outcome).toBe('applied');
    });
    const current = latest!.session.localNodeCatalog![model.id]!;
    expect(current.name).toBe('Current model name');
    expect(current.metadata?.config).toMatchObject({ materialized: 'table' });
    expect(current.metadata?.transformAuthoring).toBeUndefined();
    expect(latest!.commands.setNodeMaterialization(model.id, 'table').outcome).toBe('no_changes');
    const baseline = latest!.session;
    expect(latest!.commands.setNodeMaterialization(model.id, 'incremental').outcome).toBe(
      'rejected'
    );
    expect(latest!.commands.setNodeMaterialization('missing', 'view').outcome).toBe('rejected');
    expect(latest!.session).toBe(baseline);
  });

  it('does not change materialization in read-only posture', () => {
    act(() => root.render(<Harness canEditNode={false} />));
    const baseline = latest!.session;
    expect(latest!.commands.setNodeMaterialization(model.id, 'table').outcome).toBe('rejected');
    expect(latest!.session).toBe(baseline);
  });

  it.each(['view', 'table', 'ephemeral'])(
    'accepts %s as an authoring intent independently of Run support',
    (materialized) => {
      const node = {
        ...model,
        metadata: { config: { materialized: materialized === 'view' ? 'table' : 'view' } },
      };
      act(() => root.render(<Harness node={node} />));
      act(() => {
        latest!.setSession(
          canvasDraftSession.machine.bootstrap({
            remoteDraft: null,
            canonicalNodeIds: [model.id],
            canonicalEdges: [],
          })
        );
        expect(latest!.commands.setNodeMaterialization(model.id, materialized).outcome).toBe(
          'applied'
        );
      });
      expect(latest!.session.localNodeCatalog![model.id]!.metadata?.config).toMatchObject({
        materialized,
      });
    }
  );

  it('removes a terminal target on explicit ephemeral selection without restoring it later', () => {
    const configured: CanonicalNode = {
      ...model,
      metadata: {
        config: {
          materialized: 'table',
          resultTarget: {
            schemaVersion: 'dvt-transform-result-target.v1',
            connectionRef: {
              schemaVersion: 'connection-ref.v1',
              provider: 'postgres',
              connectionId: 'warehouse',
            },
            schema: 'analytics',
            relation: 'orders',
          },
        },
      },
    };
    act(() => root.render(<Harness node={configured} />));
    act(() =>
      latest!.setSession(
        canvasDraftSession.machine.bootstrap({
          remoteDraft: null,
          canonicalNodeIds: [model.id],
          canonicalEdges: [],
        })
      )
    );
    act(() => {
      expect(latest!.commands.setNodeMaterialization(model.id, 'ephemeral').outcome).toBe(
        'applied'
      );
    });
    expect(latest!.session.localNodeCatalog![model.id]).toMatchObject({
      name: model.name,
      metadata: { config: { materialized: 'ephemeral' } },
    });
    expect(latest!.session.localNodeCatalog![model.id]!.metadata!.config).not.toHaveProperty(
      'resultTarget'
    );
    act(() => {
      expect(latest!.commands.setNodeMaterialization(model.id, 'table').outcome).toBe('applied');
    });
    expect(latest!.session.localNodeCatalog![model.id]!.metadata!.config).not.toHaveProperty(
      'resultTarget'
    );
    expect(configured.metadata!.config).toHaveProperty('resultTarget');
  });

  it.each([{ authority: 'dbt-project-files' }, { dbt: {} }])(
    'rejects file-owned/compatible model mutation: %o',
    (metadata) => {
      act(() => root.render(<Harness node={{ ...model, metadata }} />));
      act(() =>
        latest!.setSession(
          canvasDraftSession.machine.bootstrap({
            remoteDraft: null,
            canonicalNodeIds: [model.id],
            canonicalEdges: [],
          })
        )
      );
      const baseline = latest!.session;
      expect(latest!.commands.setNodeMaterialization(model.id, 'table').outcome).toBe('rejected');
      expect(latest!.session).toBe(baseline);
    }
  );

  it('commits applied once and reports no-change and unavailable-node outcomes without mutation', () => {
    act(() => root.render(<Harness />));
    act(() => {
      latest!.setSession(
        canvasDraftSession.machine.bootstrap({
          remoteDraft: null,
          canonicalNodeIds: [model.id],
          canonicalEdges: [],
        })
      );
    });
    const renamed = { ...createCanvasInspectorNodeDraft(model), name: 'Orders renamed' };

    let applied: CanvasInspectorNodeDraftApplyResult | undefined;
    act(() => {
      applied = latest!.commands.applyNodeDraft(model.id, renamed);
    });
    expect(applied!.outcome).toBe('applied');
    expect(latest!.session.localNodeCatalog?.[model.id]?.name).toBe('Orders renamed');
    const committedSession = latest!.session;

    expect(latest!.commands.applyNodeDraft(model.id, renamed)).toEqual({
      outcome: 'no_changes',
    });
    expect(latest!.session).toBe(committedSession);
    expect(latest!.commands.applyNodeDraft('missing-model', renamed)).toEqual({
      outcome: 'rejected',
      reason: 'node_unavailable',
    });
    expect(latest!.session).toBe(committedSession);
  });

  it('applies Input additions and the Model draft in the same aggregate result', async () => {
    act(() => root.render(<Harness />));
    act(() => {
      latest!.setSession(
        canvasDraftSession.machine.bootstrap({
          remoteDraft: null,
          canonicalNodeIds: [source.id, model.id],
          canonicalEdges: [{ sourceId: source.id, targetId: model.id }],
        })
      );
    });
    act(() => {
      latest!.setSession((current) =>
        canvasDraftSession.workingSet.replaceEdges(current, [
          {
            sourceId: source.id,
            targetId: model.id,
            inputBindings: {
              version: 'v1',
              fields: [{ inputId: 'existing-client-id', producerFieldId: 'client_id' }],
            },
          },
        ])
      );
    });
    const before = latest!.session;
    let result: CanvasInspectorNodeDraftApplyResult | undefined;
    await act(async () => {
      result = await latest!.commands.applyNodeDraft(
        model.id,
        { ...createCanvasInspectorNodeDraft(model), name: 'Client model' },
        { inputAdditions: [{ nodeId: source.id, columnId: 'country' }] }
      );
    });
    expect(result!.outcome).toBe('applied');
    expect(latest!.session.localNodeCatalog?.[model.id]?.name).toBe('Client model');
    expect(latest!.session.workingSet.visibleEdges[0]?.inputBindings?.fields).toEqual([
      { inputId: 'existing-client-id', producerFieldId: 'client_id' },
      { inputId: `input:${source.id}:country`, producerFieldId: 'country' },
    ]);
    expect(before.workingSet.visibleEdges[0]?.inputBindings?.fields).toHaveLength(1);
  });

  it('publishes only the complete candidate and deduplicates repeated additions', async () => {
    const observed: CanvasDraftSession[] = [];
    act(() => root.render(<Harness observed={observed} />));
    const baseline = bootstrapInput();
    observed.length = 0;
    const held = pausePublication();
    const request = latest!.commands.applyNodeDraft(
      model.id,
      { ...createCanvasInspectorNodeDraft(model), name: 'Recovered model' },
      {
        inputAdditions: [
          { nodeId: source.id, columnId: 'country' },
          { nodeId: source.id, columnId: 'country' },
        ],
      }
    );
    await held.started;
    expect(latest!.session).toBe(baseline);
    expect(observed).toEqual([]);
    await act(async () => {
      held.release();
      expect((await request).outcome).toBe('applied');
    });
    expect(held.query).toHaveBeenCalledOnce();
    expect(observed).toHaveLength(1);
    expect(observed[0]?.localNodeCatalog?.[model.id]?.name).toBe('Recovered model');
    expect(observed[0]?.workingSet.visibleEdges[0]?.inputBindings?.fields).toHaveLength(2);
  });

  it('rejects a completed candidate after an intervening draft command', async () => {
    act(() => root.render(<Harness />));
    bootstrapInput();
    const held = pausePublication();
    const request = latest!.commands.applyNodeDraft(
      model.id,
      { ...createCanvasInspectorNodeDraft(model), name: 'Stale recovery' },
      { inputAdditions: [{ nodeId: source.id, columnId: 'country' }] }
    );
    await held.started;
    act(() => {
      latest!.commands.applyNodeDraft(model.id, {
        ...createCanvasInspectorNodeDraft(model),
        name: 'Newer model name',
      });
    });
    const current = latest!.session;
    await act(async () => {
      held.release();
      expect((await request).outcome).toBe('rejected');
    });
    expect(latest!.session).toBe(current);
    expect(current.localNodeCatalog?.[model.id]?.name).toBe('Newer model name');
    expect(current.workingSet.visibleEdges[0]?.inputBindings?.fields).toHaveLength(1);
  });

  it.each(['permission', 'scope', 'publication'] as const)(
    'rechecks current %s after preparing the candidate',
    async (changed) => {
      act(() => root.render(<Harness />));
      const baseline = bootstrapInput();
      const held = pausePublication();
      const request = latest!.commands.applyNodeDraft(
        model.id,
        { ...createCanvasInspectorNodeDraft(model), name: 'Rejected recovery' },
        { inputAdditions: [{ nodeId: source.id, columnId: 'country' }] }
      );
      await held.started;
      act(() =>
        root.render(
          <Harness
            canEditNode={changed !== 'permission'}
            scope={
              changed === 'scope' ? { ...workspaceScope, environmentId: 'other' } : workspaceScope
            }
            sourceNode={
              changed === 'publication'
                ? {
                    ...source,
                    metadata: {
                      ...source.metadata,
                      columns: [{ name: 'client_id', type: 'text' }],
                    },
                  }
                : source
            }
          />
        )
      );
      await act(async () => {
        held.release();
        expect((await request).outcome).toBe('rejected');
      });
      expect(latest!.session).toBe(baseline);
    }
  );

  it.each(['caller', 'unmount'] as const)(
    'discards preparation after %s cancellation',
    async (kind) => {
      act(() => root.render(<Harness />));
      const baseline = bootstrapInput();
      const held = pausePublication();
      const cancellation = new AbortController();
      const request = latest!.commands.applyNodeDraft(
        model.id,
        { ...createCanvasInspectorNodeDraft(model), name: 'Cancelled recovery' },
        {
          inputAdditions: [{ nodeId: source.id, columnId: 'country' }],
          signal: cancellation.signal,
        }
      );
      await held.started;
      act(() => {
        if (kind === 'caller') cancellation.abort();
        else root.render(null);
      });
      await act(async () => {
        held.release();
        expect((await request).outcome).toBe('rejected');
      });
      expect(latest!.session).toBe(baseline);
    }
  );

  it('preserves no_changes and rejects read-only async requests without publishing', async () => {
    act(() => root.render(<Harness />));
    const baseline = bootstrapInput();
    await act(async () => {
      expect(
        await latest!.commands.applyNodeDraft(model.id, createCanvasInspectorNodeDraft(model), {
          inputAdditions: [],
        })
      ).toEqual({ outcome: 'no_changes' });
    });
    act(() => root.render(<Harness canEditNode={false} />));
    await act(async () => {
      expect(
        (
          await latest!.commands.applyNodeDraft(model.id, createCanvasInspectorNodeDraft(model), {
            inputAdditions: [{ nodeId: source.id, columnId: 'country' }],
          })
        ).outcome
      ).toBe('rejected');
    });
    expect(latest!.session).toBe(baseline);
  });
});
