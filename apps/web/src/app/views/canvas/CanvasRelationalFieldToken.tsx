/** Accessible compact token: adapts gestures, never mutates semantic structures. */
import { useContext, type ReactNode } from 'react';
import type { SemanticWorkbenchNodeData } from './semanticWorkbenchProjection';
import { CanvasRelationAnalysisContext } from './CanvasRelationAnalysisContext';
import { useCanvasRelationalFieldSelection } from './CanvasRelationalFieldSelectionProvider';
import {
  CANVAS_RELATIONAL_FIELD_DRAG_TYPE,
  readCanvasRelationalFieldDrag,
  writeCanvasRelationalFieldDrag,
} from './canvasRelationalTreeDrag';
import styles from './CanvasRelationalFieldToken.module.css';

export function CanvasRelationalFieldToken({
  id,
  data,
  relationId,
  title,
  children,
}: Readonly<{
  id: string;
  data: SemanticWorkbenchNodeData;
  relationId: string;
  title: string;
  children: ReactNode;
}>) {
  const analysis = useContext(CanvasRelationAnalysisContext);
  const actions = useCanvasRelationalFieldSelection();
  const reference =
    data.fieldReference == null || analysis?.document == null || analysis.error != null
      ? null
      : {
          ...data.fieldReference,
          rootId: analysis.session.rootId,
          revision: analysis.revision,
          selectedOutput: data.fieldSelection === 'output',
        };
  const interactive = reference != null && actions?.enabled === true && data.fieldSelection != null;
  return (
    <span
      data-slot="canvas-relational-expression-node"
      data-kind={data.semanticKind}
      data-unavailable={data.unavailable || undefined}
      data-semantic-node-id={id}
      data-field-id={reference?.fieldId}
      data-field-selection={data.fieldSelection}
      data-field-target={data.fieldTargetRelationId}
      className={styles.token}
      title={title}
      role={interactive ? 'button' : undefined}
      tabIndex={interactive ? 0 : undefined}
      aria-keyshortcuts={
        interactive ? (data.fieldSelection === 'output' ? 'Delete' : 'Enter') : undefined
      }
      draggable={reference != null}
      onDragStart={(event) => {
        event.stopPropagation();
        if (reference == null) {
          event.preventDefault();
          return;
        }
        writeCanvasRelationalFieldDrag(event.dataTransfer, reference);
        actions?.begin(reference);
      }}
      onDragEnd={() => actions?.end()}
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          actions?.end();
          return;
        }
        if (!interactive) return;
        if (data.fieldSelection === 'output' && event.key === 'Delete') {
          event.preventDefault();
          event.stopPropagation();
          actions.remove(reference);
        } else if (data.fieldSelection === 'input' && event.key === 'Enter') {
          event.preventDefault();
          event.stopPropagation();
          actions.add(reference, relationId);
        }
      }}
      onDragOver={(event) => {
        if (!event.dataTransfer.types.includes(CANVAS_RELATIONAL_FIELD_DRAG_TYPE)) return;
        event.stopPropagation();
        if (actions?.enabled && data.fieldTargetRelationId != null) {
          event.preventDefault();
          event.dataTransfer.dropEffect = 'copy';
        }
      }}
      onDrop={(event) => {
        if (!event.dataTransfer.types.includes(CANVAS_RELATIONAL_FIELD_DRAG_TYPE)) return;
        event.preventDefault();
        event.stopPropagation();
        const source = readCanvasRelationalFieldDrag(event.dataTransfer);
        actions?.end();
        if (actions?.enabled && data.fieldTargetRelationId != null && source != null)
          actions.add(source, data.fieldTargetRelationId);
      }}
    >
      {children}
    </span>
  );
}
