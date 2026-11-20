/** Render the Source's outgoing Canvas relationships. */
import { GripVertical } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '../ui/utils';
import { inspectorRelationshipClasses as styles } from './inspectorVisualTokens';
import {
  useSourceRelationships,
  type SourceRelationshipsArgs,
  type SourceRelationshipRowModel,
} from './useSourceRelationships';

function RelationshipRow({ row }: Readonly<{ row: SourceRelationshipRowModel }>): JSX.Element {
  const { relationship, dropPlacement, control } = row;
  return (
    <li
      {...control}
      data-slot="source-relationship-row"
      data-relationship-id={relationship.id}
      data-drop-placement={dropPlacement}
      className={cn(styles.row, control != null && styles.sortable)}
    >
      {dropPlacement == null ? null : (
        <span
          data-slot="source-relationship-drop-indicator"
          aria-hidden="true"
          className={cn(styles.drop, styles.placement[dropPlacement])}
        />
      )}
      {control == null ? null : (
        <GripVertical
          data-slot="source-relationship-drag-handle"
          aria-hidden="true"
          className={styles.handle}
        />
      )}
      <span className={styles.name}>{relationship.relatedNodeName}</span>
      <span className={styles.relation}>{relationship.relation}</span>
    </li>
  );
}

export function SourceInputsOutputsPanel({
  beforeBody,
  afterBody,
  ...args
}: SourceRelationshipsArgs &
  Readonly<{ beforeBody?: ReactNode; afterBody?: ReactNode }>): JSX.Element {
  const model = useSourceRelationships(args);
  return (
    <div data-slot="canvas-source-inputs-outputs" className={styles.root}>
      {beforeBody}
      {model.canReorder ? (
        <p id={model.reorderHintId} className={styles.accessible}>
          {model.reorderHint}
        </p>
      ) : null}
      {model.rows.length > 0 ? (
        <ul aria-label={args.section.label} className={styles.rows}>
          {model.rows.map((row) => (
            <RelationshipRow key={row.relationship.id} row={row} />
          ))}
        </ul>
      ) : (
        <p className={styles.empty}>{args.section.emptyState}</p>
      )}
      {model.canReorder ? (
        <p className={styles.accessible} role="status">
          {model.reorderStatus}
        </p>
      ) : null}
      {afterBody}
    </div>
  );
}
