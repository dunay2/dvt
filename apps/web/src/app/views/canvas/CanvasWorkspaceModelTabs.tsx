/** Prepare workspace tab identity, localized copy and navigation callbacks. */
import { useApplicationLanguageStore } from '../../stores/applicationLanguageStore';
import { CanvasWorkspaceModelTabsTemplate } from './CanvasWorkspaceModelTabs.templates';
import { resolveCanvasSemanticEditorCopy } from './canvasSemanticEditorCopy';
import type { CanvasModelWorkspaceTabContribution } from './canvasWorkspaceMenuContributionStore';
import { canvasWorkspaceTabs } from './canvasWorkspaceTabs';

export function CanvasWorkspaceModelTabs({
  canvasTitle,
  tab,
}: Readonly<{
  canvasTitle: string;
  tab?: CanvasModelWorkspaceTabContribution;
}>): JSX.Element {
  const copy = resolveCanvasSemanticEditorCopy(
    useApplicationLanguageStore((state) => state.language)
  );
  const tabs = [
    {
      key: 'canvas',
      ...canvasWorkspaceTabs.canvas,
      label: canvasTitle,
      select: tab?.onCanvas,
    },
    ...(tab == null
      ? []
      : [
          {
            key: 'model',
            ...canvasWorkspaceTabs.model,
            label: tab.label,
            select: tab.onSelect,
          },
        ]),
  ];
  return (
    <CanvasWorkspaceModelTabsTemplate
      tabs={tabs}
      activeKey={tab?.active === true ? 'model' : 'canvas'}
      copy={copy}
      onSelect={(key) => tabs.find((item) => item.key === key)?.select?.()}
      onClose={tab == null ? undefined : () => tab.onClose()}
    />
  );
}
