// @vitest-environment jsdom

import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { NODE_PROPERTY_ROW_ID } from '../../components/inspector/nodePropertiesReadModel';
import type { CanonicalNode } from '../../types/canonical';
import { CanvasNodeWorkbenchPanel } from './CanvasNodeWorkbenchPanel';
import { useApplicationLanguageStore } from '../../stores/applicationLanguageStore';

const NODE: CanonicalNode = {
  id: 'model.analytics.orders',
  name: 'orders',
  description: 'Existing description.',
  pluginId: 'dvt',
  kind: 'dvt:transform',
  role: 'transform',
  status: 'idle',
  tags: [],
};

const SECOND_NODE: CanonicalNode = {
  ...NODE,
  id: 'model.analytics.customers',
  name: 'customers',
};

const FILE_BACKED_NODE: CanonicalNode = {
  ...NODE,
  path: 'models/orders.sql',
};

describe('CanvasNodeWorkbenchPanel contextual contributions', () => {
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
    act(() => root.unmount());
    container.remove();
    document.documentElement.lang = '';
    useApplicationLanguageStore.setState({ language: 'en' });
    vi.restoreAllMocks();
  });

  it('renders a selected-node contribution and removes the passive row it supersedes', () => {
    act(() => {
      root.render(
        <CanvasNodeWorkbenchPanel
          node={NODE}
          nodes={[NODE]}
          edges={[]}
          activeRunId={null}
          preferredTabId="general"
          authoring={{ canEditNode: false, onApplyNodeDraft: vi.fn() }}
          contributions={[
            {
              id: 'dbt-description-editor',
              nodeId: NODE.id,
              sectionId: 'general',
              placement: 'after-body',
              supersededRowIds: [NODE_PROPERTY_ROW_ID.description],
              supersededSectionIds: ['code'],
              content: <div data-slot="description-editor-contribution">Editor</div>,
            },
          ]}
          onClose={vi.fn()}
        />
      );
    });

    const generalSection = container.querySelector(
      '[data-slot="canvas-node-workbench-general-section"]'
    );
    const labels = Array.from(generalSection?.querySelectorAll('dt') ?? []).map((element) =>
      element.textContent?.trim()
    );

    expect(container.querySelector('[data-slot="description-editor-contribution"]')).not.toBeNull();
    expect(labels).not.toContain('Description');
    expect(generalSection?.textContent).not.toContain('Existing description.');
    expect(container.querySelector('[data-slot="canvas-node-workbench-code-section"]')).toBeNull();
  });

  it('lets an authoritative Code contribution replace passive copy and the legacy launcher', () => {
    act(() => {
      root.render(
        <CanvasNodeWorkbenchPanel
          node={FILE_BACKED_NODE}
          nodes={[FILE_BACKED_NODE]}
          edges={[]}
          activeRunId={null}
          preferredTabId="code"
          authoring={{ canEditNode: false, onApplyNodeDraft: vi.fn() }}
          contributions={[
            {
              id: 'workspace-file-editor',
              nodeId: FILE_BACKED_NODE.id,
              sectionId: 'code',
              placement: 'before-body',
              content: <div data-slot="workspace-file-editor-contribution">Editor</div>,
            },
          ]}
          onClose={vi.fn()}
        />
      );
    });

    const codeSection = container.querySelector('[data-slot="canvas-node-workbench-code-section"]');
    expect(
      codeSection?.querySelector('[data-slot="workspace-file-editor-contribution"]')
    ).not.toBeNull();
    expect(codeSection?.textContent).not.toContain(FILE_BACKED_NODE.path);
  });

  it('resolves workbench commands through the Canvas locale catalog', () => {
    useApplicationLanguageStore.getState().configureApplicationLanguage('es');

    act(() => {
      root.render(
        <CanvasNodeWorkbenchPanel
          node={NODE}
          nodes={[NODE]}
          edges={[]}
          activeRunId={null}
          preferredTabId="general"
          authoring={{ canEditNode: false, onApplyNodeDraft: vi.fn() }}
          onClose={vi.fn()}
        />
      );
    });

    expect(
      Array.from(container.querySelectorAll('button')).some(
        (button) => button.textContent === 'Cerrar'
      )
    ).toBe(true);
    expect(
      container.querySelector('[data-slot="canvas-node-workbench-more-trigger"]')?.textContent
    ).toContain('Más');
  });

  it('removes a generic section superseded by an authoritative contribution', () => {
    act(() => {
      root.render(
        <CanvasNodeWorkbenchPanel
          node={NODE}
          nodes={[NODE]}
          edges={[]}
          activeRunId={null}
          preferredTabId="code"
          authoring={{ canEditNode: false, onApplyNodeDraft: vi.fn() }}
          contributions={[
            {
              id: 'dbt-description-editor',
              nodeId: NODE.id,
              sectionId: 'general',
              placement: 'after-body',
              supersededSectionIds: ['code'],
              content: <div>Description editor</div>,
            },
          ]}
          onClose={vi.fn()}
        />
      );
    });

    expect(container.querySelector('[data-slot="canvas-node-workbench-code-section"]')).toBeNull();
    expect(
      container.querySelector('[data-slot="canvas-node-workbench-general-section"]')
    ).not.toBeNull();
  });

  it('keeps healthy workbench contributions when a sibling contribution throws', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const ThrowingContribution = (): never => {
      throw new Error('workbench contribution failed');
    };

    act(() => {
      root.render(
        <CanvasNodeWorkbenchPanel
          node={NODE}
          nodes={[NODE]}
          edges={[]}
          activeRunId={null}
          preferredTabId="general"
          authoring={{ canEditNode: false, onApplyNodeDraft: vi.fn() }}
          contributions={[
            {
              id: 'failing-contribution',
              nodeId: NODE.id,
              sectionId: 'general',
              placement: 'after-body',
              content: <ThrowingContribution />,
            },
            {
              id: 'healthy-contribution',
              nodeId: NODE.id,
              sectionId: 'general',
              placement: 'after-body',
              content: <div data-slot="healthy-workbench-contribution">Healthy</div>,
            },
          ]}
          onClose={vi.fn()}
        />
      );
    });

    expect(container.querySelector('[data-slot="healthy-workbench-contribution"]')).not.toBeNull();
  });

  it('recovers a contribution boundary when the selected node changes', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const ThrowingContribution = (): never => {
      throw new Error('workbench contribution failed');
    };

    act(() => {
      root.render(
        <CanvasNodeWorkbenchPanel
          node={NODE}
          nodes={[NODE, SECOND_NODE]}
          edges={[]}
          activeRunId={null}
          preferredTabId="general"
          authoring={{ canEditNode: false, onApplyNodeDraft: vi.fn() }}
          contributions={[
            {
              id: 'shared-contribution',
              nodeId: NODE.id,
              sectionId: 'general',
              placement: 'after-body',
              content: <ThrowingContribution />,
            },
          ]}
          onClose={vi.fn()}
        />
      );
    });

    act(() => {
      root.render(
        <CanvasNodeWorkbenchPanel
          node={SECOND_NODE}
          nodes={[NODE, SECOND_NODE]}
          edges={[]}
          activeRunId={null}
          preferredTabId="general"
          authoring={{ canEditNode: false, onApplyNodeDraft: vi.fn() }}
          contributions={[
            {
              id: 'shared-contribution',
              nodeId: SECOND_NODE.id,
              sectionId: 'general',
              placement: 'after-body',
              content: <div data-slot="recovered-workbench-contribution">Recovered</div>,
            },
          ]}
          onClose={vi.fn()}
        />
      );
    });

    expect(
      container.querySelector('[data-slot="recovered-workbench-contribution"]')
    ).not.toBeNull();
  });
});
