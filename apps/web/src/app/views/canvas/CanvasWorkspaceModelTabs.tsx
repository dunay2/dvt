/** Prepare workspace tab identity, localized copy and navigation callbacks. */
import { useApplicationLanguageStore } from '../../stores/applicationLanguageStore';
import { CanvasWorkspaceModelTabsTemplate } from './CanvasWorkspaceModelTabs.templates';
import { resolveCanvasSemanticEditorCopy } from './canvasSemanticEditorCopy';
import type { CanvasModelWorkspaceTabContribution } from './canvasWorkspaceMenuContributionStore';
import { canvasWorkspaceTabs } from './canvasWorkspaceTabs';
import { resolveCodeViewCopy } from '../code/codeViewCopy';
import type { CanvasWorkspaceMenuContribution } from './canvasWorkspaceMenuContributionStore';

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
            label: resolveCodeViewCopy(language).title,
            select: codeTab.onSelect,
          },
        ]),
    ...(tab == null
      ? []
      : [
          {
            key: 'model',
            ...canvasWorkspaceTabs.model,
            label: tab.label,
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
      onClose={tab == null ? undefined : () => tab.onClose()}
    />
  );
}
