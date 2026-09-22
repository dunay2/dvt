// @vitest-environment jsdom

import { fireEvent } from '@testing-library/dom';
import type { ConnectedSourceRef } from '@dvt/contracts';
import React, { act, useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type { CanonicalNode } from '../../types/canonical';
import { createCanvasInspectorNodeDraft } from './canvasInspectorAuthoringModel';
import {
  appendDvtSubstraitJoinInput,
  createDvtSubstraitStringJoinDraft,
  encodeDvtSubstraitJoinDocument,
  inspectDvtSubstraitJoinDraft,
  type DvtSubstraitJoinDraft,
} from './canvasDvtSubstraitJoinComposition';
import { applyDvtSubstraitSemanticDocument } from './canvasDvtTransformAuthoringAuthority';
import { DvtSubstraitInnerJoinAuthoringSection } from './DvtSubstraitInnerJoinAuthoringSection';
import { collectDvtSubstraitJoinConditionComparisons } from './canvasDvtSubstraitJoinCondition';

function sourceRef(table: string): ConnectedSourceRef {
  return {
    schemaVersion: 'connected-source-ref.v1',
    connectionRef: {
      schemaVersion: 'connection-ref.v1',
      provider: 'postgres',
      connectionId: 'warehouse-main',
    },
    sourceObjectId: `raw.${table}`,
  };
}

function initialJoinDraft(): DvtSubstraitJoinDraft {
  return createDvtSubstraitStringJoinDraft({
    left: {
      source: {
        nodeId: 'source-orders',
        schema: 'raw',
        table: 'orders',
        sourceRef: sourceRef('orders'),
      },
      fields: ['order_id'],
      fieldTypes: ['i64'],
    },
    right: {
      source: {
        nodeId: 'source-order-details',
        schema: 'raw',
        table: 'order_details',
        sourceRef: sourceRef('order_details'),
      },
      fields: ['order_id'],
      fieldTypes: ['i64'],
    },
    leftFieldName: 'order_id',
    rightFieldName: 'order_id',
    targetNodeId: 'transform-orders',
  });
}

function nInputJoinDraft(): DvtSubstraitJoinDraft {
  const initial = initialJoinDraft();
  const inspection = inspectDvtSubstraitJoinDraft(initial);
  if (!inspection.ok) throw new Error('Expected an inspectable initial JOIN.');
  const leftSourceFieldId = inspection.projection.inputs[0]?.fields[0]?.fieldId;
  if (leftSourceFieldId == null) throw new Error('Expected a stable left operand.');
  return appendDvtSubstraitJoinInput(initial, {
    source: {
      nodeId: 'source-shipments',
      schema: 'raw',
      table: 'shipments',
      sourceRef: sourceRef('shipments'),
    },
    fields: ['order_id', 'shipment_id'],
    fieldTypes: ['i64', 'i64'],
    predicate: { leftSourceFieldId, rightFieldName: 'order_id' },
    selectedFields: ['shipment_id'],
  });
}

function persistedJoinNode(draft = initialJoinDraft()): CanonicalNode {
  const semanticDocument = encodeDvtSubstraitJoinDocument(draft);
  return applyDvtSubstraitSemanticDocument(
    {
      id: 'transform-orders',
      name: 'Orders',
      pluginId: 'dvt',
      kind: 'dvt:transform',
      role: 'transform',
      status: 'idle',
      tags: [],
    },
    semanticDocument
  );
}

function PersistedJoinHarness({
  node = persistedJoinNode(),
}: Readonly<{ node?: CanonicalNode }>): JSX.Element {
  const [draft, setDraft] = useState(() => createCanvasInspectorNodeDraft(node));
  if (
    draft.dvt?.kind !== 'transform' ||
    draft.dvt.mode !== 'substrait' ||
    draft.dvt.shape !== 'inner_join'
  ) {
    throw new Error('Expected a reloaded INNER JOIN draft.');
  }
  const inspection = inspectDvtSubstraitJoinDraft({
    plan: draft.dvt.plan,
    sidecar: draft.dvt.sidecar,
  });
  if (!inspection.ok) throw new Error('Expected an inspectable reloaded INNER JOIN.');
  return (
    <>
      <DvtSubstraitInnerJoinAuthoringSection
        disabled={false}
        draft={draft.dvt}
        appendCandidates={[]}
        onChange={setDraft}
        outputNameDrafts={draft.outputNameDrafts ?? {}}
      />
      <output data-slot="persisted-join-operator">
        {inspection.projection.joins[0]?.conditions.flatMap(
          collectDvtSubstraitJoinConditionComparisons
        )[0]?.operator ?? 'equal'}
      </output>
      <output data-slot="persisted-join-operators">
        {inspection.projection.joins
          .map(
            (join) =>
              join.conditions.flatMap(collectDvtSubstraitJoinConditionComparisons)[0]?.operator ??
              'equal'
          )
          .join('|')}
      </output>
      <output data-slot="persisted-join-identities">
        {[
          ...inspection.projection.inputs.flatMap((input) =>
            input.fields.map((field) => field.fieldId)
          ),
          ...inspection.projection.joinRelations.map((relation) => relation.relationId),
        ].join('|')}
      </output>
    </>
  );
}

describe('DvtSubstraitJoinPredicateEditors', () => {
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

  it('reopens a persisted typed predicate and edits it without replacing stable identities', () => {
    act(() => root.render(<PersistedJoinHarness />));
    const identities = container.querySelector(
      '[data-slot="persisted-join-identities"]'
    )?.textContent;

    expect(
      container.querySelector('[data-slot="semantic-workbench-join-condition-list"]')
    ).not.toBeNull();
    act(() => {
      fireEvent.click(
        container.querySelector<HTMLButtonElement>('[aria-label="Editar condición"]')!
      );
    });
    act(() => {
      fireEvent.change(
        container.querySelector<HTMLSelectElement>('[aria-label="Comparador de la condición"]')!,
        { target: { value: 'gt' } }
      );
      fireEvent.click(
        Array.from(container.querySelectorAll<HTMLButtonElement>('button')).find(
          (button) => button.textContent?.trim() === 'Guardar condición'
        )!
      );
    });

    expect(container.querySelector('[data-slot="persisted-join-operator"]')?.textContent).toBe(
      'gt'
    );
    expect(container.querySelector('[data-slot="persisted-join-identities"]')?.textContent).toBe(
      identities
    );
  });

  it('reuses the same editor for every persisted N-input JOIN relation', () => {
    act(() => root.render(<PersistedJoinHarness node={persistedJoinNode(nInputJoinDraft())} />));
    const identities = container.querySelector(
      '[data-slot="persisted-join-identities"]'
    )?.textContent;
    const editors = container.querySelectorAll(
      '[data-slot="semantic-workbench-join-condition-list"]'
    );
    const editActions = container.querySelectorAll<HTMLButtonElement>(
      '[aria-label="Editar condición"]'
    );

    expect(editors).toHaveLength(2);
    act(() => {
      fireEvent.click(editActions[1]!);
    });
    act(() => {
      fireEvent.change(
        container.querySelector<HTMLSelectElement>('[aria-label="Comparador de la condición"]')!,
        { target: { value: 'gt' } }
      );
      fireEvent.click(
        Array.from(container.querySelectorAll<HTMLButtonElement>('button')).find(
          (button) => button.textContent?.trim() === 'Guardar condición'
        )!
      );
    });

    expect(container.querySelector('[data-slot="persisted-join-operators"]')?.textContent).toBe(
      'equal|gt'
    );
    expect(container.querySelector('[data-slot="persisted-join-identities"]')?.textContent).toBe(
      identities
    );
  });
});
