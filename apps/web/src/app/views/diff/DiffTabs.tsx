/** Owned concern: render Diff review tabs without owning query authority or Monaco runtime setup. */
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import {
  routeWorkbenchTabListClassName,
  routeWorkbenchTabTriggerClassName,
} from '../../components/workbench/RouteWorkbenchFrame';
import { diffViewCopy as copy } from './copy';
import type { DiffCompareContextState, DiffSqlContextState } from './diffWorkbenchStateModel';
import type { CatalogDiffDocument, SqlDiffDocument } from './diffReviewModel';
import { CatalogDiffPanel } from './CatalogDiffPanel';
import { GraphDiffPanel } from './GraphDiffPanel';
import { SqlDiffPanel } from './SqlDiffPanel';
import type { DiffChange } from '../../types/dbt';

interface DiffTabsProps {
  catalogDocument: CatalogDiffDocument;
  compareContextState: DiffCompareContextState;
  changes: DiffChange[];
  sqlDocument: SqlDiffDocument;
  sqlContextState: DiffSqlContextState;
}

export function DiffTabs({
  catalogDocument,
  compareContextState,
  changes,
  sqlDocument,
  sqlContextState,
}: DiffTabsProps) {
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
        <SqlDiffPanel document={sqlDocument} sqlContextState={sqlContextState} />
      </TabsContent>
      <TabsContent value="catalog" className="mt-6">
        <CatalogDiffPanel compareContextState={compareContextState} document={catalogDocument} />
      </TabsContent>
    </Tabs>
  );
}
