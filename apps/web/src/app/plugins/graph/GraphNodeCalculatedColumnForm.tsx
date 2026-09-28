/** Compose the calculated-column popover from its controller and passive fields. */
import { Plus } from 'lucide-react';
import type { ReactElement } from 'react';
import { canvasNodeEmbeddedControlProps } from '../../components/canvas/canvasNodeInteractionBoundary';
import { Popover, PopoverContent, PopoverTrigger } from '../../components/ui/popover';
import { GraphNodeCalculatedColumnFields } from './GraphNodeCalculatedColumnFields';
import type { GraphNodeCalculatedColumnFormProps } from './graphNodeCalculatedColumnFormModel';
import { useGraphNodeCalculatedColumnForm } from './useGraphNodeCalculatedColumnForm';
import { graphNodeColumnClasses } from './graphColumnVisualTokens';

export function GraphNodeCalculatedColumnForm(
  props: GraphNodeCalculatedColumnFormProps
): ReactElement {
  const { open, onOpenChange, fields } = useGraphNodeCalculatedColumnForm(props);
  return (
    <Popover modal open={open} onOpenChange={onOpenChange}>
      <div data-slot="graph-node-calculated-column-gap" className={graphNodeColumnClasses.addGap}>
        <PopoverTrigger asChild>
          <button
            type="button"
            data-slot="graph-node-calculated-column-trigger"
            {...canvasNodeEmbeddedControlProps}
            aria-haspopup="dialog"
            aria-label={fields.copy.addCalculatedColumnLabel}
            className={graphNodeColumnClasses.addTrigger}
          >
            <Plus aria-hidden="true" className={graphNodeColumnClasses.addIcon} />
          </button>
        </PopoverTrigger>
      </div>
      <PopoverContent
        data-slot="graph-node-calculated-column-form"
        {...canvasNodeEmbeddedControlProps}
        side="right"
        align="end"
        className={graphNodeColumnClasses.addForm}
      >
        <GraphNodeCalculatedColumnFields model={fields} />
      </PopoverContent>
    </Popover>
  );
}
