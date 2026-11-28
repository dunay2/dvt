/**
 * Owned concern: expose the existing Model input catalogue and guarded occurrence actions.
 * @baseline GH-3747: Elements generates instances rather than listing placed cards.
 * @decision Keep one catalogue under Elements and respect pending forms.
 * @consequence One occurrence rail owns identity and admission without duplicate controls.
 * @version 1.0.0
 */
import { useState, type ReactNode } from 'react';
import type { useCanvasRelationalTreeWorkbenchModel } from '../useCanvasRelationalTreeWorkbenchModel';
import type { CanvasRelationalTreeWorkbenchCopy } from '../canvasRelationalTreeWorkbench.types';
import { CanvasRelationalTreeSourceCatalogue } from '../CanvasRelationalTreeSourceCatalogue';
import { CanvasExplorer } from './CanvasExplorer';
import { useCanvasModelBrowserPresentation } from '../CanvasModelBrowser';
import { CanvasExplorerSection } from './CanvasExplorerCatalog.templates';
import { CanvasWarehouseConnections } from './CanvasWarehouseConnections';
import { useApplicationLanguageStore } from '../../../stores/applicationLanguageStore';
import { resolveCanvasExplorerCopy } from './canvasExplorerCopy';
import styles from './CanvasExplorer.module.css';

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
  const [inputsOpen, setInputsOpen] = useState(true);
  const language = useApplicationLanguageStore((state) => state.language);
  const explorerCopy = resolveCanvasExplorerCopy(language);
  const editable = model.authoringAvailable && !pending;
  const catalogue = (
    <CanvasRelationalTreeSourceCatalogue
      items={model.catalogue}
      copy={copy}
      draggable={editable}
      onSelect={(item) => {
        if (!pending) model.selectCatalogueItem(item);
      }}
      occurrences={editable ? model.session.occurrences : undefined}
    />
  );
  return (
    <CanvasExplorer
      heading={{ label: explorerCopy.explorerTitle }}
      elements={
        <div className={styles.listPanel}>
          {browser == null ? null : (
            <CanvasWarehouseConnections onManage={browser.onManageConnections} />
          )}
          <CanvasExplorerSection
            title={explorerCopy.modelInputs}
            slot="canvas-model-inputs"
            open={inputsOpen}
            onOpenChange={setInputsOpen}
          >
            {catalogue}
          </CanvasExplorerSection>
        </div>
      }
    >
      {children}
    </CanvasExplorer>
  );
}
