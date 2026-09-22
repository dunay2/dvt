/** Owned concern: bind the selected operation panel to the existing protected data query. */
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import type { ICanvasTransformDataSampleQueryPort } from '../../ports/canvasDataSample';
import { useApplicationLanguageStore } from '../../stores/applicationLanguageStore';
import { CanvasModelDataView, type CanvasModelPreviewPreparation } from './CanvasModelDataView';
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
    semanticDigest: string | null;
    sequence: number;
  } | null>(null);
  useEffect(() => {
    setRequested(null);
  }, [state.nodeId, state.semanticDigest, state.unapplied]);
  const execute = (relationId: string, label: string): void => {
    if (state.unapplied || ports?.query == null || state.semanticDigest == null) return;
    ports.onOpenData?.();
    setRequested((previous) => ({
      nodeId: state.nodeId,
      relationId,
      label,
      semanticDigest: state.semanticDigest,
      sequence: (previous?.sequence ?? 0) + 1,
    }));
  };
  return (
    <CanvasOperationPreviewContext.Provider
      value={ports == null ? null : { ...ports, ...state, execute }}
    >
      {children}
      {requested?.nodeId === state.nodeId && ports?.dataHost != null
        ? createPortal(
            <CanvasOperationDataPreview
              relationId={requested.relationId}
              label={requested.label}
              executionRequest={
                requested.semanticDigest === state.semanticDigest ? requested.sequence : undefined
              }
            />,
            ports.dataHost
          )
        : null}
    </CanvasOperationPreviewContext.Provider>
  );
}

export function CanvasOperationDataPreview({
  relationId,
  label,
  executionRequest,
}: Readonly<{
  relationId: string;
  label: string;
  executionRequest?: number;
}>): JSX.Element | null {
  const context = useContext(CanvasOperationPreviewContext);
  const language = useApplicationLanguageStore((state) => state.language);
  const copy = resolveCanvasSemanticEditorCopy(language);
  if (context == null) return null;
  return (
    <aside
      data-slot="canvas-operation-data-preview"
      data-relation-id={relationId}
      className="h-full min-h-0 min-w-0 overflow-hidden"
    >
      <CanvasModelDataView
        key={`${relationId}:${context.semanticDigest}`}
        {...context}
        relationId={relationId}
        executionRequest={executionRequest}
        compact
        nodeName={label}
        disabledReason={context.unapplied ? copy.operationPreviewUnapplied : undefined}
        copy={{
          ...copy,
          previewEmpty: copy.operationPreviewEmpty,
          failed: copy.operationPreviewFailed,
        }}
      />
    </aside>
  );
}
