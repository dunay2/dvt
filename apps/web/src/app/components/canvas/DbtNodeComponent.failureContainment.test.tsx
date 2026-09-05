// @vitest-environment jsdom

import { ReactFlowProvider } from '@xyflow/react';
import { fireEvent } from '@testing-library/dom';
import React, { act, type ComponentProps } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { NodeRendererProps } from '../../plugins/contracts/NodeRendering';
import { PLUGIN_REGISTRY, type PluginContributions } from '../../plugins/registry';
import DbtNodeComponent from './DbtNodeComponent';

function ThrowingRenderer(_props: NodeRendererProps): never {
  throw new Error('node renderer failed');
}

function ThrowingBadgeIcon(): never {
  throw new Error('badge renderer failed');
}

describe('DbtNodeComponent plugin failure containment', () => {
  let container: HTMLDivElement;
  let root: Root;
  let testPlugin: PluginContributions;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    (
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
    vi.spyOn(console, 'error').mockImplementation(() => {});

    testPlugin = {
      id: 'failure-containment-test',
      displayName: 'Failure containment test',
      version: '1.0.0',
      nodeRenderers: new Map([
        [
          'dvt:transform',
          { kind: 'dvt:transform', priority: Number.MAX_SAFE_INTEGER, component: ThrowingRenderer },
        ],
      ]),
      nodeBadges: [
        {
          id: 'failing-badge',
          pluginId: 'failure-containment-test',
          forKinds: ['dvt:transform'],
          priority: 20,
          getBadge: () => ({
            icon: ThrowingBadgeIcon as never,
            color: 'red',
            position: 'top-right',
            tooltip: 'Failing badge',
          }),
        },
        {
          id: 'healthy-badge',
          pluginId: 'failure-containment-test',
          forKinds: ['dvt:transform'],
          priority: 10,
          getBadge: () => ({
            text: 'Healthy',
            color: 'green',
            position: 'top-left',
          }),
        },
      ],
    };
    PLUGIN_REGISTRY.push(testPlugin);
  });

  afterEach(() => {
    const pluginIndex = PLUGIN_REGISTRY.indexOf(testPlugin);
    if (pluginIndex >= 0) PLUGIN_REGISTRY.splice(pluginIndex, 1);
    act(() => root.unmount());
    container.remove();
    vi.restoreAllMocks();
  });

  it('uses the canonical node fallback and keeps healthy badges when plugin rendering throws', () => {
    const nodeProps = {
      id: 'model.orders',
      selected: false,
      data: {
        name: 'Orders model',
        type: 'MODEL',
        status: 'idle',
      },
    } as unknown as ComponentProps<typeof DbtNodeComponent>;

    act(() => {
      root.render(
        <ReactFlowProvider>
          <DbtNodeComponent {...nodeProps} />
        </ReactFlowProvider>
      );
    });

    expect(container.textContent).toContain('Orders model');
    expect(container.textContent).toContain('Healthy');
  });

  it('opens Properties on Code while honoring an explicit external editor denial', () => {
    const onInspectNode = vi.fn();
    const nodeProps = {
      id: 'model.orders',
      selected: false,
      data: {
        name: 'Orders model',
        type: 'MODEL',
        status: 'idle',
        canOpenNodeCode: false,
        onInspectNode,
        presentationTruth: {
          columns: {
            declared: [],
            inherited: [],
            visible: [],
            declaredCount: 0,
            inheritedCount: 0,
            visibleCount: 0,
            visibleProvenance: 'none',
          },
          code: {
            kind: 'inline',
            content: 'select 1',
            language: 'sql',
          },
        },
      },
    } as unknown as ComponentProps<typeof DbtNodeComponent>;

    act(() => {
      root.render(
        <ReactFlowProvider>
          <DbtNodeComponent {...nodeProps} />
        </ReactFlowProvider>
      );
    });

    act(() => {
      fireEvent.dblClick(container.querySelector('div')!);
    });

    expect(onInspectNode).toHaveBeenCalledOnce();
    expect(onInspectNode).toHaveBeenCalledWith('model.orders', 'code');
  });
});
