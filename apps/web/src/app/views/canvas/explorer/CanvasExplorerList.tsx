/** Owned concern: project catalogue search and disclosure, independent of placement commands. */
import { useEffect, useMemo, useRef, useState, type DragEvent, type ReactNode } from 'react';
import { useApplicationLanguageStore } from '../../../stores/applicationLanguageStore';
import { CanvasExplorerListTemplate } from './CanvasExplorerCatalog.templates';
import { resolveCanvasExplorerCopy } from './canvasExplorerCopy';
import type { CanvasExplorerItem } from './canvasExplorerItems';
import { CanvasExplorerConnections } from './CanvasExplorerConnections';
import styles from './CanvasExplorer.module.css';
import type { CanvasExplorerCatalogPresentation } from './CanvasExplorer.types';
import { useCanvasExplorerCatalogPresentation } from './useCanvasExplorerCatalogPresentation';
import { canvasExplorerSearchText, normalizeCanvasExplorerQuery } from './canvasExplorerSearch';

export function CanvasExplorerList({
  items,
  onSelect,
  disabled,
  onDragStart,
  onAddModel,
  onRemoveEmptyModel,
  onImport,
  connections,
  status,
  countKnown = true,
  pending = false,
  presentation,
}: Readonly<{
  items: readonly CanvasExplorerItem[];
  /** Observe completion/failure without interpreting the caller-owned admission result. */
  onSelect: (id: string) => unknown;
  disabled?: boolean;
  onDragStart?: (id: string, event: DragEvent<HTMLButtonElement>) => void;
  onAddModel?: (opener: HTMLButtonElement) => void;
  onRemoveEmptyModel?: (id: string) => void;
  onImport?: () => void;
  connections?: ReactNode;
  status?: ReactNode;
  countKnown?: boolean;
  pending?: boolean;
  presentation?: CanvasExplorerCatalogPresentation;
}>): JSX.Element {
  const localPresentation = useCanvasExplorerCatalogPresentation();
  const controls = presentation ?? localPresentation;
  const { query, open, expandedIds } = controls;
  const [inspectionFailed, setInspectionFailed] = useState(false);
  const inspectionAttempt = useRef(0);
  useEffect(
    () => () => {
      inspectionAttempt.current += 1;
    },
    []
  );
  const copy = resolveCanvasExplorerCopy(useApplicationLanguageStore((state) => state.language));
  const search = normalizeCanvasExplorerQuery(query);
  const searchIndex = useMemo(
    () =>
      items.map((item) => ({
        item,
        text: canvasExplorerSearchText(item, copy.source),
      })),
    [items, copy.source]
  );
  const matches = useMemo(() => {
    if (!search) return items;
    const result: CanvasExplorerItem[] = [];
    for (const { item, text } of searchIndex) {
      if (text.includes(search)) result.push(item);
    }
    return result;
  }, [items, search, searchIndex]);
  return (
    <CanvasExplorerListTemplate
      items={matches}
      hasModels={items.length > 0}
      open={open}
      onOpenChange={controls.onOpenChange}
      expandedIds={expandedIds}
      onToggleDetails={controls.onToggleDetails}
      query={query}
      onQuery={controls.onQuery}
      onSelect={(id) => {
        const attempt = ++inspectionAttempt.current;
        setInspectionFailed(false);
        const reportFailure = () => {
          if (inspectionAttempt.current === attempt) setInspectionFailed(true);
        };
        try {
          Promise.resolve(onSelect(id)).catch(reportFailure);
        } catch {
          reportFailure();
        }
      }}
      disabled={disabled}
      onDragStart={onDragStart}
      onAddModel={onAddModel}
      onRemoveEmptyModel={onRemoveEmptyModel}
      status={
        inspectionFailed ? (
          <>
            <p className={styles.empty} role="alert">
              {copy.inspectionFailed}
            </p>
            {status}
          </>
        ) : (
          status
        )
      }
      countKnown={countKnown}
      pending={pending}
      connections={
        connections ?? (
          <CanvasExplorerConnections state={{ status: 'unavailable' }} onManage={onImport} />
        )
      }
      copy={copy}
    />
  );
}
