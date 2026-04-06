import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { MonacoCodeViewer } from '../../components/monaco/MonacoCodeViewer';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { artifactsViewCopy } from './copy';
import type { ArtifactPreviewDocumentMap } from './constants';
import { formatStructuredArtifactContent } from './structuredArtifactContent';

type ArtifactPreviewTabsProps = {
  previewDocuments: ArtifactPreviewDocumentMap;
  panelClassName: string;
  tabTriggerClassName: string;
};

function PreviewPane({
  title,
  fileName,
  content,
}: {
  title: string;
  fileName: string;
  content: unknown;
}) {
  return (
    <>
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-semibold">{title}</h3>
        <Button variant="outline" size="sm">
          {artifactsViewCopy.viewFullFile}
        </Button>
      </div>
      <MonacoCodeViewer
        ariaLabel={title}
        language="json"
        loadingLabel={`Loading ${fileName}...`}
        path={fileName}
        value={formatStructuredArtifactContent(content)}
      />
    </>
  );
}

export function ArtifactPreviewTabs({
  previewDocuments,
  panelClassName,
  tabTriggerClassName,
}: ArtifactPreviewTabsProps) {
  return (
    <Card className={panelClassName}>
      <Tabs defaultValue="manifest">
        <TabsList className="border border-slate-700 bg-slate-950">
          <TabsTrigger value="manifest" className={tabTriggerClassName}>
            manifest.json
          </TabsTrigger>
          <TabsTrigger value="run_results" className={tabTriggerClassName}>
            run_results.json
          </TabsTrigger>
          <TabsTrigger value="catalog" className={tabTriggerClassName}>
            catalog.json
          </TabsTrigger>
        </TabsList>

        <TabsContent value="manifest" className="mt-4">
          <PreviewPane
            title={artifactsViewCopy.previewManifest}
            fileName="manifest.json"
            content={previewDocuments['manifest.json'].content}
          />
        </TabsContent>
        <TabsContent value="run_results" className="mt-4">
          <PreviewPane
            title={artifactsViewCopy.previewRunResults}
            fileName="run_results.json"
            content={previewDocuments['run_results.json'].content}
          />
        </TabsContent>
        <TabsContent value="catalog" className="mt-4">
          <PreviewPane
            title={artifactsViewCopy.previewCatalog}
            fileName="catalog.json"
            content={previewDocuments['catalog.json'].content}
          />
        </TabsContent>
      </Tabs>
    </Card>
  );
}
