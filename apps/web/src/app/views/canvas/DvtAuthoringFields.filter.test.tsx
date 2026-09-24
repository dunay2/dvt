// @vitest-environment jsdom
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { CanonicalEdge, CanonicalNode } from '../../types/canonical';
import { createCanvasInspectorNodeDraft } from './canvasInspectorAuthoringModel';
import {
  createDvtSubstraitProjectionDraft,
  resolveDvtSubstraitProjectionSource,
} from './canvasDvtSubstraitProjection';
import { source } from './canvasRelationalOperator.test-support';
import { DvtAuthoringFields } from './DvtAuthoringFields';

const input = source('customers');
const sourceNode: CanonicalNode = {
  id: input.nodeId,
  name: input.table,
  pluginId: 'dvt.warehouse-source',
  kind: 'dvt:source',
  role: 'input',
  status: 'success',
  tags: [],
  metadata: {
    schema: input.schema,
    tableName: input.table,
    connectedSourceRef: input.sourceRef,
    columns: input.fields,
  },
};
const transform: CanonicalNode = {
  id: 'model',
  name: 'Model',
  pluginId: 'dvt',
  kind: 'dvt:transform',
  role: 'transform',
  status: 'idle',
  tags: [],
};

describe('Projection inspector composition boundary', () => {
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
    'blocks pending composition and restores only writable editing: %s',
    async (disabled) => {
      const onChange = vi.fn();
      const otherSource = { ...sourceNode, id: 'other-instance' };
      const inspectorDraft = {
        ...createCanvasInspectorNodeDraft(transform),
        dvt: {
          kind: 'transform' as const,
          mode: 'substrait' as const,
          shape: 'projection' as const,
          materialized: 'view',
          ...createDvtSubstraitProjectionDraft({
            source: resolveDvtSubstraitProjectionSource(sourceNode)!,
            targetNodeId: transform.id,
            outputs: [{ fieldId: 'output:name', name: 'customer', sourceFieldName: 'name' }],
          }),
        },
      };
      const edge = (id: string, sourceId: string, targetId: string): CanonicalEdge => ({
        id,
        sourceId,
        targetId,
        relation: 'lineage',
      });
      const originalEdges = [edge('original', sourceNode.id, transform.id)];
      const render = async (edges: readonly CanonicalEdge[]): Promise<void> => {
        await act(async () =>
          root.render(
            <DvtAuthoringFields
              node={transform}
              nodes={[sourceNode, otherSource, transform]}
              edges={edges}
              disabled={disabled}
              draft={inspectorDraft}
              errors={{}}
              section="columns"
              onChange={onChange}
            />
          )
        );
      };
      await render(originalEdges);
      expect(container.querySelector('[data-slot="dvt-filter-authoring"] form') != null).toBe(
        !disabled
      );
      await render([...originalEdges, edge('pending', otherSource.id, transform.id)]);
      expect(container.querySelector('[data-slot="dvt-filter-authoring"] form')).toBeNull();
      await render([...originalEdges, edge('unrelated', otherSource.id, 'another-model')]);
      expect(container.querySelector('[data-slot="dvt-filter-authoring"] form') != null).toBe(
        !disabled
      );
      expect(onChange).not.toHaveBeenCalled();
    }
  );
});
