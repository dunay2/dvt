/** Selection and visual-only ordering, bound to the existing Inspector layout owner. */
import { useId, useMemo, useRef, useState, type ComponentProps, type KeyboardEvent } from 'react';
import { useApplicationLanguageStore } from '../../stores/applicationLanguageStore';
import type { CanonicalNode } from '../../types/canonical';
import type { NodePropertySection } from './nodePropertiesContracts';
import { readSourceRelationships, type SourceRelationship } from './nodePropertyTopologyRows';
import { sourceRelationshipsCopyEn } from './sourceRelationshipsCopy.en';
import { sourceRelationshipsCopyEs } from './sourceRelationshipsCopy.es';
import { useCanvasInspectorListOrder } from './useCanvasInspectorListOrder';
import { useInspectorListReorder } from './useInspectorListReorder';

export type SourceRelationshipsArgs = Readonly<{
  node: Pick<CanonicalNode, 'id' | 'name'>;
  section: NodePropertySection;
  canReorder?: boolean;
  workspaceLayoutKey?: string | null;
}>;

export type SourceRelationshipRowModel = Readonly<{
  relationship: SourceRelationship;
  selected: boolean;
  dropPlacement?: 'before' | 'after';
  control: ComponentProps<'button'>;
}>;

export function useSourceRelationships({
  node,
  section,
  canReorder = false,
  workspaceLayoutKey = null,
}: SourceRelationshipsArgs) {
  const language = useApplicationLanguageStore((state) => state.language);
  const copy = language.trim().toLowerCase().startsWith('es')
    ? sourceRelationshipsCopyEs
    : sourceRelationshipsCopyEn;
  const relationships = useMemo(
    () => readSourceRelationships(section.tableRows),
    [section.tableRows]
  );
  const inputs = relationships.filter((relationship) => relationship.direction === 'input');
  const canonicalOutputs = useMemo(
    () => relationships.filter((relationship) => relationship.direction === 'output'),
    [relationships]
  );
  const canonicalOutputIds = useMemo(
    () => canonicalOutputs.map(({ id }) => id),
    [canonicalOutputs]
  );
  const outputOrder = useCanvasInspectorListOrder({
    workspaceLayoutKey,
    nodeId: node.id,
    listId: 'outputs',
    canonicalIds: canonicalOutputIds,
  });
  const outputs = useMemo(() => {
    const byId = new Map(canonicalOutputs.map((relationship) => [relationship.id, relationship]));
    return outputOrder.orderedIds.flatMap((id) => {
      const relationship = byId.get(id);
      return relationship == null ? [] : [relationship];
    });
  }, [canonicalOutputs, outputOrder.orderedIds]);
  const orderedRelationships = [...inputs, ...outputs];
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [reorderStatus, setReorderStatus] = useState('');
  const reorderHintId = useId();
  const rowRefs = useRef(new Map<string, HTMLButtonElement>());
  const selectAndFocus = (id: string) => {
    setSelectedId(id);
    rowRefs.current.get(id)?.focus();
  };
  const outputReorder = useInspectorListReorder({
    orderedIds: outputOrder.orderedIds,
    visibleIds: outputs.map(({ id }) => id),
    enabled: canReorder && outputOrder.canPersist,
    onMove: outputOrder.move,
    onMoved: (id) => {
      selectAndFocus(id);
      setReorderStatus(copy.reordered + ': ' + id);
    },
  });
  const selected =
    orderedRelationships.find(({ id }) => id === selectedId) ?? orderedRelationships[0] ?? null;

  const onKeyDown = (
    event: KeyboardEvent<HTMLButtonElement>,
    relationship: SourceRelationship,
    index: number
  ) => {
    if (
      relationship.direction === 'output' &&
      outputReorder.moveWithKeyboard(relationship.id, event)
    )
      return;
    const targets: Record<string, number> = {
      ArrowDown: index + 1,
      ArrowUp: index - 1,
      Home: 0,
      End: orderedRelationships.length - 1,
    };
    const target = targets[event.key];
    if (target == null || target === index || target < 0 || target >= orderedRelationships.length)
      return;
    event.preventDefault();
    selectAndFocus(orderedRelationships[target]!.id);
  };
  const buildRow = (
    relationship: SourceRelationship,
    index: number
  ): SourceRelationshipRowModel => {
    const isSelected = selected?.id === relationship.id;
    const draggable = relationship.direction === 'output' && outputReorder.canReorder;
    return {
      relationship,
      selected: isSelected,
      dropPlacement: outputReorder.dropPlacement(relationship.id),
      control: {
        ref: (element) => {
          if (element == null) rowRefs.current.delete(relationship.id);
          else rowRefs.current.set(relationship.id, element);
        },
        type: 'button',
        role: 'option',
        'aria-selected': isSelected,
        tabIndex: isSelected ? 0 : -1,
        draggable,
        title: draggable ? copy.reorder + ': ' + relationship.relatedNodeName : undefined,
        onClick: () => setSelectedId(relationship.id),
        onKeyDown: (event) => onKeyDown(event, relationship, index),
        onDragStart: (event) => outputReorder.startDrag(relationship.id, event),
        onDragEnd: outputReorder.endDrag,
        onDragOver: (event) => outputReorder.dragOver(relationship.id, event),
        onDragLeave: outputReorder.dragLeave,
        onDrop: (event) => outputReorder.drop(relationship.id, event),
      },
    };
  };
  return {
    copy,
    selected,
    reorderHintId,
    reorderStatus,
    canReorder: outputReorder.canReorder,
    count: orderedRelationships.length,
    groups: [
      { id: 'inputs', label: copy.inputs, empty: copy.noInputs, rows: inputs.map(buildRow) },
      {
        id: 'outputs',
        label: copy.outputs,
        empty: copy.noOutputs,
        rows: outputs.map((relationship, index) => buildRow(relationship, inputs.length + index)),
      },
    ],
  };
}
