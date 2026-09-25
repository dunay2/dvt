import React, { act, useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import type { IWarehouseSourceImportPort } from '../../ports/workspace';
import { AppServicesProvider } from '../../services/AppServicesContext';
import type { CanonicalEdge, CanonicalNode } from '../../types/canonical';
import { createAppServicesTestOverrides } from '../../../testing/appServicesTestDoubles';
import { useApplicationLanguageStore } from '../../stores/applicationLanguageStore';
import {
  createCanvasInspectorNodeDraft,
  validateCanvasInspectorNodeDraft,
} from './canvasInspectorAuthoringModel';
import { DvtAuthoringFields } from './DvtAuthoringFields';
import type { CanvasRelationalPredicateSeed } from './canvasRelationalPredicateSeed';
import { beforeEach, afterEach, vi } from 'vitest';

function DvtAuthoringFieldsHarness({
  node,
  nodes,
  edges,
  section,
  warehouseSourceImport,
  externalConnectionId,
  relationalPredicateSeed,
  onClearRelationalPredicateSeed,
}: Readonly<{
  node: CanonicalNode;
  nodes?: readonly CanonicalNode[];
  edges?: readonly CanonicalEdge[];
  section?: 'all' | 'general' | 'columns' | 'code';
  warehouseSourceImport?: IWarehouseSourceImportPort;
  externalConnectionId?: string;
  relationalPredicateSeed?: CanvasRelationalPredicateSeed;
  onClearRelationalPredicateSeed?: () => void;
}>): JSX.Element {
  const [draft, setDraft] = useState(() => createCanvasInspectorNodeDraft(node));
  const errors = validateCanvasInspectorNodeDraft(draft);

  const fields = (
    <>
      {externalConnectionId ? (
        <button
          type="button"
          data-slot="load-external-connection"
          onClick={() => {
            setDraft((currentDraft) =>
              currentDraft.dvt?.kind === 'source'
                ? {
                    ...currentDraft,
                    dvt: {
                      ...currentDraft.dvt,
                      connectionRef: {
                        schemaVersion: 'connection-ref.v1',
                        connectionId: externalConnectionId,
                        provider: 'postgres',
                      },
                    },
                  }
                : currentDraft
            );
          }}
        >
          Load external connection
        </button>
      ) : null}
      <DvtAuthoringFields
        node={node}
        nodes={nodes}
        edges={edges}
        disabled={false}
        draft={draft}
        errors={errors}
        section={section}
        relationalPredicateSeed={relationalPredicateSeed}
        onClearRelationalPredicateSeed={onClearRelationalPredicateSeed}
        onChange={setDraft}
      />
      <output data-slot="dvt-draft-json">{JSON.stringify(draft.dvt)}</output>
      <output data-slot="output-name-drafts">{JSON.stringify(draft.outputNameDrafts ?? {})}</output>
    </>
  );
  if (!warehouseSourceImport) return fields;

  return (
    <AppServicesProvider
      overrides={{
        ...createAppServicesTestOverrides(),
        warehouseSourceImport,
      }}
    >
      {fields}
    </AppServicesProvider>
  );
}

export function useAuthoringFieldsHarness() {
  let container: HTMLDivElement;
  let root: Root;
  beforeEach(() => {
    useApplicationLanguageStore.setState({ language: 'en' });
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
    useApplicationLanguageStore.setState({ language: 'en' });
    vi.clearAllMocks();
    vi.useRealTimers();
  });
  function renderFields(
    node: CanonicalNode,
    warehouseSourceImport?: IWarehouseSourceImportPort,
    externalConnectionId?: string,
    nodes?: readonly CanonicalNode[],
    edges?: readonly CanonicalEdge[],
    section?: 'all' | 'general' | 'columns' | 'code',
    relationalPredicateSeed?: CanvasRelationalPredicateSeed,
    onClearRelationalPredicateSeed?: () => void
  ): void {
    act(() => {
      root.render(
        <DvtAuthoringFieldsHarness
          node={node}
          nodes={nodes}
          edges={edges}
          section={section}
          warehouseSourceImport={warehouseSourceImport}
          externalConnectionId={externalConnectionId}
          relationalPredicateSeed={relationalPredicateSeed}
          onClearRelationalPredicateSeed={onClearRelationalPredicateSeed}
        />
      );
    });
  }
  function draftJson(): string {
    return container.querySelector('[data-slot="dvt-draft-json"]')?.textContent ?? '';
  }
  function outputNameDraftsJson(): string {
    return container.querySelector('[data-slot="output-name-drafts"]')?.textContent ?? '';
  }
  return {
    renderFields,
    draftJson,
    outputNameDraftsJson,
    get container() {
      return container;
    },
  };
}
