// @vitest-environment jsdom

import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { CanvasInspectorPanel } from './CanvasInspectorPanel';
import type { CanonicalNode } from '../../types/canonical';

function buildNode(): CanonicalNode {
  return {
    id: 'node_1',
    name: 'orders_source',
    description: 'Orders source table',
    pluginId: 'dvt',
    kind: 'dvt:source',
    role: 'input',
    status: 'idle',
    tags: [],
  };
}

function buildDbtSourceNode(id: string, name: string, sourceName: string): CanonicalNode {
  return {
    id,
    name,
    pluginId: 'dbt',
    kind: 'dbt:source',
    role: 'input',
    status: 'idle',
    tags: [],
    metadata: {
      dbt: {
        packageName: 'analytics',
        sourceName,
        schemaName: 'raw',
        tableName: 'orders',
      },
    },
  };
}

function buildDbtModelNode(): CanonicalNode {
  return {
    id: 'model-orders',
    name: 'Orders Model',
    pluginId: 'dbt',
    kind: 'dbt:model',
    role: 'transform',
    status: 'idle',
    tags: [],
    metadata: {
      dbt: {
        packageName: 'analytics',
        materialized: 'view',
      },
    },
  };
}

describe('CanvasInspectorPanel', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    (
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
    vi.clearAllMocks();
  });

  it('exposes a route-owned editable properties form and applies validated changes', async () => {
    const onApplyNodeDraft = vi.fn();

    await act(async () => {
      root.render(
        <CanvasInspectorPanel
          node={buildNode()}
          nodes={[]}
          edges={[]}
          activeRunId={null}
          onHide={vi.fn()}
          authoring={{
            canEditNode: true,
            onApplyNodeDraft,
          }}
        />
      );
    });

    const nameInput = container.querySelector('input[name="node-name"]') as HTMLInputElement | null;
    const descriptionInput = container.querySelector(
      'textarea[name="node-description"]'
    ) as HTMLTextAreaElement | null;

    expect(nameInput?.value).toBe('orders_source');
    expect(descriptionInput?.value).toBe('Orders source table');

    await act(async () => {
      if (nameInput != null) {
        const valueSetter = Object.getOwnPropertyDescriptor(
          HTMLInputElement.prototype,
          'value'
        )?.set;
        valueSetter?.call(nameInput, 'orders_source_v2');
        nameInput.dispatchEvent(new Event('input', { bubbles: true }));
      }
    });

    expect(container.textContent).toContain('Apply');
    expect(container.textContent).toContain('Cancel');

    const applyButton = Array.from(container.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('Apply')
    );

    await act(async () => {
      applyButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(onApplyNodeDraft).toHaveBeenCalledWith({
      name: 'orders_source_v2',
      description: 'Orders source table',
    });
  });

  it('keeps the form read-only when the route cannot mutate node properties', async () => {
    await act(async () => {
      root.render(
        <CanvasInspectorPanel
          node={buildNode()}
          nodes={[]}
          edges={[]}
          activeRunId={null}
          onHide={vi.fn()}
          authoring={{
            canEditNode: false,
            onApplyNodeDraft: vi.fn(),
          }}
        />
      );
    });

    const nameInput = container.querySelector('input[name="node-name"]');
    const applyButton = Array.from(container.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('Apply')
    );

    expect(nameInput?.getAttribute('disabled')).not.toBeNull();
    expect(applyButton).toBeUndefined();
  });

  it('shows active canvas properties when no node is selected and applies a rename', async () => {
    const onApplyCanvasPatch = vi.fn();
    const onDeleteCanvas = vi.fn();

    await act(async () => {
      root.render(
        <CanvasInspectorPanel
          node={null}
          nodes={[]}
          edges={[]}
          activeRunId={null}
          onHide={vi.fn()}
          authoring={{
            canEditNode: true,
            onApplyNodeDraft: vi.fn(),
          }}
          canvas={{
            id: 'canvas-modeling',
            kind: 'transformation',
            title: 'Modeling',
            environmentId: 'dev',
            defaultPermission: 'write',
            executionEnvironmentOptions: [
              { value: 'dev', label: 'Development' },
              { value: 'prod', label: 'Production' },
            ],
            canEdit: true,
            canDelete: true,
            onApplyCanvasPatch,
            onDeleteCanvas,
          }}
        />
      );
    });

    const titleInput = container.querySelector(
      'input[name="canvas-title"]'
    ) as HTMLInputElement | null;
    const environmentSelect = container.querySelector(
      'select[name="canvas-environment"]'
    ) as HTMLSelectElement | null;

    expect(container.textContent).toContain('Canvas properties');
    expect(titleInput?.value).toBe('Modeling');
    expect(container.textContent).toContain('canvas-modeling');
    expect(environmentSelect?.value).toBe('dev');

    await act(async () => {
      if (titleInput != null) {
        const valueSetter = Object.getOwnPropertyDescriptor(
          HTMLInputElement.prototype,
          'value'
        )?.set;
        valueSetter?.call(titleInput, 'Modeling v2');
        titleInput.dispatchEvent(new Event('input', { bubbles: true }));
      }
    });

    const applyButton = Array.from(container.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('Apply')
    );

    await act(async () => {
      applyButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(onApplyCanvasPatch).toHaveBeenCalledWith({
      title: 'Modeling v2',
    });

    const deleteButton = Array.from(container.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('Delete')
    );

    await act(async () => {
      deleteButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(onDeleteCanvas).toHaveBeenCalledTimes(1);
  });

  it('lets the active canvas select its execution environment from the inspector', async () => {
    const onApplyCanvasPatch = vi.fn();

    await act(async () => {
      root.render(
        <CanvasInspectorPanel
          node={null}
          nodes={[]}
          edges={[]}
          activeRunId={null}
          onHide={vi.fn()}
          authoring={{
            canEditNode: true,
            onApplyNodeDraft: vi.fn(),
          }}
          canvas={{
            id: 'canvas-modeling',
            kind: 'transformation',
            title: 'Modeling',
            environmentId: 'dev',
            defaultPermission: 'write',
            executionEnvironmentOptions: [
              { value: 'dev', label: 'Development' },
              { value: 'stage', label: 'Staging' },
              { value: 'prod', label: 'Production' },
            ],
            canEdit: true,
            canDelete: true,
            onApplyCanvasPatch,
            onDeleteCanvas: vi.fn(),
          }}
        />
      );
    });

    const environmentSelect = container.querySelector(
      'select[name="canvas-environment"]'
    ) as HTMLSelectElement | null;

    expect(environmentSelect?.value).toBe('dev');
    expect(
      Array.from(environmentSelect?.options ?? []).map((option) => option.textContent)
    ).toEqual(['Development', 'Staging', 'Production']);

    await act(async () => {
      if (environmentSelect != null) {
        const valueSetter = Object.getOwnPropertyDescriptor(
          HTMLSelectElement.prototype,
          'value'
        )?.set;
        valueSetter?.call(environmentSelect, 'prod');
        environmentSelect.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });

    const applyButton = Array.from(container.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('Apply')
    );

    await act(async () => {
      applyButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(onApplyCanvasPatch).toHaveBeenCalledWith({
      environmentId: 'prod',
    });
  });

  it('keeps canvas properties read-only when the route cannot mutate canvases', async () => {
    await act(async () => {
      root.render(
        <CanvasInspectorPanel
          node={null}
          nodes={[]}
          edges={[]}
          activeRunId={null}
          onHide={vi.fn()}
          authoring={{
            canEditNode: false,
            onApplyNodeDraft: vi.fn(),
          }}
          canvas={{
            id: 'canvas-modeling',
            kind: 'transformation',
            title: 'Modeling',
            executionEnvironmentOptions: [{ value: 'dev', label: 'Development' }],
            canEdit: false,
            canDelete: false,
            onApplyCanvasPatch: vi.fn(),
            onDeleteCanvas: vi.fn(),
          }}
        />
      );
    });

    const titleInput = container.querySelector('input[name="canvas-title"]');
    const deleteButton = Array.from(container.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('Delete')
    );

    expect(titleInput?.getAttribute('disabled')).not.toBeNull();
    expect(deleteButton?.getAttribute('disabled')).not.toBeNull();
  });

  it('lets dbt model cards select origin and materialization through the route-owned draft', async () => {
    const onApplyNodeDraft = vi.fn();
    const sourceA = buildDbtSourceNode('source-raw-orders', 'Raw Orders', 'raw');
    const sourceB = buildDbtSourceNode('source-staging-orders', 'Staging Orders', 'staging');
    const model = buildDbtModelNode();

    await act(async () => {
      root.render(
        <CanvasInspectorPanel
          node={model}
          nodes={[sourceA, sourceB, model]}
          edges={[
            {
              id: 'edge-raw-model',
              sourceId: sourceA.id,
              targetId: model.id,
              relation: 'lineage',
            },
            {
              id: 'edge-staging-model',
              sourceId: sourceB.id,
              targetId: model.id,
              relation: 'lineage',
            },
          ]}
          activeRunId={null}
          onHide={vi.fn()}
          authoring={{
            canEditNode: true,
            onApplyNodeDraft,
          }}
        />
      );
    });

    const originSelect = container.querySelector(
      'select[name="dbt-origin"]'
    ) as HTMLSelectElement | null;
    const materializedSelect = container.querySelector(
      'select[name="dbt-materialized"]'
    ) as HTMLSelectElement | null;

    await act(async () => {
      if (originSelect != null) {
        const valueSetter = Object.getOwnPropertyDescriptor(
          HTMLSelectElement.prototype,
          'value'
        )?.set;
        valueSetter?.call(originSelect, sourceB.id);
        originSelect.dispatchEvent(new Event('change', { bubbles: true }));
      }
      if (materializedSelect != null) {
        const valueSetter = Object.getOwnPropertyDescriptor(
          HTMLSelectElement.prototype,
          'value'
        )?.set;
        valueSetter?.call(materializedSelect, 'table');
        materializedSelect.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });

    const applyButton = Array.from(container.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('Apply')
    );

    await act(async () => {
      applyButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(onApplyNodeDraft).toHaveBeenCalledWith(
      expect.objectContaining({
        dbt: expect.objectContaining({
          materialized: 'table',
          selectedSourceId: sourceB.id,
        }),
      })
    );
  });
});
