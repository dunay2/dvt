// @vitest-environment jsdom

import { Circle, Square } from 'lucide-react';
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { NodeKindRegistration } from '../../plugins/nodeTypeContracts';
import { CanvasAddNodePalette } from './CanvasAddNodePalette';
import { buildCanvasOutputTargetTemplateCatalog } from './canvasOutputTargetTemplateCatalog';
import { buildCanvasTransformationTemplateCatalog } from './canvasTransformationTemplateCatalog';

describe('CanvasAddNodePalette', () => {
  const dvtNodeKinds: readonly NodeKindRegistration[] = [
    {
      kind: 'dvt:source',
      pluginId: 'dvt',
      label: 'Source',
      role: 'input',
      icon: Circle,
      borderClass: 'border-sky-500',
      minimapColor: '#0ea5e9',
      allowsIncoming: false,
      allowsOutgoing: true,
      supportsColumns: true,
    },
    {
      kind: 'dvt:sql_transform',
      pluginId: 'dvt',
      label: 'SQL transform',
      role: 'transform',
      icon: Square,
      borderClass: 'border-violet-500',
      minimapColor: '#8b5cf6',
      allowsIncoming: true,
      allowsOutgoing: true,
      supportsColumns: true,
    },
    {
      kind: 'dvt:sink',
      pluginId: 'dvt',
      label: 'Sink',
      role: 'output',
      icon: Square,
      borderClass: 'border-emerald-500',
      minimapColor: '#10b981',
      allowsIncoming: true,
      allowsOutgoing: false,
      supportsColumns: false,
    },
  ];
  const dbtNodeKinds: readonly NodeKindRegistration[] = [
    {
      kind: 'dbt:source',
      pluginId: 'dbt',
      label: 'Source',
      role: 'input',
      icon: Circle,
      borderClass: 'border-sky-500',
      minimapColor: '#0ea5e9',
      allowsIncoming: false,
      allowsOutgoing: true,
      supportsColumns: true,
    },
    {
      kind: 'dbt:model',
      pluginId: 'dbt',
      label: 'Model',
      role: 'transform',
      icon: Square,
      borderClass: 'border-violet-500',
      minimapColor: '#8b5cf6',
      allowsIncoming: true,
      allowsOutgoing: true,
      supportsColumns: true,
    },
  ];
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    (
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    document.body.replaceChildren();
    vi.clearAllMocks();
  });

  it('keeps terse dbt node kinds discoverable through semantic authoring search', async () => {
    await renderPalette({ nodeKinds: dbtNodeKinds });

    await openPalette();
    await setPaletteSearch('authoring');

    expect(paletteOptionLabels()).toEqual(['Source', 'Model']);
    expect(document.body.querySelector('[data-slot="canvas-add-node-palette-empty"]')).toBeNull();
  });

  it('selects the active semantic match from the keyboard without exposing a permanent rail', async () => {
    const onCreateAuthoringNode = vi.fn();
    await renderPalette({ nodeKinds: dvtNodeKinds, onCreateAuthoringNode });

    expect(document.body.textContent).not.toContain('SQL transform');

    await openPalette();
    await setPaletteSearch('sql');
    await submitPaletteSearch();

    expect(onCreateAuthoringNode).toHaveBeenCalledWith(dvtNodeKinds[1]);
    expect(document.body.querySelector('[data-slot="canvas-add-node-palette"]')).toBeNull();
  });

  it('renders governed transformation and output templates as palette options', async () => {
    await renderPalette({
      nodeKinds: dvtNodeKinds,
      outputTargetTemplates: buildCanvasOutputTargetTemplateCatalog(dvtNodeKinds),
      transformationTemplates: buildCanvasTransformationTemplateCatalog(dvtNodeKinds),
    });

    await openPalette();
    await setPaletteSearch('append');

    const outputTargetOptions = paletteOptionLabels('output-target-template');
    expect(outputTargetOptions).toEqual(
      expect.arrayContaining([expect.stringContaining('Append fact table')])
    );
    expect(document.body.textContent).toContain('analytics.fact_transformed_events');
  });

  async function renderPalette({
    nodeKinds,
    onCreateAuthoringNode = vi.fn(),
    outputTargetTemplates = [],
    transformationTemplates = [],
  }: Partial<React.ComponentProps<typeof CanvasAddNodePalette>> &
    Pick<React.ComponentProps<typeof CanvasAddNodePalette>, 'nodeKinds'>): Promise<void> {
    await act(async () => {
      root.render(
        <CanvasAddNodePalette
          nodeKinds={nodeKinds}
          onCreateAuthoringNode={onCreateAuthoringNode}
          outputTargetTemplates={outputTargetTemplates}
          transformationTemplates={transformationTemplates}
          triggerLabel="Insert"
        />
      );
    });
  }

  async function openPalette(): Promise<void> {
    await clickButton(container, 'Insert');
  }

  async function clickButton(scope: ParentNode, label: string): Promise<void> {
    const button = Array.from(scope.querySelectorAll<HTMLButtonElement>('button')).find(
      (candidate) => candidate.textContent?.includes(label)
    );
    expect(button, label).toBeDefined();

    await act(async () => {
      button?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
  }

  async function setPaletteSearch(value: string): Promise<void> {
    const search = document.body.querySelector<HTMLInputElement>(
      '[data-slot="canvas-add-node-palette-search"]'
    );
    expect(search).not.toBeNull();

    await act(async () => {
      search?.focus();
      if (search) {
        search.value = value;
      }
      search?.dispatchEvent(new InputEvent('input', { bubbles: true, data: value }));
    });
  }

  async function submitPaletteSearch(): Promise<void> {
    const search = document.body.querySelector<HTMLInputElement>(
      '[data-slot="canvas-add-node-palette-search"]'
    );
    expect(search).not.toBeNull();

    await act(async () => {
      search?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    });
  }

  function paletteOptionLabels(kind?: string): string[] {
    const selector =
      kind == null
        ? '[data-slot="canvas-add-node-palette-option"]'
        : `[data-slot="canvas-add-node-palette-option"][data-option-kind="${kind}"]`;

    return Array.from(document.body.querySelectorAll<HTMLButtonElement>(selector)).map(
      (button) => button.textContent?.trim() ?? ''
    );
  }
});
