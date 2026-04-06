import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { diffViewCopy as copy } from './copy';
import type { CatalogDiffDocument, SqlDiffDocument } from './diffReviewModel';
import { CatalogDiffPanel } from './CatalogDiffPanel';
import { GraphDiffPanel } from './GraphDiffPanel';
import { SqlDiffPanel } from './SqlDiffPanel';
import type { DiffChange } from '../../types/dbt';

const tabTriggerClassName =
  'text-slate-200 data-[state=active]:bg-[#101724] data-[state=active]:text-white';

interface DiffTabsProps {
  catalogDocument: CatalogDiffDocument;
  changes: DiffChange[];
  sqlDocument: SqlDiffDocument;
}

export function DiffTabs({ catalogDocument, changes, sqlDocument }: DiffTabsProps) {
  return (
    <Tabs defaultValue="graph" className="mx-auto max-w-5xl">
      <TabsList className="border border-slate-700 bg-slate-900">
        <TabsTrigger value="graph" className={tabTriggerClassName}>
          {copy.tabs.graph}
        </TabsTrigger>
        <TabsTrigger value="sql" className={tabTriggerClassName}>
          {copy.tabs.sql}
        </TabsTrigger>
        <TabsTrigger value="catalog" className={tabTriggerClassName}>
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
