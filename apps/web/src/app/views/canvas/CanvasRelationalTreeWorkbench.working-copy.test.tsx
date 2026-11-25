// @vitest-environment jsdom
/** Catalogue drops edit the open Model transaction; they never navigate or write before Apply. */
import React, { act } from 'react';
import {
  WorkspaceDbtModelReferenceSchema,
  allocateDvtRelationId,
  allocateDvtFieldId,
} from '@dvt/contracts';
import { describe, expect, it, vi } from 'vitest';
import { CanvasRelationalTreeWorkbench } from './CanvasRelationalTreeWorkbench';
import {
  COPY,
  container,
  root,
  setupWorkbenchTest,
} from './CanvasRelationalTreeWorkbench.test-support';
import { createModelOutputDependencyFixture } from './canvasModelOutputDependency.test-support';
import { CANVAS_CATALOG_NODE_DRAG_MIME_TYPE } from './canvasNodeDropPayload';
import { CanvasModelBrowser, type CanvasModelBrowserPresentation } from './CanvasModelBrowser';
import { useCanvasRelationalTreeWorkbenchModel } from './useCanvasRelationalTreeWorkbenchModel';

async function dropModel(id: string, scopeKey?: string): Promise<void> {
  const event = new MouseEvent('drop', { bubbles: true, cancelable: true });
  Object.defineProperty(event, 'dataTransfer', {
    value: {
      types: [CANVAS_CATALOG_NODE_DRAG_MIME_TYPE],
      getData: (type: string) =>
        type === CANVAS_CATALOG_NODE_DRAG_MIME_TYPE
          ? JSON.stringify({ id, ...(scopeKey == null ? {} : { scopeKey }) })
          : '',
    },
  });
  await act(async () => {
    container.querySelector('[data-slot="canvas-relational-tree-surface"]')!.dispatchEvent(event);
  });
}

describe('working Models inside the open Model', () => {
  setupWorkbenchTest();
  it('uses the registered dbt publication as a private linked Input and Cancel discards it', async () => {
    const graph = await createModelOutputDependencyFixture();
    const definition = {
      ...graph.producer,
      id: 'registered-clientes',
      name: 'clientes',
      path: 'models/clientes.sql',
      metadata: {
        dbtModelReference: WorkspaceDbtModelReferenceSchema.parse({
          schemaVersion: 'workspace-dbt-model-reference.v1',
          canvasId: 'file-owner',
          uniqueId: 'model.demo.clientes',
          connectionRef: {
            schemaVersion: 'connection-ref.v1',
            provider: 'postgres',
            connectionId: 'warehouse-main',
          },
          relationId: allocateDvtRelationId(),
          fields: [
            { fieldId: allocateDvtFieldId(), name: 'client_id', dataType: 'text', nullable: true },
          ],
        }),
      },
    };
    const apply = vi.fn();
    await act(async () =>
      root.render(
        <CanvasRelationalTreeWorkbench
          transformNode={graph.producer}
          nodes={[...graph.nodes, definition]}
          edges={graph.edges}
          copy={COPY}
          authoring={{ canEditNode: true, onApplyNodeDraft: apply }}
        />
      )
    );
    await dropModel(definition.id);
    expect(container.querySelectorAll('[data-pending="true"]')).toHaveLength(1);
    expect(container.querySelector('[data-pending="true"]')?.textContent).toContain('clientes');
    expect(apply).not.toHaveBeenCalled();
    await act(async () =>
      container
        .querySelector<HTMLButtonElement>('[data-slot="canvas-relational-tree-cancel"]')!
        .click()
    );
    expect(container.querySelectorAll('[data-pending="true"]')).toHaveLength(0);
    expect(apply).not.toHaveBeenCalled();
    expect(definition.metadata.dbtModelReference.uniqueId).toBe('model.demo.clientes');
    expect('transformAuthoring' in definition.metadata).toBe(false);
  });

  it('rejects an incoming physical Source before editing and refreshes admission for a new receiver', async () => {
    const graph = await createModelOutputDependencyFixture();
    const apply = vi.fn();
    let model: ReturnType<typeof useCanvasRelationalTreeWorkbenchModel>;
    function Host({ target }: { target: typeof graph.consumer }): null {
      model = useCanvasRelationalTreeWorkbenchModel({
        transformNode: target,
        nodes: graph.nodes,
        edges: graph.edges,
        copy: COPY,
        authoring: { canEditNode: true, onApplyNodeDraft: apply },
      });
      return null;
    }
    await act(async () => root.render(<Host target={graph.consumer} />));
    expect(model!.modelComposition.nodeIds.has(graph.right.id)).toBe(false);
    await act(async () => {
      expect(model!.modelComposition.copy(graph.right.id)).toBe(false);
    });
    expect(model!.session.active).toBe(false);
    expect(model!.session.occurrences.pending).toHaveLength(0);
    await act(async () => root.render(<Host target={graph.producer} />));
    expect(model!.modelComposition.nodeIds.has(graph.right.id)).toBe(true);
    expect(apply).not.toHaveBeenCalled();
  });

  it('does not publish private copies through the separate output-order command', async () => {
    const graph = await createModelOutputDependencyFixture();
    const apply = vi.fn(() => ({ outcome: 'rejected', reason: 'invalid_draft' }) as const);
    let model: ReturnType<typeof useCanvasRelationalTreeWorkbenchModel>;
    function Host(): React.JSX.Element | null {
      model = useCanvasRelationalTreeWorkbenchModel({
        transformNode: graph.consumer,
        nodes: graph.nodes,
        edges: graph.edges,
        copy: COPY,
        authoring: { canEditNode: true, onApplyNodeDraft: apply },
      });
      return null;
    }
    await act(async () => {
      root.render(<Host />);
    });
    await act(async () => {
      expect(model!.modelComposition.copy(graph.producer.id)).toBe(true);
    });
    await act(async () => {
      expect(model!.session.applyOutputOrder(graph.consumerDocument)).toBe(false);
    });
    expect(model!.session.occurrences.pending).toHaveLength(1);
    expect(apply).not.toHaveBeenCalled();
  });

  it('stages independent copies in the same receiver and Cancel discards them without writes', async () => {
    const graph = await createModelOutputDependencyFixture();
    const original = structuredClone(graph.producer);
    const apply = vi.fn();
    await act(async () => {
      root.render(
        <CanvasRelationalTreeWorkbench
          transformNode={graph.consumer}
          nodes={graph.nodes}
          edges={graph.edges}
          copy={COPY}
          authoring={{ canEditNode: true, onApplyNodeDraft: apply }}
        />
      );
    });
    await dropModel(graph.producer.id);
    await dropModel(graph.producer.id);
    const cards = [...container.querySelectorAll('[data-pending="true"]')];
    expect(cards).toHaveLength(2);
    expect(new Set(cards.map((card) => card.getAttribute('data-relation-id'))).size).toBe(2);
    expect(
      container.querySelector('[data-slot="canvas-relational-tree-workbench"]')
    ).not.toBeNull();
    expect(apply).not.toHaveBeenCalled();
    expect(graph.producer).toEqual(original);
    await act(async () => {
      container
        .querySelector<HTMLButtonElement>('[data-slot="canvas-relational-tree-cancel"]')!
        .click();
    });
    expect(container.querySelectorAll('[data-pending="true"]')).toHaveLength(0);
    expect(apply).not.toHaveBeenCalled();
  });

  it.each([false, true])(
    'does not mutate on denied permission or a foreign Canvas scope (%s)',
    async (editable) => {
      const graph = await createModelOutputDependencyFixture();
      const apply = vi.fn();
      await act(async () => {
        root.render(
          <CanvasRelationalTreeWorkbench
            transformNode={graph.consumer}
            nodes={graph.nodes}
            edges={graph.edges}
            copy={COPY}
            authoring={{ canEditNode: editable, onApplyNodeDraft: apply }}
          />
        );
      });
      await dropModel(graph.producer.id, editable ? 'another-canvas' : undefined);
      expect(container.querySelectorAll('[data-pending="true"]')).toHaveLength(0);
      expect(apply).not.toHaveBeenCalled();
    }
  );

  it('invalidates private copies when the workspace changes even when Model identities are reused', async () => {
    const graph = await createModelOutputDependencyFixture();
    const apply = vi.fn();
    const context: CanvasModelBrowserPresentation = {
      scopeKey: 'tenant-A/project-A/main',
      mode: 'semantic',
      onSelect: () => false,
      catalog: () => null,
      cataloguePresentation: {
        query: '',
        open: true,
        expandedIds: new Set(),
        onQuery: () => {},
        onOpenChange: () => {},
        onToggleDetails: () => {},
      },
    };
    const render = (scopeKey: string): React.ReactElement => (
      <CanvasModelBrowser.Provider value={{ ...context, scopeKey }}>
        <CanvasRelationalTreeWorkbench
          transformNode={graph.consumer}
          nodes={graph.nodes}
          edges={graph.edges}
          copy={COPY}
          authoring={{ canEditNode: true, onApplyNodeDraft: apply }}
        />
      </CanvasModelBrowser.Provider>
    );
    await act(async () => {
      root.render(render(context.scopeKey!));
    });
    await dropModel(graph.producer.id, context.scopeKey!);
    expect(container.querySelectorAll('[data-pending="true"]')).toHaveLength(1);
    await act(async () => {
      root.render(render('tenant-B/project-B/main'));
    });
    expect(container.querySelectorAll('[data-pending="true"]')).toHaveLength(0);
    await dropModel(graph.producer.id, context.scopeKey!);
    expect(container.querySelectorAll('[data-pending="true"]')).toHaveLength(0);
    expect(apply).not.toHaveBeenCalled();
  });
});
