/** Prepare workspace tab identity, localized copy and navigation callbacks. */
import { useLayoutEffect, useRef, type DragEvent, type FocusEvent, type MouseEvent } from 'react';
import { useApplicationLanguageStore } from '../../stores/applicationLanguageStore';
import { CanvasWorkspaceModelTabsTemplate } from './CanvasWorkspaceModelTabs.templates';
import { resolveCanvasSemanticEditorCopy } from './canvasSemanticEditorCopy';
import type {
  CanvasModelWorkspaceTabContribution,
  CanvasModelTabListContribution,
  CanvasWorkspaceMenuContribution,
} from './canvasWorkspaceMenuContributionStore';
import { canvasModelWorkspaceTabIds, canvasWorkspaceTabs } from './canvasWorkspaceTabs';
import { resolveCodeViewCopy } from '../code/codeViewCopy';
import { resolveCanvasViewCopy } from './canvasCopyCatalog';
import { CANVAS_MODEL_COMPOSITION_DRAG_MIME_TYPE } from './canvasNodeDropPayload';

export function CanvasWorkspaceModelTabs({
  canvasTitle,
  tab,
  modelTabs,
  codeTab,
  onShowCanvas,
}: Readonly<{
  canvasTitle: string;
  tab?: CanvasModelWorkspaceTabContribution;
  modelTabs?: CanvasModelTabListContribution['tabs'];
  codeTab?: CanvasWorkspaceMenuContribution['codeTab'];
  onShowCanvas?: () => void;
}>): JSX.Element {
  const language = useApplicationLanguageStore((state) => state.language);
  const copy = resolveCanvasSemanticEditorCopy(language);
  const codeTitle = resolveCodeViewCopy(language).title;
  const models = modelTabs ?? (tab == null ? [] : [tab]);
  const tabs = [
    {
      key: 'canvas',
      kind: 'canvas' as const,
      ...canvasWorkspaceTabs.canvas,
      label: canvasTitle,
      select:
        onShowCanvas ??
        (() => {
          codeTab?.onCanvas();
          tab?.onCanvas();
        }),
    },
    ...(codeTab == null
      ? []
      : [
          {
            key: 'code',
            kind: 'code' as const,
            ...canvasWorkspaceTabs.code,
            label: codeTitle,
            select: codeTab.onSelect,
            close:
              codeTab.onClose == null
                ? undefined
                : {
                    label: `${resolveCanvasViewCopy(language).nodeWorkbenchCloseLabel}: ${codeTitle}`,
                    action: codeTab.onClose,
                  },
          },
        ]),
    ...models.map((item) => ({
      key: `model:${item.nodeId}`,
      kind: 'model' as const,
      ...canvasModelWorkspaceTabIds(item.nodeId),
      label: item.label,
      close: { label: `${copy.closeEditor}: ${item.label}`, action: () => item.onClose() },
      select: () => {
        codeTab?.onCanvas();
        item.onSelect();
      },
    })),
  ];
  const activeKey =
    codeTab?.active === true ? 'code' : tab?.active === true ? `model:${tab.nodeId}` : 'canvas';
  const stripRef = useRef<HTMLDivElement>(null);
  const pointerFocus = useRef(false);
  const selectTab = (key: string) => tabs.find((item) => item.key === key)?.select?.();
  const revealModelDropTarget = (event: DragEvent<HTMLButtonElement>, key: string): void => {
    if (activeKey !== 'canvas') return;
    if (!event.dataTransfer.types.includes(CANVAS_MODEL_COMPOSITION_DRAG_MIME_TYPE)) return;
    selectTab(key);
  };
  const focusTab = (event: FocusEvent<HTMLButtonElement>, key: string) => {
    if (pointerFocus.current) {
      event.preventDefault();
      return;
    }
    if (key !== 'code' && key === activeKey) selectTab(key);
  };
  const activatePointerTab = (event: MouseEvent<HTMLButtonElement>, key: string) => {
    if (event.button !== 0 || event.ctrlKey) return;
    event.preventDefault();
    pointerFocus.current = true;
    try {
      event.currentTarget.focus();
    } finally {
      pointerFocus.current = false;
    }
    if (key !== 'code' || key !== activeKey) selectTab(key);
  };
  useLayoutEffect(() => {
    const strip = stripRef.current;
    if (strip == null) return;
    const revealSelected = () => {
      const selected = strip.querySelector('[role="tab"][aria-selected="true"]');
      if (selected == null) return;
      const frame = strip.getBoundingClientRect();
      const selectedFrame = selected.getBoundingClientRect();
      const offset =
        selectedFrame.left < frame.left
          ? selectedFrame.left - frame.left
          : Math.max(0, selectedFrame.right - frame.right);
      if (offset !== 0) strip.scrollLeft += offset;
    };
    revealSelected();
    const observer =
      typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(revealSelected);
    observer?.observe(strip);
    return () => observer?.disconnect();
  }, [activeKey, tabs.length]);
  return (
    <CanvasWorkspaceModelTabsTemplate
      tabs={tabs}
      activeKey={activeKey}
      copy={copy}
      stripRef={stripRef}
      onSelect={selectTab}
      onTabFocus={focusTab}
      onTabPointerDown={activatePointerTab}
      onModelDragOver={revealModelDropTarget}
    />
  );
}
