/** Owned concern: compose the Artifacts route workbench from import and workspace artifact read models. */
import { FileText } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';

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
import { formatStructuredArtifactContent } from './artifacts/structuredArtifactContent';
import { useArtifactsViewModel } from './artifacts/useArtifactsViewModel';
import { useLocalManifestImport } from './artifacts/useLocalManifestImport';
import { CANVAS_WORKBENCH_ROUTE_ID } from './canvas/canvasDraftPresentationStore';

export default function ArtifactsView() {
  const panelClassName = cn(routeWorkbenchPanelClassName, 'p-4');

  const manifestImport = useLocalManifestImport();
  const { artifacts, importedStats, previewDocuments, isLoading, errorMessage } =
    useArtifactsViewModel(manifestImport.state);
  const [selectedPreviewKey, setSelectedPreviewKey] = useState<string | undefined>();
  const previewPanelRef = useRef<HTMLDivElement | null>(null);
  const previewKeys = useMemo(() => Object.keys(previewDocuments), [previewDocuments]);
  const defaultPreviewKey = previewDocuments['manifest.json'] ? 'manifest.json' : previewKeys[0];
  const activePreviewKey =
    selectedPreviewKey && previewDocuments[selectedPreviewKey]
      ? selectedPreviewKey
      : defaultPreviewKey;
  const workbenchState = getArtifactsWorkbenchState({
    artifactCount: artifacts.length,
    importState: manifestImport.state,
    isLoadingWorkspaceArtifacts: isLoading,
    workspaceArtifactsErrorMessage: errorMessage,
  });
  usePublishedRouteBootstrap(
    CANVAS_WORKBENCH_ROUTE_ID,
    deriveArtifactsRouteBootstrapPresentation(workbenchState)
  );

  useEffect(() => {
    if (previewKeys.length === 0) {
      if (selectedPreviewKey !== undefined) {
        setSelectedPreviewKey(undefined);
      }
      return;
    }

    if (!selectedPreviewKey || !previewDocuments[selectedPreviewKey]) {
      setSelectedPreviewKey(defaultPreviewKey);
    }
  }, [defaultPreviewKey, previewDocuments, previewKeys.length, selectedPreviewKey]);

  function scrollPreviewIntoView() {
    const panel = previewPanelRef.current;
    if (panel && typeof panel.scrollIntoView === 'function') {
      panel.scrollIntoView({ block: 'start', behavior: 'smooth' });
    }
  }

  function handleViewArtifact(previewKey: string) {
    setSelectedPreviewKey(previewKey);
    scrollPreviewIntoView();
  }

  function handleDownloadArtifact(previewKey: string) {
    const document = previewDocuments[previewKey];
    if (!document) {
      return;
    }

    const content = formatStructuredArtifactContent(document.content);
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = window.document.createElement('a');
    link.href = url;
    link.download = document.label ?? previewKey.split('/').at(-1) ?? previewKey;
    window.document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

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
            <ArtifactsList
              artifacts={artifacts}
              panelClassName={panelClassName}
              selectedPreviewKey={activePreviewKey}
              onViewArtifact={handleViewArtifact}
              onDownloadArtifact={handleDownloadArtifact}
            />
            <div ref={previewPanelRef} data-slot="artifacts-preview-panel">
              <ArtifactPreviewTabs
                previewDocuments={previewDocuments}
                panelClassName={panelClassName}
                tabTriggerClassName={routeWorkbenchTabTriggerClassName}
                activePreviewKey={activePreviewKey}
                onActivePreviewKeyChange={setSelectedPreviewKey}
              />
            </div>
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
      slots={{
        primarySurface: (
          <>
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
          </>
        ),
      }}
    />
  );
}
