/** Input/output navigation reuses one column template; only the selected view is local state. */
import { useState } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../components/ui/tabs';
import { canvasNodeEmbeddedControlProps } from '../../components/canvas/canvasNodeInteractionBoundary';
import type { GraphNodeColumnSectionProps } from './graphNodeColumnContracts';
import { GraphNodeColumnSection } from './GraphNodeColumnSection';
import { graphNodeColumnClasses } from './graphColumnVisualTokens';
import { graphColumnTransferTarget } from './graphColumnTransfer';

export function GraphNodeColumnViews(props: GraphNodeColumnSectionProps) {
  const [view, setView] = useState('input');
  if (props.inputColumns == null) return <GraphNodeColumnSection {...props} />;
  const output = props.columns.filter((column) => column.output !== false);
  const columns = view === 'input' ? props.inputColumns : output;
  return (
    <Tabs
      value={view}
      onValueChange={setView}
      className={graphNodeColumnClasses.views}
      {...(view === 'output' ? graphColumnTransferTarget(props) : {})}
    >
      <TabsList className={graphNodeColumnClasses.viewList} {...canvasNodeEmbeddedControlProps}>
        <TabsTrigger value="input" className={graphNodeColumnClasses.viewTrigger}>
          Input ({props.inputColumns.length})
        </TabsTrigger>
        <TabsTrigger value="output" className={graphNodeColumnClasses.viewTrigger}>
          Output ({output.length})
        </TabsTrigger>
      </TabsList>
      <TabsContent value={view}>
        <GraphNodeColumnSection
          {...props}
          columns={columns}
          inputColumns={undefined}
          view={view === 'input' ? 'input' : 'output'}
          showSourceName={view === 'input'}
          onColumnOutputToggle={view === 'output' ? props.onColumnOutputToggle : undefined}
          onColumnReorder={view === 'output' ? props.onColumnReorder : undefined}
          onColumnFunctionApply={view === 'output' ? props.onColumnFunctionApply : undefined}
          onCalculatedColumnAdd={view === 'output' ? props.onCalculatedColumnAdd : undefined}
          onStructuredFieldApply={view === 'output' ? props.onStructuredFieldApply : undefined}
          onAutomap={view === 'output' ? props.onAutomap : undefined}
        />
      </TabsContent>
    </Tabs>
  );
}
