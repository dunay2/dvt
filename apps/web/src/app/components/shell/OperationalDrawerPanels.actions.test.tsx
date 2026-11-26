// @vitest-environment jsdom

import { fireEvent } from '@testing-library/dom';
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  BottomOperationalDrawerBody,
  BottomOperationalProblemsPanel,
} from './OperationalDrawerPanels';
import type { OperationalDrawerContribution } from './operationalDrawerContributionStore';
import { resolveCanvasViewCopy } from '../../views/canvas/canvasCopyCatalog';

function buildContribution(
  overrides?: Partial<OperationalDrawerContribution>
): OperationalDrawerContribution {
  return {
    source: 'canvas',
    title: 'Canvas operations',
    copy: {
      problemsAriaLabel: 'Canvas problems',
      noProblemsMessage: 'No current Canvas problems.',
      previewAriaLabel: 'Canvas execution preview',
      previewAction: 'Create Execution Preview',
      previewReadyStatus: 'Preview ready',
      previewBlockedStatus: 'Preview blocked',
      dataAriaLabel: 'Source data sample',
      dataIdleMessage: 'Open a source sample.',
      dataLoadingTemplate: 'Loading {nodeName}.',
      dataEmptyTemplate: '{nodeName} returned no rows.',
      dataConnectionNotFoundTemplate: 'Connection missing for {nodeName}.',
      dataSourceObjectNotFoundTemplate: 'Object missing for {nodeName}.',
      dataUnavailableTemplate: 'Sample unavailable for {nodeName}.',
      dataUnknownErrorTemplate: 'Sample failed for {nodeName}.',
      dataTruncatedTemplate: 'Showing {limit} rows.',
      dataCaptionTemplate: 'Sample from {nodeName}',
      dataRowsLabel: 'rows',
      dataColumnsLabel: 'columns',
      dataNullValue: 'NULL',
      dataRefreshAction: 'Refresh',
      dataQueriedAtLabel: 'Queried at',
      dataBoundedLiveTemplate: 'Up to {limit} rows · First page only · No guaranteed row order.',
      tabsAriaLabel: 'Canvas operational drawer',
      severity: { info: 'Info', warning: 'Warning', error: 'Error' },
    },
    tabs: [
      { id: 'preview', label: 'Preview', count: 1 },
      { id: 'data', label: 'Data', count: null },
    ],
    problems: {
      items: [
        {
          id: 'plan_integrity',
          severity: 'warning',
          message: 'Preview required before running.',
          detail: 'Execution Preview integrity',
          action: {
            label: 'Create Execution Preview',
            onAction: vi.fn(),
          },
        },
      ],
    },
    runs: {
      activeRunId: null,
      canStartRun: false,
      onStartRun: vi.fn(),
      status: 'blocked',
    },
    preview: {
      status: 'blocked',
      summary: 'Preview required before running.',
      blockers: ['Execution Preview integrity'],
      canPreview: true,
      onPreviewExecutionPlan: vi.fn(),
      selectionRecovery: null,
    },
    ...overrides,
  };
}

describe('OperationalDrawerPanels action surfaces', () => {
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

  it('renders readiness problem actions from the contribution model', async () => {
    const onAction = vi.fn();
    const contribution = buildContribution({
      problems: {
        items: [
          {
            id: 'plan_integrity',
            severity: 'warning',
            message: 'Preview required before running.',
            detail: 'Execution Preview integrity',
            action: { label: 'Create Execution Preview', onAction },
          },
        ],
      },
    });

    await act(async () => {
      root.render(<BottomOperationalProblemsPanel contribution={contribution} />);
    });

    const action = Array.from(container.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('Create Execution Preview')
    );

    expect(action).not.toBeNull();
    fireEvent.click(action!);
    expect(onAction).toHaveBeenCalledTimes(1);
  });

  it('delegates explicit selection recovery from Preview', async () => {
    const useWorkspaceScope = vi.fn();
    const contribution = buildContribution({
      preview: {
        status: 'blocked',
        summary: 'Execution selection requires recovery.',
        blockers: ['Execution selection'],
        canPreview: false,
        onPreviewExecutionPlan: vi.fn(),
        selectionRecovery: {
          model: {
            queryRail: 'CollectCanvasExecutionSelection',
            commandRail: 'RecoverCanvasExecutionSelection',
            status: 'blocked',
            selectionMode: 'explicit',
            requestedRootNodeIds: ['model.removed'],
            unavailableRootNodeIds: ['model.removed'],
            nonExecutableRootNodeIds: [],
            derivedDependencyNodeIds: [],
            admittedScopeNodeIds: [],
            lastPreviewRevision: 'analysis-sha-1',
            canDiscardUnavailable: true,
            canUseWorkspaceScope: true,
            canRefreshAnalysis: true,
            pendingStrategy: null,
            receipt: null,
            failure: null,
          },
          commands: {
            discardUnavailable: vi.fn(),
            useWorkspaceScope,
            refreshAnalysis: vi.fn(),
          },
          messages: resolveCanvasViewCopy('en'),
        },
      },
    });

    await act(async () => {
      root.render(<BottomOperationalDrawerBody activeTab="preview" contribution={contribution} />);
    });

    expect(container.textContent).toContain('Selected nodes');
    expect(container.textContent).toContain('model.removed');
    const workspaceButton = Array.from(container.querySelectorAll('button')).find(
      (button) => button.textContent === 'Run entire flow'
    );
    expect(workspaceButton).toBeDefined();

    await act(async () => fireEvent.click(workspaceButton!));

    expect(useWorkspaceScope).toHaveBeenCalledTimes(1);
  });
});
