/**
 * Owned concern: expose the existing Model input catalogue and guarded occurrence actions.
 * @baseline GH-3747: Elements generates instances rather than listing placed cards.
 * @decision Keep one catalogue under Elements and respect pending forms.
 * @consequence One occurrence rail owns identity and admission without duplicate controls.
 * @version 1.0.0
 */
import type { ReactNode } from 'react';
import type { useCanvasRelationalTreeWorkbenchModel } from '../useCanvasRelationalTreeWorkbenchModel';
import type { CanvasRelationalTreeWorkbenchCopy } from '../canvasRelationalTreeWorkbench.types';
import { CanvasRelationalTreeSourceCatalogue } from '../CanvasRelationalTreeSourceCatalogue';
import { CanvasExplorer } from './CanvasExplorer';
import { useCanvasModelBrowserPresentation } from '../CanvasModelBrowser';
import { CanvasModelInputsPalette } from './CanvasModelInputsPalette';
import { useApplicationLanguageStore } from '../../../stores/applicationLanguageStore';
import { resolveCanvasExplorerCopy } from './canvasExplorerCopy';

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
  const browser = useCanvasModelBrowserPresentation();
  const language = useApplicationLanguageStore((state) => state.language);
  const explorerCopy = resolveCanvasExplorerCopy(language);
  const composition = pending ? undefined : model.modelComposition;
  const catalogue = (
    <CanvasRelationalTreeSourceCatalogue
      items={model.catalogue}
      copy={copy}
      draggable={model.authoringAvailable && !pending}
      onSelect={(item) => {
        if (!pending) model.selectCatalogueItem(item);
      }}
      occurrences={model.authoringAvailable && !pending ? model.session.occurrences : undefined}
    />
  );
  return (
    <CanvasExplorer
      heading={
        browser == null
          ? undefined
          : { label: explorerCopy.explorerTitle, contextLabel: explorerCopy.project }
      }
      elements={
        browser == null
          ? catalogue
          : browser.catalog(
              composition,
              <CanvasModelInputsPalette>{catalogue}</CanvasModelInputsPalette>
            )
      }
    >
      {children}
    </CanvasExplorer>
  );
}
