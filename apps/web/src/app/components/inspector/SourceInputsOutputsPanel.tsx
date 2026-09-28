/** Compose the Source relationship template from its interaction model. */
import { GripVertical } from 'lucide-react';
import type { ReactNode } from 'react';
import { Badge } from '../ui/badge';
import { cn } from '../ui/utils';
import {
  inspectorRelationshipClasses as styles,
  inspectorVisualClasses,
} from './inspectorVisualTokens';
import { SourceRelationshipDetail } from './SourceRelationshipDetail';
import {
  useSourceRelationships,
  type SourceRelationshipsArgs,
  type SourceRelationshipRowModel,
} from './useSourceRelationships';

function RelationshipRow({ row }: Readonly<{ row: SourceRelationshipRowModel }>): JSX.Element {
  const { relationship, selected, dropPlacement, control } = row;
  return (
    <button
      {...control}
      data-slot="source-relationship-row"
      data-relationship-id={relationship.id}
      data-drop-placement={dropPlacement}
      className={cn(styles.row, selected ? styles.selected : styles.unselected)}
    >
      {dropPlacement == null ? null : (
        <span
          data-slot="source-relationship-drop-indicator"
          aria-hidden="true"
          className={cn(styles.drop, styles.placement[dropPlacement])}
        />
      )}
      {control.draggable ? (
        <GripVertical
          data-slot="source-relationship-drag-handle"
          aria-hidden="true"
          className={styles.handle}
        />
      ) : null}
      <span aria-hidden="true" className={styles.direction}>
        {relationship.direction === 'input' ? '←' : '→'}
      </span>
      <span className={styles.name}>{relationship.relatedNodeName}</span>
      <Badge variant="secondary" className={styles.badge}>
        {relationship.relation}
      </Badge>
    </button>
  );
}

export function SourceInputsOutputsPanel({
  beforeBody,
  afterBody,
  ...args
}: SourceRelationshipsArgs &
  Readonly<{ beforeBody?: ReactNode; afterBody?: ReactNode }>): JSX.Element {
  const model = useSourceRelationships(args);
  const { copy } = model;
  return (
    <div data-slot="canvas-source-inputs-outputs" className={styles.root}>
      {beforeBody}
      <div className={styles.layout}>
        <section className={styles.master}>
          <div className={styles.header}>
            <h3 className={styles.title}>{copy.canvasConnections}</h3>
            <span className={styles.count}>
              {model.count} {copy.total}
            </span>
          </div>
          {model.canReorder ? (
            <p id={model.reorderHintId} className={styles.accessible}>
              {copy.reorderHint}
            </p>
          ) : null}
          <div
            role="listbox"
            aria-label={copy.listLabel}
            aria-describedby={model.canReorder ? model.reorderHintId : undefined}
            className={styles.groups}
          >
            {model.groups.map((group) => (
              <div
                key={group.id}
                role="group"
                aria-label={`${group.label} ${group.rows.length}`}
                className={styles.group}
              >
                <h4 className={styles.groupTitle}>
                  {group.label} {group.rows.length}
                </h4>
                {group.rows.length === 0 ? (
                  <p className={inspectorVisualClasses.inspectorSubtle}>{group.empty}</p>
                ) : (
                  <div className={styles.rows}>
                    {group.rows.map((row) => (
                      <RelationshipRow key={row.relationship.id} row={row} />
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
          <p className={styles.accessible} role="status" aria-live="polite">
            {model.reorderStatus}
          </p>
        </section>
        <SourceRelationshipDetail nodeName={args.node.name} selected={model.selected} copy={copy} />
      </div>
      {afterBody}
    </div>
  );
}
