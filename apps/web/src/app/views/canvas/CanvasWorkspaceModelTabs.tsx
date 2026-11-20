/** Prepare workspace tab identity, localized copy and navigation callbacks. */
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
  return (
    <CanvasWorkspaceModelTabsTemplate
      tabs={tabs}
      activeKey={
        codeTab?.active === true ? 'code' : tab?.active === true ? `model:${tab.nodeId}` : 'canvas'
      }
      copy={copy}
      onSelect={(key) => tabs.find((item) => item.key === key)?.select?.()}
    />
  );
}
