/** Input/output navigation reuses one column template; only the selected view is local state. */
import { useState } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../components/ui/tabs';
import { canvasNodeEmbeddedControlProps } from '../../components/canvas/canvasNodeInteractionBoundary';
import type { GraphNodeColumnSectionProps } from './graphNodeColumnContracts';
import { GraphNodeColumnSection } from './GraphNodeColumnSection';
import { graphNodeColumnClasses } from './graphColumnVisualTokens';
import { graphColumnTransferTarget } from './graphColumnTransfer';
import { useApplicationLanguageStore } from '../../stores/applicationLanguageStore';
import { resolveGraphNodeCardCopy } from './graphNodeCardCopyTokens';

export function GraphNodeColumnViews(props: GraphNodeColumnSectionProps) {
  const [localView, setView] = useState<'input' | 'output'>('input');
  const language = useApplicationLanguageStore((state) => state.language);
  const copy = resolveGraphNodeCardCopy(language);
  const view = props.view ?? localView;
  if (props.inputColumns == null) return <GraphNodeColumnSection {...props} />;
  const output = props.columns.filter((column) => column.output !== false);
  const columns = view === 'input' ? props.inputColumns : output;
  const status =
    props.outputState != null && props.outputState !== 'ready'
      ? copy.outputStateLabels[props.outputState]
      : null;
  return (
    <Tabs
      value={view}
      onValueChange={(next) => {
        if (next !== 'input' && next !== 'output') return;
        setView(next);
        props.onViewChange?.(next);
      }}
      className={graphNodeColumnClasses.views}
      {...(view === 'input'
        ? graphColumnTransferTarget(props)
        : {
            onDragOver: (event) => event.stopPropagation(),
            onDrop: (event) => event.stopPropagation(),
          })}
    >
      <TabsList className={graphNodeColumnClasses.viewList} {...canvasNodeEmbeddedControlProps}>
        <TabsTrigger value="input" className={graphNodeColumnClasses.viewTrigger}>
          Input ({props.inputColumns.length})
        </TabsTrigger>
        <TabsTrigger value="output" className={graphNodeColumnClasses.viewTrigger}>
          Output ({status ?? output.length})
        </TabsTrigger>
      </TabsList>
      <TabsContent value={view}>
        {view === 'output' && status != null ? (
          <div
            role="status"
            data-slot="graph-node-output-status"
            data-state={props.outputState}
            aria-busy={props.outputState === 'pending'}
            className={graphNodeColumnClasses.outputStatus}
          >
            {status}
          </div>
        ) : (
          <GraphNodeColumnSection
            {...props}
            columns={columns}
            inputColumns={undefined}
            view={view === 'input' ? 'input' : 'output'}
            showSourceName={view === 'input'}
            portDirections={view === 'input' ? ['target'] : ['source']}
            onColumnOutputToggle={undefined}
            onColumnReorder={undefined}
            onCalculatedColumnAdd={undefined}
            onStructuredFieldApply={undefined}
            onAutomap={undefined}
          />
        )}
      </TabsContent>
    </Tabs>
  );
}
