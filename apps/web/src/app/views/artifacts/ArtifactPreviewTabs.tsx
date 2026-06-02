/** Owned concern: render Artifacts preview tabs without owning Monaco runtime setup. */
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Card } from '../../components/ui/card';
import { routeWorkbenchTabListClassName } from '../../components/workbench/RouteWorkbenchFrame';
import { ArtifactMonacoPreviewPanel } from './ArtifactMonacoPreviewPanel';
import type { ArtifactPreviewDocumentMap } from './constants';

type ArtifactPreviewTabsProps = {
  previewDocuments: ArtifactPreviewDocumentMap;
  panelClassName: string;
  tabTriggerClassName: string;
  activePreviewKey?: string;
  onActivePreviewKeyChange: (previewKey: string) => void;
};

export function ArtifactPreviewTabs({
  previewDocuments,
  panelClassName,
  tabTriggerClassName,
  activePreviewKey,
  onActivePreviewKeyChange,
}: ArtifactPreviewTabsProps) {
  const documents = Object.entries(previewDocuments);
  const fallbackValue = previewDocuments['manifest.json'] ? 'manifest.json' : documents[0]?.[0];
  const activeValue =
    activePreviewKey && previewDocuments[activePreviewKey] ? activePreviewKey : fallbackValue;

  return (
    <Card className={panelClassName}>
      <Tabs value={activeValue} onValueChange={onActivePreviewKeyChange}>
        <TabsList className={routeWorkbenchTabListClassName}>
          {documents.map(([key, document]) => (
            <TabsTrigger key={key} value={key} className={tabTriggerClassName}>
              {document.label ?? key}
            </TabsTrigger>
          ))}
        </TabsList>

        {documents.map(([key, document]) => {
          const label = document.label ?? key;

          return (
            <TabsContent key={key} value={key} className="mt-4">
              <ArtifactMonacoPreviewPanel
                title={document.title ?? `Preview: ${label}`}
                fileName={label}
                document={document}
              />
            </TabsContent>
          );
        })}
      </Tabs>
    </Card>
  );
}
