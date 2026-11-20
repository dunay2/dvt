/** Bind Source output rows to the existing Inspector layout order. */
import { useId, useLayoutEffect, useMemo, useRef, useState, type ComponentProps } from 'react';
import { resolveCopyLanguage } from '../../copyLanguage';
import { useApplicationLanguageStore } from '../../stores/applicationLanguageStore';
import type { CanonicalNode } from '../../types/canonical';
import type { NodePropertySection } from './nodePropertiesContracts';
import { readSourceRelationships, type SourceRelationship } from './nodePropertyTopologyRows';
import { sourceRelationshipsCopyEn } from './sourceRelationshipsCopy.en';
import { sourceRelationshipsCopyEs } from './sourceRelationshipsCopy.es';
import { useCanvasInspectorListOrder } from './useCanvasInspectorListOrder';
import { useInspectorListReorder } from './useInspectorListReorder';

const copyByLanguage = { en: sourceRelationshipsCopyEn, es: sourceRelationshipsCopyEs };

export type SourceRelationshipsArgs = Readonly<{
  node: Pick<CanonicalNode, 'id'>;
  section: NodePropertySection;
  canReorder?: boolean;
  workspaceLayoutKey?: string | null;
}>;

export type SourceRelationshipRowModel = Readonly<{
  relationship: SourceRelationship;
  dropPlacement?: 'before' | 'after';
  control: ComponentProps<'li'> | null;
}>;

export function useSourceRelationships({
  node,
  section,
  canReorder = false,
  workspaceLayoutKey = null,
}: SourceRelationshipsArgs) {
  const language = useApplicationLanguageStore((state) => state.language);
  const copy = copyByLanguage[resolveCopyLanguage(language)];
  const relationships = useMemo(
    () => readSourceRelationships(section.tableRows),
    [section.tableRows]
  );
  const byId = useMemo(
    () => new Map(relationships.map((relationship) => [relationship.id, relationship])),
    [relationships]
  );
  const canonicalIds = useMemo(() => [...byId.keys()], [byId]);
  const outputOrder = useCanvasInspectorListOrder({
    workspaceLayoutKey,
    nodeId: node.id,
    listId: 'outputs',
    canonicalIds,
  });
  const rowRefs = useRef(new Map<string, HTMLLIElement>());
  const [recentMove, setRecentMove] = useState<{ id: string } | null>(null);
  const reorderHintId = useId();
  useLayoutEffect(() => {
    if (recentMove != null) rowRefs.current.get(recentMove.id)?.focus();
  }, [recentMove]);

  const outputReorder = useInspectorListReorder({
    orderedIds: outputOrder.orderedIds,
    visibleIds: outputOrder.orderedIds,
    enabled: canReorder && outputOrder.canPersist && canonicalIds.length > 1,
    onMove: outputOrder.move,
    onMoved: (id) => setRecentMove({ id }),
  });
  const moved = recentMove == null ? undefined : byId.get(recentMove.id);

  return {
    reorderHint: copy.reorderHint,
    reorderHintId,
    reorderStatus: moved == null ? '' : copy.reordered(moved.relatedNodeName),
    canReorder: outputReorder.canReorder,
    rows: outputOrder.orderedIds.flatMap((id): SourceRelationshipRowModel[] => {
      const relationship = byId.get(id);
      if (relationship == null) return [];
      const control: SourceRelationshipRowModel['control'] = outputReorder.canReorder
        ? {
            ref: (element) => {
              if (element == null) rowRefs.current.delete(id);
              else rowRefs.current.set(id, element);
            },
            'aria-describedby': reorderHintId,
            'aria-keyshortcuts': 'Alt+ArrowUp Alt+ArrowDown',
            tabIndex: 0,
            draggable: true,
            onKeyDown: (event) => {
              outputReorder.moveWithKeyboard(id, event);
            },
            onDragStart: (event) => outputReorder.startDrag(id, event),
            onDragEnd: outputReorder.endDrag,
            onDragOver: (event) => outputReorder.dragOver(id, event),
            onDragLeave: outputReorder.dragLeave,
            onDrop: (event) => outputReorder.drop(id, event),
          }
        : null;
      return [{ relationship, control, dropPlacement: outputReorder.dropPlacement(id) }];
    }),
  };
}
