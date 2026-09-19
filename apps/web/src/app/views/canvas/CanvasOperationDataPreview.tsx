/** Owned concern: bind the selected operation panel to the existing protected data query. */
import { createContext, useContext, type ReactNode } from 'react';
import type { ICanvasTransformDataSampleQueryPort } from '../../ports/canvasDataSample';
import { useApplicationLanguageStore } from '../../stores/applicationLanguageStore';
import { CanvasModelDataView, type CanvasModelPreviewPreparation } from './CanvasModelDataView';
import { resolveCanvasSemanticEditorCopy } from './canvasSemanticEditorCopy';

export type CanvasOperationPreviewPorts = Readonly<{
  canvasId: string;
  query?: ICanvasTransformDataSampleQueryPort;
  preparePreview?: CanvasModelPreviewPreparation;
}>;

export const CanvasOperationPreviewContext = createContext<
  | (CanvasOperationPreviewPorts &
      Readonly<{
        nodeId: string;
        semanticDigest: string | null;
        canEditModel: boolean;
        unapplied: boolean;
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
  return (
    <CanvasOperationPreviewContext.Provider value={ports == null ? null : { ...ports, ...state }}>
      {children}
    </CanvasOperationPreviewContext.Provider>
  );
}

export function CanvasOperationDataPreview({
  relationId,
  label,
}: Readonly<{
  relationId: string;
  label: string;
}>): JSX.Element | null {
  const context = useContext(CanvasOperationPreviewContext);
  const language = useApplicationLanguageStore((state) => state.language);
  const copy = resolveCanvasSemanticEditorCopy(language);
  if (context == null) return null;
  return (
    <aside
      data-slot="canvas-operation-data-preview"
      data-relation-id={relationId}
      className="min-h-0 min-w-0 overflow-hidden rounded-lg border border-(--border-subtle)"
    >
      <CanvasModelDataView
        key={`${relationId}:${context.semanticDigest}:${context.unapplied}`}
        {...context}
        relationId={relationId}
        compact
        nodeName={`${copy.data} · ${label}`}
        disabledReason={context.unapplied ? copy.operationPreviewUnapplied : undefined}
        copy={{
          ...copy,
          previewHint: copy.operationPreviewHint,
          previewEmpty: copy.operationPreviewEmpty,
          failed: copy.operationPreviewFailed,
        }}
      />
    </aside>
  );
}
