/** Owned concern: render Artifacts preview tabs without owning Monaco runtime setup. */
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Card } from '../../components/ui/card';
import { routeWorkbenchTabListClassName } from '../../components/workbench/RouteWorkbenchFrame';
import { ArtifactMonacoPreviewPanel } from './ArtifactMonacoPreviewPanel';
import { ArtifactPreviewUnavailableStateView } from './ArtifactsStateViews';
import { artifactsViewCopy } from './copy';
import type { ArtifactPreviewDocumentMap } from './constants';

type ArtifactPreviewTabsProps = {
  previewDocuments: ArtifactPreviewDocumentMap;
  panelClassName: string;
  tabTriggerClassName: string;
};

export function ArtifactPreviewTabs({
  previewDocuments,
  panelClassName,
  tabTriggerClassName,
}: ArtifactPreviewTabsProps) {
  const manifestDocument = previewDocuments['manifest.json'];
  const runResultsDocument = previewDocuments['run_results.json'];
  const catalogDocument = previewDocuments['catalog.json'];

  return (
    <Card className={panelClassName}>
      <Tabs defaultValue="manifest">
        <TabsList className={routeWorkbenchTabListClassName}>
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
          {manifestDocument ? (
            <ArtifactMonacoPreviewPanel
              title={artifactsViewCopy.previewManifest}
              fileName="manifest.json"
              document={manifestDocument}
            />
          ) : (
            <ArtifactPreviewUnavailableStateView fileName="manifest.json" />
          )}
        </TabsContent>
        <TabsContent value="run_results" className="mt-4">
          {runResultsDocument ? (
            <ArtifactMonacoPreviewPanel
              title={artifactsViewCopy.previewRunResults}
              fileName="run_results.json"
              document={runResultsDocument}
            />
          ) : (
            <ArtifactPreviewUnavailableStateView fileName="run_results.json" />
          )}
        </TabsContent>
        <TabsContent value="catalog" className="mt-4">
          {catalogDocument ? (
            <ArtifactMonacoPreviewPanel
              title={artifactsViewCopy.previewCatalog}
              fileName="catalog.json"
              document={catalogDocument}
            />
          ) : (
            <ArtifactPreviewUnavailableStateView fileName="catalog.json" />
          )}
        </TabsContent>
      </Tabs>
    </Card>
  );
}
