/** Owned concern: bind the selected operation panel to the existing protected data query. */
import './canvasSemanticEditor.css';
import { createContext, useEffect, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import type { ICanvasTransformDataSampleQueryPort } from '../../ports/canvasDataSample';
import { useApplicationLanguageStore } from '../../stores/applicationLanguageStore';
import type { CanvasModelPreviewPreparation } from './canvasDraftLifecycle.types';
import { CanvasModelDataPanel } from './CanvasModelDataPanel';
import { useCanvasModelDataQuery } from './useCanvasModelDataQuery';
import { resolveCanvasSemanticEditorCopy } from './canvasSemanticEditorCopy';
import type { CanvasSourceDataSampleTarget } from './canvasSourceDataSample';

export type CanvasOperationPreviewPorts = Readonly<{
  canvasId: string;
  query?: ICanvasTransformDataSampleQueryPort;
  preparePreview?: CanvasModelPreviewPreparation;
  dataHost?: HTMLDivElement | null;
  onOpenData?: () => void;
  onExecuteSource?: (
    nodeId: string,
    target: CanvasSourceDataSampleTarget,
    selectedFieldNames?: readonly string[]
  ) => void;
  sourceOutputFieldsByRelationId?: ReadonlyMap<string, readonly string[]>;
  inputRevision?: string;
  unavailableRelationIds?: ReadonlySet<string>;
}>;

export const CanvasOperationPreviewContext = createContext<
  | (CanvasOperationPreviewPorts &
      Readonly<{
        nodeId: string;
        semanticDigest: string | null;
        outputPlanRelationIds: ReadonlySet<string>;
        canEditModel: boolean;
        unapplied: boolean;
        execute: (relationId: string, label: string) => void;
      }>)
  | null
>(null);

export function CanvasOperationPreviewProvider({
  ports: transport,
  scope,
  children,
  ...state
}: Readonly<{
  ports?: CanvasOperationPreviewPorts;
  scope?: Pick<
    CanvasOperationPreviewPorts,
    'sourceOutputFieldsByRelationId' | 'inputRevision' | 'unavailableRelationIds'
  >;
  nodeId: string;
  semanticDigest: string | null;
  outputPlanRelationIds: ReadonlySet<string>;
  canEditModel: boolean;
  unapplied: boolean;
  children: ReactNode;
}>): JSX.Element {
  const ports = transport == null ? undefined : { ...transport, ...scope };
  const [requested, setRequested] = useState<{
    nodeId: string;
    relationId: string;
    label: string;
  } | null>(null);
  const language = useApplicationLanguageStore((value) => value.language);
  const copy = resolveCanvasSemanticEditorCopy(language);
  const previewCopy = {
    ...copy,
    previewEmpty: copy.operationPreviewEmpty,
    failed: copy.operationPreviewFailed,
  };
  const requestedOutsideOutputPlan =
    requested != null && !state.outputPlanRelationIds.has(requested.relationId);
  const data = useCanvasModelDataQuery({
    ...state,
    canvasId: ports?.canvasId ?? '',
    query: ports?.query,
    preparePreview: ports?.preparePreview,
    relationId: requested?.relationId,
    copy: previewCopy,
    blocked:
      state.unapplied ||
      requestedOutsideOutputPlan ||
      (requested != null && ports?.unavailableRelationIds?.has(requested.relationId) === true),
    inputRevision: ports?.inputRevision,
  });
  const { reset } = data;
  useEffect(() => {
    if (!requestedOutsideOutputPlan) return;
    setRequested(null);
    reset();
  }, [requestedOutsideOutputPlan, reset]);
  useEffect(() => {
    setRequested(null);
    reset();
  }, [
    ports?.canvasId,
    state.nodeId,
    state.semanticDigest,
    state.unapplied,
    ports?.inputRevision,
    reset,
  ]);
  const execute = (relationId: string, label: string): void => {
    if (
      !data.available ||
      !state.outputPlanRelationIds.has(relationId) ||
      ports?.unavailableRelationIds?.has(relationId)
    )
      return;
    ports?.onOpenData?.();
    setRequested({
      nodeId: state.nodeId,
      relationId,
      label,
    });
    void data.load(relationId);
  };
  return (
    <CanvasOperationPreviewContext.Provider
      value={ports == null ? null : { ...ports, ...state, execute }}
    >
      {children}
      {requested?.nodeId === state.nodeId && ports?.dataHost != null
        ? createPortal(
            <aside
              data-slot="canvas-operation-data-preview"
              data-relation-id={requested.relationId}
              className="canvas-operation-data-preview"
            >
              <CanvasModelDataPanel
                data={{
                  ...data,
                  stale:
                    data.sample != null && data.sample.semanticPlanSha256 !== state.semanticDigest,
                }}
                actions={{ load: data.load }}
                nodeName={requested.label}
                compact
                copy={previewCopy}
                disabledReason={state.unapplied ? copy.operationPreviewUnapplied : undefined}
              />
            </aside>,
            ports.dataHost
          )
        : null}
    </CanvasOperationPreviewContext.Provider>
  );
}
