// @vitest-environment jsdom

import { fireEvent, waitFor } from '@testing-library/dom';
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { CanonicalNode } from '../../types/canonical';
import {
  createDvtSubstraitProjectionDraft,
  resolveDvtSubstraitProjectionSource,
} from './canvasDvtSubstraitProjection';
import { resolveDvtSubstraitFilterCapabilities } from './canvasFilterCapabilities';
import { dvtSubstraitTextComparison } from './canvasDvtSubstraitTextComparison';
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

describe('Inspector Filter command adapter', () => {
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
  it.each([false, true])(
    'respects read-only %s and shares canonical comparison semantics',
    async (disabled) => {
      const resolved = resolveDvtSubstraitProjectionSource(source)!;
      const draft = createDvtSubstraitProjectionDraft({
        source: resolved,
        targetNodeId: transform.id,
        outputs: [{ fieldId: 'output:customer', name: 'customer', sourceFieldName: 'customer' }],
      });
      const onChange = vi.fn();
      await act(async () =>
        root.render(
          <DvtRelationFilterAuthoringSection
            disabled={disabled}
            draft={draft}
            node={transform}
            onChange={onChange}
          />
        )
      );
      if (disabled) {
        expect(container.querySelector('form')).toBeNull();
        expect(onChange).not.toHaveBeenCalled();
        return;
      }
      await waitFor(() => expect(container.querySelectorAll('select')).toHaveLength(2));
      const operator = container.querySelectorAll<HTMLSelectElement>('select')[1]!;
      const comparisons = resolveDvtSubstraitFilterCapabilities({ dataType: 'text' });
      expect([...operator.options].map((option) => option.value)).toEqual(
        comparisons.map((item) => item.capabilityId)
      );
      const notEqual = comparisons.find((comparison) => comparison.name === 'not_equal')!;
      await act(async () => {
        fireEvent.change(operator, { target: { value: notEqual.capabilityId } });
        fireEvent.change(container.querySelector('input')!, { target: { value: 'Ada' } });
      });
      await act(async () => fireEvent.submit(container.querySelector('form')!));
      expect(onChange).toHaveBeenCalledOnce();
      const updated = onChange.mock.calls[0]![0];
      const updatedRoot = updated.plan.relations[0].relType;
      expect(updatedRoot.value.input.relType.case).toBe('filter');
      expect(
        dvtSubstraitTextComparison.inspect(
          updated.plan,
          updatedRoot.value.input.relType.value.condition
        )
      ).toMatchObject({ operator: 'not_equal', value: 'Ada' });
    }
  );
});
