/**
 * Owned concern: Arbitrate scoped catalogue gestures on the Model Canvas.
 * Reason to change: Drop event ownership and presentation feedback change.
 * @baseline ADR-0064 / ADR-0069: canonical semantics and focused application boundaries.
 * @decision Consume the owned MIME once and delegate mutation to the existing Model command.
 * @consequence Foreign scopes and blocked authoring create no Model or navigation side effect.
 * @version 1.0.0
 */
import { useRef, useState, type ReactNode } from 'react';
import {
  readCanvasCatalogNodeDragReference,
  CANVAS_CATALOG_NODE_DRAG_MIME_TYPE,
} from './canvasNodeDropPayload';
import { useCanvasModelBrowserPresentation } from './CanvasModelBrowser';
import { resolveCanvasViewCopy } from './copy';
import { useApplicationLanguageStore } from '../../stores/applicationLanguageStore';
import styles from './CanvasRelationalTreeWorkbench.module.css';

export function CanvasModelCompositionDropSurface({
  enabled,
  modelName,
  onCopy,
  children,
}: Readonly<{
  enabled: boolean;
  modelName: string;
  onCopy: (id: string) => boolean;
  children: ReactNode;
}>) {
  const browser = useCanvasModelBrowserPresentation();
  const copy = resolveCanvasViewCopy(useApplicationLanguageStore((state) => state.language));
  const [hover, setHover] = useState(false);
  const [failed, setFailed] = useState(false);
  const depth = useRef(0);
  return (
    <div
      className={styles.compositionSurface}
      data-slot="canvas-model-composition-target"
      onDragEnterCapture={(event) => {
        if (!event.dataTransfer.types.includes(CANVAS_CATALOG_NODE_DRAG_MIME_TYPE)) return;
        depth.current += 1;
        setHover(true);
        setFailed(false);
      }}
      onDragLeaveCapture={() => {
        depth.current = Math.max(0, depth.current - 1);
        if (depth.current === 0) setHover(false);
      }}
      onDragOverCapture={(event) => {
        if (!event.dataTransfer.types.includes(CANVAS_CATALOG_NODE_DRAG_MIME_TYPE)) return;
        event.preventDefault();
        event.stopPropagation();
        event.dataTransfer.dropEffect = enabled ? 'copy' : 'none';
      }}
      onDropCapture={(event) => {
        if (!event.dataTransfer.types.includes(CANVAS_CATALOG_NODE_DRAG_MIME_TYPE)) return;
        event.preventDefault();
        event.stopPropagation();
        depth.current = 0;
        setHover(false);
        const reference = readCanvasCatalogNodeDragReference(event.dataTransfer);
        const scoped = reference != null && reference.scopeKey === (browser?.scopeKey ?? undefined);
        setFailed(!enabled || !scoped || !onCopy(reference!.id));
      }}
    >
      {children}
      {hover || failed ? (
        <div className={styles.compositionHint} role={failed ? 'alert' : 'status'}>
          {failed || !enabled ? (
            copy.relationalModelCopyUnavailableMessage
          ) : (
            <>
              {copy.relationalModelCopyDropLabel}: <strong>{modelName}</strong>
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}
