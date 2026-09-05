// @vitest-environment jsdom

import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { buildTestNodeKind } from './canvasKindRegistration.testSupport';
import { buildCanvasAddNodeCatalogItems } from './canvasAddNodeCatalogModel';
import { CanvasAddNodeCatalogView } from './CanvasAddNodeCatalogView';

describe('CanvasAddNodeCatalogView', () => {
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
  });

  it('renders searchable categorized catalog items with descriptions', async () => {
    await renderCatalog();

    expect(searchInput()).toBeDefined();
    expect(document.activeElement).toBe(searchInput());
    expect(container.querySelectorAll('[role="menuitem"]')).toHaveLength(0);
    expect(
      container.querySelectorAll('[data-slot="canvas-context-menu-add-catalog-item"]')
    ).toHaveLength(2);
    expect(container.textContent).toContain('Add source');
    expect(container.textContent).toContain('Sources');
    expect(container.textContent).toContain('Attach a governed warehouse or dbt source');
    expect(container.textContent).toContain('Add model');
    expect(container.textContent).toContain('Models');
    expect(
      container.querySelectorAll('[data-slot="canvas-context-menu-add-catalog-category"]')
    ).toHaveLength(2);
    expect(
      container.querySelector('[data-catalog-category="source"]')?.getAttribute('aria-label')
    ).toBe('Sources');
    expect(
      container.querySelector('[data-slot="canvas-context-menu-add-catalog-item"] span.truncate')
    ).toBeNull();
    expect(
      container
        .querySelector('[data-slot="canvas-context-menu-add-catalog-layout"]')
        ?.className.includes('overflow-x-hidden')
    ).toBe(true);
  });

  it('filters catalog items without mutating the source list', async () => {
    await renderCatalog();

    await act(async () => {
      const input = searchInput();
      input.value = 'transform';
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });

    expect(container.textContent).toContain('Add model');
    expect(container.textContent).not.toContain('Add source');
  });

  it('routes item selection by semantic catalog item', async () => {
    const onSelectItem = vi.fn();
    await renderCatalog(onSelectItem);

    await act(async () => {
      findButton('Add model')?.click();
    });

    expect(onSelectItem).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'create-node:dvt:transform',
        category: 'model',
      })
    );
  });

  it('exposes stable semantic attributes for source-import catalog actions', async () => {
    const sourceKind = buildTestNodeKind('dvt:source', 'Source');

    await act(async () => {
      root.render(
        <CanvasAddNodeCatalogView
          items={buildCanvasAddNodeCatalogItems({
            actions: [
              {
                action: 'open-source-import',
                label: 'Add source',
                registration: sourceKind,
              },
            ],
          })}
          onSelectItem={vi.fn()}
        />
      );
    });

    const sourceImportAction = container.querySelector<HTMLButtonElement>(
      '[data-slot="canvas-context-menu-add-catalog-item"][data-menu-action="open-source-import"][data-registration-kind="dvt:source"]'
    );

    expect(sourceImportAction).not.toBeNull();
    expect(sourceImportAction?.textContent).toContain('Add source');
  });

  async function renderCatalog(onSelectItem = vi.fn()): Promise<void> {
    const items = buildCanvasAddNodeCatalogItems({
      authoringNodeKinds: [
        buildTestNodeKind('dvt:source', 'Source'),
        buildTestNodeKind('dvt:transform', 'Transform'),
      ],
    });

    await act(async () => {
      root.render(<CanvasAddNodeCatalogView items={items} onSelectItem={onSelectItem} />);
    });
  }

  function searchInput(): HTMLInputElement {
    const input = container.querySelector<HTMLInputElement>('input[type="search"]');
    expect(input).toBeDefined();
    return input as HTMLInputElement;
  }

  function findButton(label: string): HTMLButtonElement | undefined {
    return Array.from(container.querySelectorAll<HTMLButtonElement>('button')).find((button) =>
      button.textContent?.includes(label)
    );
  }
});
