// @vitest-environment jsdom
/** Prove explicit SQL actions, late-response fencing and existing Model command handoff. */
import React, { act, createRef } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { fireEvent, getByRole, waitFor } from '@testing-library/dom';
import { afterEach, expect, vi } from 'vitest';
import {
  allocateDvtFieldId,
  TRANSFORM_DATA_SAMPLE_CONTRACT_VERSION,
  ModelSqlContextResponseSchema,
  ModelSqlCompilationResponseSchema,
  TransformSqlDraftDataSampleResponseSchema,
  type ModelSqlCompilationRequest,
} from '@dvt/contracts';
import { sha256HexUtf8 } from '@dvt/crypto';

import { AppServicesProvider } from '../../../services/AppServicesContext';
import { useApplicationLanguageStore } from '../../../stores/applicationLanguageStore';
import { createDvtSubstraitProjectionDraft } from '../canvasDvtSubstraitProjection';
import { encodeDvtSubstraitSemanticDocument } from '../canvasDvtSubstraitSemanticDocument';
import { transformNode, sourceRef } from '../CanvasRelationalTreeWorkbench.test-support';
import type { CanvasRelationalTreeWorkbenchHandle } from '../useCanvasRelationalTreeWorkbenchHandle';
import type { CanvasRelationalTreeAuthoringContract } from '../canvasRelationalTreeWorkbench.types';
import { CanvasModelSqlPanel } from './CanvasModelSqlPanel';

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

let root: Root | undefined;
export let container: HTMLDivElement;
export let dataHost: HTMLDivElement;
afterEach(async () => {
  await act(async () => root?.unmount());
  container?.remove();
  dataHost?.remove();
  useApplicationLanguageStore.setState({ language: 'en' });
});
const context = ModelSqlContextResponseSchema.parse({
  schemaVersion: 'canvas-model-sql-context.v1',
  canvasId: 'canvas',
  transformNodeId: 'transform',
  draftRevision: 'r1',
  contextSha256: 'a'.repeat(64),
  semanticPlanSha256: null,
  connectionRef: sourceRef('orders').connectionRef,
  sql: null,
  inputs: [
    {
      nodeId: 'orders',
      name: 'Orders',
      sqlName: 'orders',
      columns: [{ id: 'orders_id', name: 'orders_id', dataType: 'string', nullable: true }],
    },
  ],
  diagnostics: [],
});
const document = createDvtSubstraitProjectionDraft({
  source: {
    nodeId: 'orders',
    schema: 'public',
    table: 'orders',
    sourceRef: sourceRef('orders'),
    fields: [{ name: 'orders_id', dataType: 'text' }],
  },
  targetNodeId: 'transform',
  outputs: [{ fieldId: allocateDvtFieldId(), name: 'orders_id', sourceFieldName: 'orders_id' }],
});
export function proposal(input: ModelSqlCompilationRequest) {
  const result = ModelSqlCompilationResponseSchema.parse({
    schemaVersion: 'canvas-model-sql-compilation.v1',
    canvasId: input.canvasId,
    transformNodeId: input.transformNodeId,
    draftRevision: input.draftRevision,
    contextSha256: input.contextSha256,
    sqlSha256: sha256HexUtf8(input.sql),
    status: 'valid',
    normalizedSql: input.sql,
    semanticDocument: encodeDvtSubstraitSemanticDocument(document),
    columns: [
      {
        id: document.sidecar.fields.at(-1)!.fieldId,
        name: 'orders_id',
        dataType: 'string',
        nullable: true,
      },
    ],
    inputAdditions: [{ nodeId: 'orders', columnId: 'orders_id' }],
    diagnostics: [],
  });
  if (result.status !== 'valid') throw new Error('Expected a complete fixture proposal.');
  return result;
}
export async function mount() {
  useApplicationLanguageStore.setState({ language: 'en' });
  container = documentElement();
  dataHost = documentElement();
  root = createRoot(container);
  const ref = createRef<CanvasRelationalTreeWorkbenchHandle>();
  const visual = createRef<CanvasRelationalTreeWorkbenchHandle>();
  const onApplyNodeDraft = vi.fn<CanvasRelationalTreeAuthoringContract['onApplyNodeDraft']>(() => ({
    outcome: 'no_changes',
  }));
  const query = {
    context: vi.fn(async () => context),
    compile: vi.fn(async (input: ModelSqlCompilationRequest) => proposal(input)),
    preview: vi.fn(async (input: ModelSqlCompilationRequest) =>
      TransformSqlDraftDataSampleResponseSchema.parse({
        schemaVersion: 'canvas-transform-sql-draft-data-sample.v1',
        contextSha256: input.contextSha256,
        sqlSha256: sha256HexUtf8(input.sql),
        sample: {
          contractVersion: TRANSFORM_DATA_SAMPLE_CONTRACT_VERSION,
          canvasId: input.canvasId,
          transformNodeId: input.transformNodeId,
          draftRevision: input.draftRevision,
          semanticPlanSha256: proposal(input).semanticDocument.semanticPlan.sha256,
          columns: [{ name: 'orders_id', type: 'text', nullable: true }],
          rows: [{ values: ['SQL_ROW_3944'] }],
          truncated: false,
          limit: 20,
          provenance: {
            mode: 'live',
            sourceRefs: [sourceRef('orders')],
            queriedAt: '2026-11-17T00:00:00.000Z',
            navigation: 'bounded-first-page',
            limit: 20,
          },
        },
      })
    ),
  };
  const onOpenData = vi.fn();
  const render = (revision = 'r1') =>
    root!.render(
      <AppServicesProvider overrides={{ canvasModelSqlQuery: query }}>
        <CanvasModelSqlPanel
          ref={ref}
          panelId="sql-panel"
          canvasId="canvas"
          node={transformNode()}
          revision={revision}
          open
          active
          visual={visual}
          authoring={{ canEditNode: true, onApplyNodeDraft }}
          ownsData
          dataHost={dataHost}
          onOpenData={onOpenData}
          onClose={vi.fn()}
        />
      </AppServicesProvider>
    );
  await act(async () => render());
  await waitFor(() => expect(query.context).toHaveBeenCalled());
  const type = async (sql: string) => {
    await act(async () => {
      fireEvent.input(getByRole(container, 'textbox', { name: 'Model SQL source' }), {
        target: { value: sql },
      });
    });
  };
  const click = async (name: string) => {
    await act(async () => {
      fireEvent.click(getByRole(container, 'button', { name }));
    });
  };
  return { ref, visual, query, onApplyNodeDraft, onOpenData, type, click, render };
}
function documentElement() {
  const element = globalThis.document.createElement('div');
  globalThis.document.body.append(element);
  return element;
}
