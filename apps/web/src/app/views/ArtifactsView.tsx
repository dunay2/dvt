import { FileText, GitBranch } from 'lucide-react';

import { ViewHeader } from '../components/domain';
import { Badge } from '../components/ui/badge';
import { ScrollArea } from '../components/ui/scroll-area';
import { ArtifactPreviewTabs } from './artifacts/ArtifactPreviewTabs';
import { ArtifactsInfoCard } from './artifacts/ArtifactsInfoCard';
import { ArtifactsList } from './artifacts/ArtifactsList';
import { artifactsViewCopy } from './artifacts/copy';
import { ManifestImportPanel } from './artifacts/ManifestImportPanel';
import { useArtifactsViewModel } from './artifacts/useArtifactsViewModel';
import { useLocalManifestImport } from './artifacts/useLocalManifestImport';

export default function ArtifactsView() {
  const panelClassName = 'bg-slate-900 border-slate-700 p-4 text-slate-50';
  const tabTriggerClassName =
    'text-slate-200 data-[state=active]:bg-[#101724] data-[state=active]:text-white';

  const manifestImport = useLocalManifestImport();
  const { manifestPreview, artifacts, importedStats } = useArtifactsViewModel(manifestImport.state);

  return (
    <div className="flex h-full min-h-0 flex-col bg-slate-950 text-slate-50">
      <div className="border-b border-slate-700 bg-slate-900 px-6 py-4">
        <ViewHeader
          className="border-0 bg-transparent px-0 py-0"
          title={artifactsViewCopy.title}
          icon={<FileText className="size-6 text-blue-400" />}
          subtitle={artifactsViewCopy.subtitle}
          actions={
            <Badge variant="outline" className="text-xs">
              <GitBranch className="mr-1 size-3" />
              {artifactsViewCopy.focusedGitSha}
            </Badge>
          }
        />
      </div>

      <ScrollArea className="min-h-0 flex-1">
        <div className="p-6 pb-10">
          <div className="mx-auto max-w-5xl space-y-6">
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
              manifestPreview={manifestPreview}
              panelClassName={panelClassName}
              tabTriggerClassName={tabTriggerClassName}
            />
            <ArtifactsInfoCard />
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
