/** Accessible compact token: adapts gestures, never mutates semantic structures. */
import type { ReactNode } from 'react';
import { X } from 'lucide-react';
import type { SemanticWorkbenchNodeData } from './semanticWorkbenchProjection';
import styles from './CanvasRelationalFieldToken.module.css';
import { useApplicationLanguageStore } from '../../stores/applicationLanguageStore';
import { resolveCanvasSemanticEditorCopy } from './canvasSemanticEditorCopy';
import {
  useCanvasRelationalFieldToken,
  type StagedFieldScope,
} from './useCanvasRelationalFieldToken';

export function CanvasRelationalFieldToken({
  id,
  data,
  stagedFieldScope,
  relationId,
  title,
  children,
}: Readonly<{
  id: string;
  data: SemanticWorkbenchNodeData;
  stagedFieldScope?: StagedFieldScope;
  relationId: string;
  title: string;
  children: ReactNode;
}>) {
  const token = useCanvasRelationalFieldToken(data, relationId, stagedFieldScope);
  const copy = resolveCanvasSemanticEditorCopy(
    useApplicationLanguageStore((state) => state.language)
  );
  return (
    <>
      <span
        data-slot="canvas-relational-expression-node"
        data-kind={data.semanticKind}
        data-unavailable={data.unavailable || undefined}
        data-semantic-node-id={id}
        data-field-id={token.reference?.fieldId}
        data-field-selection={data.fieldSelection}
        data-field-target={data.fieldTargetRelationId}
        className={styles.token}
        title={title}
        role={token.interactive ? 'button' : undefined}
        tabIndex={token.interactive ? 0 : undefined}
        aria-keyshortcuts={token.keyboardShortcut}
        draggable={token.reference != null}
        onDragStart={token.onDragStart}
        onDragEnd={token.onDragEnd}
        onKeyDown={token.onKeyDown}
        onDragOver={token.onDragOver}
        onDrop={token.onDrop}
      >
        {children}
      </span>
      {token.showRemove ? (
        <button
          type="button"
          data-slot="canvas-relational-expression-remove"
          className={styles.remove}
          disabled={!token.interactive}
          aria-label={`${copy.removeOutputField}: ${title}`}
          title={copy.removeOutputField}
          onPointerDown={token.onRemovePointerDown}
          onClick={token.onRemoveClick}
        >
          <X aria-hidden="true" size={12} />
        </button>
      ) : null}
    </>
  );
}
