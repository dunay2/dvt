// @vitest-environment jsdom

import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { OperationalDrawerSelectionRecoveryView } from './OperationalDrawerSelectionRecoveryView';
import { resolveCanvasViewCopy } from '../../views/canvas/canvasCopyCatalog';

describe('OperationalDrawerSelectionRecoveryView', () => {
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
  });

  it('renders supplied scope facts and invokes three distinct recovery commands', async () => {
    const commands = {
      discardUnavailable: vi.fn(),
      useWorkspaceScope: vi.fn(),
      refreshAnalysis: vi.fn(),
    };

    await act(async () => {
      root.render(
        <OperationalDrawerSelectionRecoveryView
          model={{
            queryRail: 'CollectCanvasExecutionSelection',
            commandRail: 'RecoverCanvasExecutionSelection',
            status: 'blocked',
            selectionMode: 'explicit',
            requestedRootNodeIds: ['model.removed', 'source.raw', 'test.orders'],
            unavailableRootNodeIds: ['model.removed'],
            nonExecutableRootNodeIds: ['source.raw'],
            derivedDependencyNodeIds: [],
            admittedScopeNodeIds: [],
            lastPreviewRevision: 'analysis-sha-1',
            canDiscardUnavailable: true,
            canUseWorkspaceScope: true,
            canRefreshAnalysis: true,
            pendingStrategy: null,
            failure: null,
            receipt: {
              rail: 'RecoverCanvasExecutionSelection',
              strategy: 'refresh_analysis',
              affectedNodeIds: [],
              retainedNodeIds: ['model.removed', 'source.raw', 'test.orders'],
              resultingMode: 'explicit',
            },
          }}
          commands={commands}
          messages={resolveCanvasViewCopy('en')}
        />
      );
    });

    expect(container.textContent).toContain('Selected nodes');
    expect(container.textContent).toContain('model.removed');
    expect(container.textContent).toContain('Nodes no longer available');
    expect(container.textContent).toContain('Nodes that cannot run');
    expect(container.textContent).toContain('Nodes to run');
    expect(container.textContent).toContain('None');
    expect(container.textContent).toContain('analysis-sha-1');
    expect(container.textContent).toContain('Kept selected nodes');

    const buttons = [...container.querySelectorAll('button')];
    const click = async (label: string): Promise<void> => {
      const button = buttons.find((candidate) => candidate.textContent === label);
      expect(button).toBeDefined();
      await act(async () => button?.click());
    };

    await click('Remove unavailable nodes');
    await click('Run entire flow');
    await click('Check again');

    expect(commands.discardUnavailable).toHaveBeenCalledTimes(1);
    expect(commands.useWorkspaceScope).toHaveBeenCalledTimes(1);
    expect(commands.refreshAnalysis).toHaveBeenCalledTimes(1);
  });

  it('uses localized copy without exposing authority failure technical detail', async () => {
    await act(async () => {
      root.render(
        <OperationalDrawerSelectionRecoveryView
          model={{
            queryRail: 'CollectCanvasExecutionSelection',
            commandRail: 'RecoverCanvasExecutionSelection',
            status: 'blocked',
            selectionMode: 'explicit',
            requestedRootNodeIds: ['model.removed'],
            unavailableRootNodeIds: ['model.removed'],
            nonExecutableRootNodeIds: [],
            derivedDependencyNodeIds: [],
            admittedScopeNodeIds: [],
            lastPreviewRevision: null,
            canDiscardUnavailable: true,
            canUseWorkspaceScope: false,
            canRefreshAnalysis: true,
            pendingStrategy: null,
            receipt: null,
            failure: {
              rail: 'RecoverCanvasExecutionSelection',
              strategy: 'refresh_analysis',
              code: 'authority_refresh_failed',
              detail: 'POST /workspace/dbt-project/graph failed with internal adapter details',
            },
          }}
          commands={{
            discardUnavailable: vi.fn(),
            useWorkspaceScope: vi.fn(),
            refreshAnalysis: vi.fn(),
          }}
          messages={resolveCanvasViewCopy('es')}
        />
      );
    });

    expect(container.textContent).toContain('No se pudo volver a comprobar la selección.');
    expect(container.textContent).not.toContain('POST /workspace/dbt-project/graph');
    expect(container.textContent).not.toContain('internal adapter details');
  });
});
