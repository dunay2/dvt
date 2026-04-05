import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { CATALOG_PREVIEW, RUN_RESULTS_PREVIEW } from './constants';
import { artifactsViewCopy } from './copy';

type ArtifactPreviewTabsProps = {
  manifestPreview: unknown;
  panelClassName: string;
  tabTriggerClassName: string;
};

function PreviewPane({ title, content }: { title: string; content: unknown }) {
  return (
    <>
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-semibold">{title}</h3>
        <Button variant="outline" size="sm">
          {artifactsViewCopy.viewFullFile}
        </Button>
      </div>
      <pre className="max-h-[500px] overflow-auto rounded border border-slate-700 bg-slate-950 p-4 font-mono text-xs text-slate-50">
        {JSON.stringify(content, null, 2)}
      </pre>
    </>
  );
}

export function ArtifactPreviewTabs({
  manifestPreview,
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
          <PreviewPane title={artifactsViewCopy.previewManifest} content={manifestPreview} />
        </TabsContent>
        <TabsContent value="run_results" className="mt-4">
          <PreviewPane title={artifactsViewCopy.previewRunResults} content={RUN_RESULTS_PREVIEW} />
        </TabsContent>
        <TabsContent value="catalog" className="mt-4">
          <PreviewPane title={artifactsViewCopy.previewCatalog} content={CATALOG_PREVIEW} />
        </TabsContent>
      </Tabs>
    </Card>
  );
}
