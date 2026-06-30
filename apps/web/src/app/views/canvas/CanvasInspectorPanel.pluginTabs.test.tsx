// @vitest-environment jsdom

import { fireEvent } from '@testing-library/dom';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { CanvasInspectorPanel } from './CanvasInspectorPanel';
import {
  buildDbtInspectorModelNode,
  buildInspectorNode,
  renderInspectorPanel,
  selectInspectorMoreItem,
  tabByText,
  wrapInspectorWithRunsProvider,
} from './CanvasInspectorPanel.test.support';
import type { IRunsPort } from '../../ports/runs';
import type { CanonicalNode } from '../../types/canonical';

describe('CanvasInspectorPanel plugin tabs', () => {
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

  it('falls back to general details when the next node does not expose the active plugin tab', async () => {
    const dbtNode = buildDbtInspectorModelNode();
    const dvtNode = buildInspectorNode();
    const runsService: IRunsPort = {
      listRunSummaries: vi.fn(async () => []),
      getRunSnapshot: vi.fn(async () => null),
      startRun: vi.fn(async () => ({
        runId: 'run-created',
        accepted: true,
      })),
      listRunEvents: vi.fn(async () => ({ events: [] })),
    };

    const renderInspector = (node: CanonicalNode): JSX.Element =>
      wrapInspectorWithRunsProvider(
        <CanvasInspectorPanel
          node={node}
          nodes={[dbtNode, dvtNode]}
          edges={[]}
          activeRunId={null}
          onHide={vi.fn()}
          authoring={{
            canEditNode: false,
            onApplyNodeDraft: vi.fn(),
          }}
        />,
        runsService
      );

    await act(async () => {
      root.render(renderInspector(dbtNode));
    });

    await selectInspectorMoreItem(container, 'dbt.history');

    expect(container.querySelector('[data-slot="node-inspector-more-trigger"]')?.textContent).toBe(
      'More: History'
    );

    await act(async () => {
      root.render(renderInspector(dvtNode));
    });

    const tabLabels = Array.from(container.querySelectorAll<HTMLElement>('[role="tab"]')).map(
      (tab) => tab.textContent?.trim()
    );

    expect(tabLabels).not.toContain('History');
    expect(tabByText(container, 'General').getAttribute('aria-selected')).toBe('true');
  });

  it('lets dbt overview tags be edited through the route-owned node draft', async () => {
    const onApplyNodeDraft = vi.fn();
    const model = {
      ...buildDbtInspectorModelNode(),
      tags: ['authoring'],
    };

    await act(async () => {
      renderInspectorPanel(root, {
        node: model,
        nodes: [model],
        authoring: {
          canEditNode: true,
          onApplyNodeDraft,
        },
      });
    });

    await selectInspectorMoreItem(container, 'dbt.overview');

    const tagsEditor = container.querySelector('[data-slot="node-inspector-overview-tags-editor"]');
    const newTagInput = tagsEditor?.querySelector(
      'input[name="node-overview-new-tag"]'
    ) as HTMLInputElement | null;

    expect(tagsEditor).not.toBeNull();
    expect(tagsEditor?.textContent).toContain('authoring');
    expect(newTagInput?.value).toBe('');

    await act(async () => {
      fireEvent.input(newTagInput!, { target: { value: 'finance' } });
    });

    const addTagButton = Array.from(tagsEditor?.querySelectorAll('button') ?? []).find((button) =>
      button.textContent?.includes('Add tag')
    );

    await act(async () => {
      addTagButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(tagsEditor?.textContent).toContain('finance');

    const applyButton = Array.from(tagsEditor?.querySelectorAll('button') ?? []).find((button) =>
      button.textContent?.includes('Apply tags')
    );

    await act(async () => {
      applyButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(onApplyNodeDraft).toHaveBeenCalledWith(
      expect.objectContaining({
        tags: ['authoring', 'finance'],
        dbt: expect.objectContaining({
          packageName: 'analytics',
        }),
      })
    );
  });
});
