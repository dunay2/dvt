import { FileText } from 'lucide-react';

import { usePublishedRouteBootstrap } from '../bootstrap/usePublishedRouteBootstrap';
import { ViewHeader } from '../components/domain';
import {
  RouteWorkbenchFrame,
  routeWorkbenchHeaderBandClassName,
  routeWorkbenchPanelClassName,
  routeWorkbenchTabTriggerClassName,
} from '../components/workbench/RouteWorkbenchFrame';
import { cn } from '../components/ui/utils';
import { ArtifactPreviewTabs } from './artifacts/ArtifactPreviewTabs';
import {
  ArtifactsEmptyStateView,
  ArtifactsErrorStateView,
  ArtifactsInvalidImportStateView,
  ArtifactsLoadingStateView,
} from './artifacts/ArtifactsStateViews';
import { ArtifactsInfoCard } from './artifacts/ArtifactsInfoCard';
import { ArtifactsList } from './artifacts/ArtifactsList';
import { getArtifactsWorkbenchState } from './artifacts/artifactsWorkbenchStateModel';
import { deriveArtifactsRouteBootstrapPresentation } from './artifacts/artifactsRouteBootstrap';
import { artifactsViewCopy } from './artifacts/copy';
import { ManifestImportPanel } from './artifacts/ManifestImportPanel';
import { useArtifactsViewModel } from './artifacts/useArtifactsViewModel';
import { useLocalManifestImport } from './artifacts/useLocalManifestImport';

export default function ArtifactsView() {
  const panelClassName = cn(routeWorkbenchPanelClassName, 'p-4');

  const manifestImport = useLocalManifestImport();
  const { artifacts, importedStats, previewDocuments, isLoading, errorMessage } =
    useArtifactsViewModel(manifestImport.state);
  const workbenchState = getArtifactsWorkbenchState({
    artifactCount: artifacts.length,
    importState: manifestImport.state,
    isLoadingWorkspaceArtifacts: isLoading,
    workspaceArtifactsErrorMessage: errorMessage,
  });
  usePublishedRouteBootstrap(
    deriveArtifactsRouteBootstrapPresentation(workbenchState)
  );

  function renderRouteBody() {
    switch (workbenchState.kind) {
      case 'loading':
        return (
          <>
            <ArtifactsLoadingStateView />
            <ArtifactsInfoCard />
          </>
        );
      case 'empty':
        return (
          <>
            <ArtifactsEmptyStateView />
            <ArtifactsInfoCard />
          </>
        );
      case 'error':
        return (
          <>
            <ArtifactsErrorStateView message={workbenchState.message} />
            <ArtifactsInfoCard />
          </>
        );
      case 'invalid-import':
        return (
          <>
            <ArtifactsInvalidImportStateView message={workbenchState.message} />
            <ArtifactsInfoCard />
          </>
        );
      case 'ready':
        return (
          <>
            <ArtifactsList artifacts={artifacts} panelClassName={panelClassName} />
            <ArtifactPreviewTabs
              previewDocuments={previewDocuments}
              panelClassName={panelClassName}
              tabTriggerClassName={routeWorkbenchTabTriggerClassName}
            />
            <ArtifactsInfoCard />
          </>
        );
    }
  }

  return (
    <RouteWorkbenchFrame
      header={
        <div className={routeWorkbenchHeaderBandClassName}>
          <ViewHeader
            className="border-0 bg-transparent px-0 py-0"
            title={artifactsViewCopy.title}
            icon={<FileText className="size-6 text-[var(--status-info)]" />}
            subtitle={artifactsViewCopy.subtitle}
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
      {renderRouteBody()}
    </RouteWorkbenchFrame>
  );
}
