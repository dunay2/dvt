/** Prepare workspace tab identity, localized copy and navigation callbacks. */
import { useApplicationLanguageStore } from '../../stores/applicationLanguageStore';
import { CanvasWorkspaceModelTabsTemplate } from './CanvasWorkspaceModelTabs.templates';
import { resolveCanvasSemanticEditorCopy } from './canvasSemanticEditorCopy';
import type {
  CanvasModelWorkspaceTabContribution,
  CanvasWorkspaceMenuContribution,
} from './canvasWorkspaceMenuContributionStore';
import { canvasWorkspaceTabs } from './canvasWorkspaceTabs';
import { resolveCodeViewCopy } from '../code/codeViewCopy';
import { resolveCanvasViewCopy } from './canvasCopyCatalog';

export function CanvasWorkspaceModelTabs({
  canvasTitle,
  tab,
  codeTab,
}: Readonly<{
  canvasTitle: string;
  tab?: CanvasModelWorkspaceTabContribution;
  codeTab?: CanvasWorkspaceMenuContribution['codeTab'];
}>): JSX.Element {
  const language = useApplicationLanguageStore((state) => state.language);
  const copy = resolveCanvasSemanticEditorCopy(language);
  const codeTitle = resolveCodeViewCopy(language).title;
  const tabs = [
    {
      key: 'canvas',
      ...canvasWorkspaceTabs.canvas,
      label: canvasTitle,
      select: () => {
        codeTab?.onCanvas();
        tab?.onCanvas();
      },
    },
    ...(codeTab == null
      ? []
      : [
          {
            key: 'code',
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
    ...(tab == null
      ? []
      : [
          {
            key: 'model',
            ...canvasWorkspaceTabs.model,
            label: tab.label,
            close: { label: copy.closeEditor, action: () => tab.onClose() },
            select: () => {
              codeTab?.onCanvas();
              tab.onSelect();
            },
          },
        ]),
  ];
  return (
    <CanvasWorkspaceModelTabsTemplate
      tabs={tabs}
      activeKey={codeTab?.active === true ? 'code' : tab?.active === true ? 'model' : 'canvas'}
      copy={copy}
      onSelect={(key) => tabs.find((item) => item.key === key)?.select?.()}
    />
  );
}
