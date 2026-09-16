// @vitest-environment jsdom

import { fireEvent } from '@testing-library/dom';
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { CanonicalEdge, CanonicalNode } from '../../types/canonical';
import {
  createDvtSubstraitProjectionDraft,
  resolveDvtSubstraitProjectionSource,
} from './canvasDvtSubstraitProjection';
import {
  inspectDvtSubstraitFilter,
  resolveDvtSubstraitFilterCapabilities,
} from './canvasDvtSubstraitFilter';
import { DvtRelationFilterAuthoringSection } from './DvtRelationFilterAuthoringSection';

const source: CanonicalNode = {
  id: 'orders',
  name: 'Orders',
  pluginId: 'dvt.warehouse-source',
  kind: 'dvt:source',
  role: 'input',
  status: 'success',
  tags: ['source'],
  metadata: {
    schema: 'raw',
    tableName: 'orders',
    connectedSourceRef: {
      schemaVersion: 'connected-source-ref.v1',
      connectionRef: {
        schemaVersion: 'connection-ref.v1',
        connectionId: 'postgres-main',
        provider: 'postgres',
      },
      sourceObjectId: 'raw.orders',
    },
    columns: [{ name: 'customer', type: 'text' }],
  },
};
const transform: CanonicalNode = {
  id: 'model',
  name: 'Model',
  pluginId: 'dvt',
  kind: 'dvt:transform',
  role: 'transform',
  status: 'idle',
  tags: ['authoring'],
};
const edges: readonly CanonicalEdge[] = [
  { id: 'orders-model', sourceId: source.id, targetId: transform.id, relation: 'lineage' },
];

describe('DvtRelationFilterAuthoringSection', () => {
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

  it('lets the author select any admitted binary comparison', async () => {
    const resolved = resolveDvtSubstraitProjectionSource(source);
    if (resolved == null) throw new Error('Expected a connected source.');
    const draft = createDvtSubstraitProjectionDraft({
      source: resolved,
      targetNodeId: transform.id,
      outputs: [{ fieldId: 'output:customer', name: 'customer', sourceFieldName: 'customer' }],
    });
    const onChange = vi.fn();

    act(() => {
      root.render(
        <DvtRelationFilterAuthoringSection
          disabled={false}
          draft={draft}
          node={transform}
          nodes={[source, transform]}
          edges={edges}
          onChange={onChange}
        />
      );
    });

    const operator = container.querySelector<HTMLSelectElement>(
      'select[name="dvt-filter-operator"]'
    );
    expect(operator?.disabled).toBe(false);
    const capabilities = resolveDvtSubstraitFilterCapabilities({
      dataType: 'text',
      provider: 'postgres',
    });
    expect(Array.from(operator?.options ?? []).map((option) => option.value)).toEqual(
      capabilities.map((capability) => capability.capabilityId)
    );

    const notEqual = capabilities.find((capability) => capability.name === 'not_equal');
    if (notEqual == null) throw new Error('Expected the admitted not-equal predicate.');
    await act(() => fireEvent.change(operator!, { target: { value: notEqual.capabilityId } }));
    expect(operator?.value).toBe(notEqual.capabilityId);

    act(() => {
      fireEvent.input(container.querySelector('input[name="dvt-filter-value"]')!, {
        target: { value: 'Ada' },
      });
      fireEvent.click(container.querySelector('[data-slot="dvt-filter-apply"]')!);
    });

    expect(onChange).toHaveBeenCalledOnce();
    expect(inspectDvtSubstraitFilter(onChange.mock.calls[0]![0])).toMatchObject({
      operator: 'not_equal',
      value: 'Ada',
    });
  });
});
