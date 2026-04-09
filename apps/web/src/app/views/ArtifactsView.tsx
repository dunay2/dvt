import { FileText, GitBranch } from 'lucide-react';

import { ViewHeader } from '../components/domain';
import {
  RouteWorkbenchFrame,
  routeWorkbenchHeaderBandClassName,
  routeWorkbenchPanelClassName,
} from '../components/workbench/RouteWorkbenchFrame';
import { Badge } from '../components/ui/badge';
import { cn } from '../components/ui/utils';
import { ArtifactPreviewTabs } from './artifacts/ArtifactPreviewTabs';
import { ArtifactsInfoCard } from './artifacts/ArtifactsInfoCard';
import { ArtifactsList } from './artifacts/ArtifactsList';
import { artifactsViewCopy } from './artifacts/copy';
import { ManifestImportPanel } from './artifacts/ManifestImportPanel';
import { useArtifactsViewModel } from './artifacts/useArtifactsViewModel';
import { useLocalManifestImport } from './artifacts/useLocalManifestImport';

export default function ArtifactsView() {
  const panelClassName = cn(routeWorkbenchPanelClassName, 'p-4');
  const tabTriggerClassName =
    'text-[var(--text-muted)] data-[state=active]:bg-[var(--surface-elevated)] data-[state=active]:text-[var(--text-strong)]';

  const manifestImport = useLocalManifestImport();
  const { artifacts, importedStats, previewDocuments } = useArtifactsViewModel(
    manifestImport.state
  );

  return (
    <RouteWorkbenchFrame
      header={
        <div className={routeWorkbenchHeaderBandClassName}>
          <ViewHeader
            className="border-0 bg-transparent px-0 py-0"
            title={artifactsViewCopy.title}
            icon={<FileText className="size-6 text-[var(--status-info)]" />}
            subtitle={artifactsViewCopy.subtitle}
            actions={
              <Badge variant="outline" className="text-xs">
                <GitBranch className="mr-1 size-3" />
                {artifactsViewCopy.focusedGitSha}
              </Badge>
            }
          />
        </div>
      }
      bodyContainerClassName="mx-auto max-w-5xl space-y-6"
    >
      <ManifestImportPanel
        state={manifestImport.state}
        fileInputRef={manifestImport.fileInputRef}
        onInputChange={manifestImport.handleInputChange}
        onDrop={manifestImport.handleDrop}
        onDragOver={manifestImport.handleDragOver}
        onOpenFilePicker={manifestImport.openFilePicker}
        onClear={manifestImport.clear}
        importedStats={importedStats}
      />
      <ArtifactsList artifacts={artifacts} panelClassName={panelClassName} />
      <ArtifactPreviewTabs
        previewDocuments={previewDocuments}
        panelClassName={panelClassName}
        tabTriggerClassName={tabTriggerClassName}
      />
      <ArtifactsInfoCard />
    </RouteWorkbenchFrame>
  );
}
