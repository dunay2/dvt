// @vitest-environment jsdom
import { fireEvent } from '@testing-library/dom';
import React, { act } from 'react';
import type { CanonicalEdge } from '../../types/canonical';
import type { ConnectedSourceRef } from '@dvt/contracts';
import { applyDvtSubstraitSemanticDocument } from './canvasDvtTransformAuthoringAuthority';
import {
  createDvtSubstraitProjectionDraft,
  encodeDvtSubstraitProjectionDocument,
} from './canvasDvtSubstraitProjection';
import { describe, expect, it } from 'vitest';
import { useAuthoringFieldsHarness } from './DvtAuthoringFields.test-support';
import { buildDvtNode, buildJoinWarehouseSourceNode } from './DvtAuthoringFields.test-fixtures';
describe('DVT composition replacement', () => {
  const view = useAuthoringFieldsHarness();
  async function selectRelationalOperation(operation: 'inner-join' | 'union-all'): Promise<void> {
    await act(async () => {
      fireEvent.click(
        view.container.querySelector<HTMLButtonElement>(
          `[data-slot="dvt-select-operation-${operation}"]`
        )!
      );
    });
  }
  it('replaces a stale one-input projection with an explicitly configured connected join', async () => {
    const orders = buildJoinWarehouseSourceNode({
      id: 'source-orders',
      table: 'orders',
      columns: ['order_id', 'customer'],
    });
    const audits = buildJoinWarehouseSourceNode({
      id: 'source-audits',
      table: 'auth_audit_events',
      columns: ['event_id', 'principal_id'],
    });
    const connectedSourceRef = orders.metadata?.connectedSourceRef;
    if (connectedSourceRef == null || typeof connectedSourceRef !== 'object') {
      throw new Error('Expected connected source reference.');
    }
    const transform = applyDvtSubstraitSemanticDocument(
      buildDvtNode('dvt:transform'),
      encodeDvtSubstraitProjectionDocument(
        createDvtSubstraitProjectionDraft({
          source: {
            nodeId: orders.id,
            schema: 'public',
            table: 'orders',
            sourceRef: connectedSourceRef as ConnectedSourceRef,
            fields: [
              { name: 'order_id', dataType: 'string' },
              { name: 'customer', dataType: 'string' },
            ],
          },
          targetNodeId: 'dvt-transform',
          outputs: [
            { fieldId: 'output:order_id', name: 'order_id', sourceFieldName: 'order_id' },
            { fieldId: 'output:customer', name: 'customer', sourceFieldName: 'customer' },
          ],
        })
      )
    );
    const edges: readonly CanonicalEdge[] = [
      {
        id: 'orders-transform',
        sourceId: orders.id,
        targetId: transform.id,
        relation: 'lineage',
      },
      {
        id: 'audits-transform',
        sourceId: audits.id,
        targetId: transform.id,
        relation: 'lineage',
      },
    ];

    view.renderFields(
      transform,
      undefined,
      undefined,
      [orders, audits, transform],
      edges,
      'columns'
    );

    await selectRelationalOperation('inner-join');

    await act(async () => {
      fireEvent.click(
        view.container.querySelector<HTMLButtonElement>('[aria-label="Editar condición"]')!
      );
    });
    const leftField = view.container.querySelector<HTMLSelectElement>(
      '[aria-label="Campo del operando izquierdo"]'
    );
    const rightField = view.container.querySelector<HTMLSelectElement>(
      '[aria-label="Campo del operando derecho"]'
    );
    const startJoin = view.container.querySelector<HTMLButtonElement>(
      '[data-slot="dvt-start-configured-inner-join"]'
    );
    expect(leftField).not.toBeNull();
    expect(rightField).not.toBeNull();
    expect(startJoin).not.toBeNull();

    const leftValue = Array.from(leftField!.options).find((option) =>
      option.textContent?.endsWith('.customer')
    )?.value;
    const rightValue = Array.from(rightField!.options).find((option) =>
      option.textContent?.endsWith('.principal_id')
    )?.value;
    expect(leftValue).toBeTruthy();
    expect(rightValue).toBeTruthy();
    await act(async () => {
      fireEvent.change(leftField!, { target: { value: leftValue } });
    });
    await act(async () => {
      fireEvent.change(rightField!, { target: { value: rightValue } });
    });
    await act(async () => {
      const save = Array.from(view.container.querySelectorAll<HTMLButtonElement>('button')).find(
        (button) => button.textContent?.trim() === 'Guardar condición'
      );
      fireEvent.click(save!);
    });
    await act(async () => {
      fireEvent.click(startJoin!);
    });

    expect(view.draftJson()).toContain('"shape":"inner_join"');
    expect(view.draftJson()).toMatch(/"fieldId":"dvt_fld_[^"]+"/);
    expect(view.draftJson()).not.toContain('"field:source-orders:customer"');
    expect(view.draftJson()).not.toContain('"field:source-audits:principal_id"');
    expect(view.container.querySelector('[data-slot="dvt-relation-authoring"]')).not.toBeNull();
  });
});
