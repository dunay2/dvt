/** Owned concern: bind the selected operation panel to the existing protected data query. */
import { createContext, useEffect, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import type { ICanvasTransformDataSampleQueryPort } from '../../ports/canvasDataSample';
import { useApplicationLanguageStore } from '../../stores/applicationLanguageStore';
import type { CanvasModelPreviewPreparation } from './CanvasModelDataView';
import { CanvasModelDataPanel } from './CanvasModelDataPanel';
import { useCanvasModelDataQuery } from './useCanvasModelDataQuery';
import { resolveCanvasSemanticEditorCopy } from './canvasSemanticEditorCopy';

export type CanvasOperationPreviewPorts = Readonly<{
  canvasId: string;
  query?: ICanvasTransformDataSampleQueryPort;
  preparePreview?: CanvasModelPreviewPreparation;
  dataHost?: HTMLDivElement | null;
  onOpenData?: () => void;
}>;

export const CanvasOperationPreviewContext = createContext<
  | (CanvasOperationPreviewPorts &
      Readonly<{
        nodeId: string;
        semanticDigest: string | null;
        canEditModel: boolean;
        unapplied: boolean;
        execute: (relationId: string, label: string) => void;
      }>)
  | null
>(null);

export function CanvasOperationPreviewProvider({
  ports,
  children,
  ...state
}: Readonly<{
  ports?: CanvasOperationPreviewPorts;
  nodeId: string;
  semanticDigest: string | null;
  canEditModel: boolean;
  unapplied: boolean;
  children: ReactNode;
}>): JSX.Element {
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
  const data = useCanvasModelDataQuery({
    ...state,
    canvasId: ports?.canvasId ?? '',
    query: ports?.query,
    preparePreview: ports?.preparePreview,
    relationId: requested?.relationId,
    copy: previewCopy,
    blocked: state.unapplied,
  });
  const { reset } = data;
  useEffect(() => {
    setRequested(null);
    reset();
  }, [ports?.canvasId, state.nodeId, state.semanticDigest, state.unapplied, reset]);
  const execute = (relationId: string, label: string): void => {
    if (!data.available) return;
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
              className="h-full min-h-0 min-w-0 overflow-hidden"
            >
              <CanvasModelDataPanel
                {...data}
                semanticDigest={state.semanticDigest}
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
