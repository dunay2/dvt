// @vitest-environment jsdom

import { fireEvent, waitFor } from '@testing-library/dom';
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { CanonicalNode } from '../../types/canonical';
import { NodePropertiesTabs } from './NodePropertiesTabs';
import type { NodePropertiesReadModel } from './nodePropertiesReadModel';

const node: CanonicalNode = {
  id: 'src-orders',
  name: 'Orders Source',
  pluginId: 'dvt.warehouse-source',
  kind: 'dvt:source',
  role: 'input',
  status: 'idle',
  tags: [],
};

const readModel: NodePropertiesReadModel = {
  nodeId: node.id,
  nodeName: node.name,
  sections: [
    { id: 'general', label: 'General', rows: [], tableRows: [] },
    { id: 'columns', label: 'Columns', rows: [], tableRows: [] },
    { id: 'summary', label: 'Summary', rows: [], tableRows: [] },
    { id: 'constraints', label: 'Constraints', rows: [], tableRows: [] },
  ],
};

describe('NodePropertiesTabs overflow sections', () => {
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

  it('keeps secondary sections behind More and delegates selection through one callback', async () => {
    const onActiveTabChange = vi.fn();
    act(() => {
      root.render(
        <NodePropertiesTabs
          node={node}
          model={readModel}
          activeRunId={null}
          panels={[]}
          activeTab="general"
          moreLabel="More"
          onActiveTabChange={onActiveTabChange}
          onHide={vi.fn()}
        />
      );
    });

    const moreTrigger = container.querySelector<HTMLButtonElement>(
      '[data-slot="node-inspector-more-trigger"]'
    );

    expect(moreTrigger).not.toBeNull();
    await act(async () => {
      fireEvent.pointerDown(moreTrigger!);
      fireEvent.click(moreTrigger!);
    });

    await waitFor(() => {
      expect(document.body.textContent).toContain('Summary');
      expect(document.body.textContent).toContain('Constraints');
    });

    await act(async () => {
      fireEvent.click(
        document.body.querySelector('[data-slot="node-inspector-more-item-summary"]')!
      );
    });

    expect(onActiveTabChange).toHaveBeenCalledWith('summary');
  });
});
