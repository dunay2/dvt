/**
 * Owned concern: Arbitrate scoped catalogue gestures on the Model Canvas.
 * Reason to change: Drop event ownership and presentation feedback change.
 * @baseline ADR-0064 / ADR-0069: canonical semantics and focused application boundaries.
 * @decision Consume the owned MIME once and delegate mutation to the existing Model command.
 * @consequence Foreign scopes and blocked authoring create no Model or navigation side effect.
 * @version 1.0.0
 */
import { useRef, useState, type ReactNode, type DragEvent } from 'react';
import {
  readCanvasCatalogNodeDragReference,
  CANVAS_CATALOG_NODE_DRAG_MIME_TYPE,
} from './canvasNodeDropPayload';
import { useCanvasModelBrowserPresentation } from './CanvasModelBrowser';
import { resolveCanvasViewCopy } from './copy';
import { useApplicationLanguageStore } from '../../stores/applicationLanguageStore';
import styles from './CanvasRelationalTreeWorkbench.module.css';

type CatalogDrag = DragEvent<HTMLDivElement>;

function consumeCatalogGesture(event: CatalogDrag): boolean {
  if (!event.dataTransfer.types.includes(CANVAS_CATALOG_NODE_DRAG_MIME_TYPE)) return false;
  event.preventDefault();
  event.stopPropagation();
  return true;
}

function admitCatalogDrop(
  event: CatalogDrag,
  enabled: boolean,
  scopeKey: string | undefined,
  onCopy: (id: string) => boolean
): boolean {
  if (!enabled) return false;
  const reference = readCanvasCatalogNodeDragReference(event.dataTransfer);
  if (reference == null || reference.scopeKey !== scopeKey) return false;
  return onCopy(reference.id);
}

function useCompositionHover() {
  const [hover, setHover] = useState(false);
  const [linked, setLinked] = useState(false);
  const depth = useRef(0);
  return {
    hover,
    linked,
    enter(event: CatalogDrag): void {
      if (!event.dataTransfer.types.includes(CANVAS_CATALOG_NODE_DRAG_MIME_TYPE)) return;
      depth.current += 1;
      setLinked(event.dataTransfer.effectAllowed === 'link');
      setHover(true);
    },
    leave(): void {
      depth.current = Math.max(0, depth.current - 1);
      if (depth.current === 0) setHover(false);
    },
    reset(): void {
      depth.current = 0;
      setHover(false);
    },
  };
}

function CompositionHint({
  failed,
  linked,
  modelName,
}: Readonly<{ failed: boolean; linked: boolean; modelName: string }>): JSX.Element {
  const copy = resolveCanvasViewCopy(useApplicationLanguageStore((state) => state.language));
  return (
    <div className={styles.compositionHint} role={failed ? 'alert' : 'status'}>
      {failed ? (
        copy.relationalModelCopyUnavailableMessage
      ) : (
        <>
          {linked ? copy.relationalModelReferenceDropLabel : copy.relationalModelCopyDropLabel}:{' '}
          <strong>{modelName}</strong>
        </>
      )}
    </div>
  );
}

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
}>): JSX.Element {
  const browser = useCanvasModelBrowserPresentation();
  const feedback = useCompositionHover();
  const [failed, setFailed] = useState(false);
  return (
    <div
      className={styles.compositionSurface}
      data-slot="canvas-model-composition-target"
      onDragEnterCapture={(event) => {
        feedback.enter(event);
        setFailed(false);
      }}
      onDragLeaveCapture={feedback.leave}
      onDragOverCapture={(event) => {
        if (!consumeCatalogGesture(event)) return;
        event.dataTransfer.dropEffect = enabled
          ? event.dataTransfer.effectAllowed === 'link'
            ? 'link'
            : 'copy'
          : 'none';
      }}
      onDropCapture={(event) => {
        if (!consumeCatalogGesture(event)) return;
        feedback.reset();
        setFailed(!admitCatalogDrop(event, enabled, browser?.scopeKey ?? undefined, onCopy));
      }}
    >
      {children}
      {feedback.hover || failed ? (
        <CompositionHint
          failed={failed || !enabled}
          linked={feedback.linked}
          modelName={modelName}
        />
      ) : null}
    </div>
  );
}
