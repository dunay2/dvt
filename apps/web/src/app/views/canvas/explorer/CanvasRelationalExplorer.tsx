/**
 * Owned concern: adapt semantic catalogue and active relation identities to the explorer.
 * @baseline GH-3610: list existing occurrences separately from the source catalogue.
 * @decision Retain existing selection ports and deny navigation while a form has pending edits.
 * @consequence Exploring cannot create an occurrence or discard an unsaved condition.
 * @version 1.0.0
 */
import { useRef, type ReactNode } from 'react';
import type { useCanvasRelationalTreeWorkbenchModel } from '../useCanvasRelationalTreeWorkbenchModel';
import type { CanvasRelationalTreeWorkbenchCopy } from '../canvasRelationalTreeWorkbench.types';
import { CanvasRelationalTreeSourceCatalogue } from '../CanvasRelationalTreeSourceCatalogue';
import { CanvasExplorer } from './CanvasExplorer';
import { CanvasExplorerList } from './CanvasExplorerList';
import { projectRelationalExplorerItems } from './canvasExplorerItems';

export function CanvasRelationalExplorer({
  model,
  copy,
  pending,
  children,
}: Readonly<{
  model: ReturnType<typeof useCanvasRelationalTreeWorkbenchModel>;
  copy: CanvasRelationalTreeWorkbenchCopy;
  pending: boolean;
  children: ReactNode;
}>): JSX.Element {
  const rootRef = useRef<HTMLDivElement>(null);
  const draft = model.authoringAvailable && (model.session.active || model.projection == null);
  const items = projectRelationalExplorerItems({
    draft,
    root: model.projection?.root ?? null,
    sources: model.session.occurrences.pending,
    operations: model.session.staged.operations,
    selectedId: model.session.staged.selectedId ?? model.selectedRelationId,
    copy,
  });
  const select = (id: string) => {
    if (pending) return;
    if (draft && model.session.staged.operations.some((operation) => operation.id === id))
      model.session.staged.select(id);
    else model.selectRelation(id);
    const cards = rootRef.current?.querySelectorAll<HTMLElement>('[data-relational-card-id]');
    Array.from(cards ?? [])
      .find((card) => card.dataset.relationalCardId === id)
      ?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  };
  return (
    <CanvasExplorer
      rootRef={rootRef}
      sources={
        <CanvasRelationalTreeSourceCatalogue
          items={model.catalogue}
          copy={copy}
          draggable={model.authoringAvailable}
          onSelect={model.selectCatalogueItem}
          occurrences={model.authoringAvailable ? model.session.occurrences : undefined}
        />
      }
      elements={<CanvasExplorerList items={items} onSelect={select} disabled={pending} />}
    >
      {children}
    </CanvasExplorer>
  );
}
