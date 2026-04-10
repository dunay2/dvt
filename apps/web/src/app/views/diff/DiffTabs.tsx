import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import {
  routeWorkbenchTabListClassName,
  routeWorkbenchTabTriggerClassName,
} from '../../components/workbench/RouteWorkbenchFrame';
import { diffViewCopy as copy } from './copy';
import type { CatalogDiffDocument, SqlDiffDocument } from './diffReviewModel';
import { CatalogDiffPanel } from './CatalogDiffPanel';
import { GraphDiffPanel } from './GraphDiffPanel';
import { SqlDiffPanel } from './SqlDiffPanel';
import type { DiffChange } from '../../types/dbt';

interface DiffTabsProps {
  catalogDocument: CatalogDiffDocument;
  changes: DiffChange[];
  sqlDocument: SqlDiffDocument;
}

export function DiffTabs({ catalogDocument, changes, sqlDocument }: DiffTabsProps) {
  return (
    <Tabs data-slot="diff-tabs" defaultValue="graph" className="mx-auto max-w-5xl">
      <TabsList className={routeWorkbenchTabListClassName}>
        <TabsTrigger value="graph" className={routeWorkbenchTabTriggerClassName}>
          {copy.tabs.graph}
        </TabsTrigger>
        <TabsTrigger value="sql" className={routeWorkbenchTabTriggerClassName}>
          {copy.tabs.sql}
        </TabsTrigger>
        <TabsTrigger value="catalog" className={routeWorkbenchTabTriggerClassName}>
          {copy.tabs.catalog}
        </TabsTrigger>
      </TabsList>
      <TabsContent value="graph" className="mt-6 space-y-3">
        <GraphDiffPanel changes={changes} />
      </TabsContent>
      <TabsContent value="sql" className="mt-6">
        <SqlDiffPanel document={sqlDocument} />
      </TabsContent>
      <TabsContent value="catalog" className="mt-6">
        <CatalogDiffPanel document={catalogDocument} />
      </TabsContent>
    </Tabs>
  );
}
