/** Owned concern: render the Canvas graph filter control and emit user intents only. */
import { ListFilter, Plus, X } from 'lucide-react';

import { Button } from '../../components/ui/button';
import { Popover, PopoverAnchor, PopoverContent } from '../../components/ui/popover';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '../../components/ui/tooltip';
import type {
  CanvasGraphFilterComposition,
  CanvasGraphFilterDimension,
  CanvasGraphFilterPredicate,
  CanvasGraphFilterPresentationMode,
} from './canvasGraphFilter.contract';
import { formatCanvasCopyTemplate } from './canvasCopyFormatting';
import type { CanvasViewCopy } from './canvasCopy.types';
import type { CanvasGraphFilterControlModel } from './useCanvasGraphFilterController';

type CanvasGraphFilterControlProps = Readonly<{
  model: CanvasGraphFilterControlModel;
  copy: CanvasViewCopy;
  onOpenChange: (open: boolean) => void;
  onSelectDimension: (dimension: CanvasGraphFilterDimension) => void;
  onSelectValue: (value: string) => void;
  onAddPredicate: () => void;
  onRemovePredicate: (predicate: CanvasGraphFilterPredicate) => void;
  onSetComposition: (composition: CanvasGraphFilterComposition) => void;
  onSetPresentation: (presentation: CanvasGraphFilterPresentationMode) => void;
  onClear: () => void;
}>;

export function CanvasGraphFilterControl({
  model,
  copy,
  onOpenChange,
  onSelectDimension,
  onSelectValue,
  onAddPredicate,
  onRemovePredicate,
  onSetComposition,
  onSetPresentation,
  onClear,
}: CanvasGraphFilterControlProps): JSX.Element {
  const activeCount = model.predicates.length;
  const selectedOptions =
    model.optionGroups.find((group) => group.dimension === model.draftDimension)?.values ?? [];

  return (
    <TooltipProvider delayDuration={250}>
      <Popover open={model.open} onOpenChange={onOpenChange}>
        <PopoverAnchor asChild>
          <span className="absolute top-3 right-3 z-20">
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  aria-label={copy.canvasGraphFilterLabel}
                  aria-expanded={model.open}
                  className="bg-popover text-popover-foreground border-border hover:bg-accent hover:text-accent-foreground focus-visible:border-ring focus-visible:ring-ring/50 relative inline-flex size-9 cursor-pointer items-center justify-center rounded-md border shadow-lg outline-none focus-visible:ring-[3px]"
                  onClick={() => onOpenChange(!model.open)}
                >
                  <ListFilter className="size-4" aria-hidden="true" />
                  {activeCount === 0 ? null : (
                    <span className="bg-primary text-primary-foreground absolute -top-1 -right-1 min-w-4 rounded-full px-1 text-[10px] leading-4 tabular-nums">
                      {activeCount}
                    </span>
                  )}
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom">{copy.canvasGraphFilterLabel}</TooltipContent>
            </Tooltip>
          </span>
        </PopoverAnchor>

        <PopoverContent
          data-slot="canvas-graph-filter-control"
          align="end"
          sideOffset={8}
          className="w-80 space-y-4 p-4"
        >
          <header>
            <h2 className="text-sm font-semibold">{copy.canvasGraphFilterTitle}</h2>
            <p className="text-muted-foreground mt-1 text-xs" aria-live="polite">
              {formatCanvasCopyTemplate(copy.canvasGraphFilterMatchSummaryTemplate, {
                matching: String(model.matchCount),
                total: String(model.totalCount),
              })}
            </p>
          </header>

          <FilterChoiceGroup
            label={copy.canvasGraphFilterCompositionLabel}
            choices={[
              { value: 'and', label: copy.canvasGraphFilterAndLabel },
              { value: 'or', label: copy.canvasGraphFilterOrLabel },
            ]}
            selected={model.composition}
            onSelect={(value) => onSetComposition(value as CanvasGraphFilterComposition)}
          />
          <FilterChoiceGroup
            label={copy.canvasGraphFilterPresentationLabel}
            choices={[
              { value: 'dim', label: copy.canvasGraphFilterDimLabel },
              { value: 'hide', label: copy.canvasGraphFilterHideLabel },
            ]}
            selected={model.presentation}
            onSelect={(value) => onSetPresentation(value as CanvasGraphFilterPresentationMode)}
          />

          <div className="grid grid-cols-[1fr_1fr_auto] gap-2">
            <label className="space-y-1 text-xs">
              <span className="text-muted-foreground">{copy.canvasGraphFilterDimensionLabel}</span>
              <select
                aria-label={copy.canvasGraphFilterDimensionLabel}
                value={model.draftDimension}
                className="border-input bg-input-background h-8 w-full rounded-md border px-2"
                onChange={(event) =>
                  onSelectDimension(event.currentTarget.value as CanvasGraphFilterDimension)
                }
              >
                {model.optionGroups.map((group) => (
                  <option key={group.dimension} value={group.dimension}>
                    {resolveDimensionLabel(copy, group.dimension)}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1 text-xs">
              <span className="text-muted-foreground">{copy.canvasGraphFilterValueLabel}</span>
              <select
                aria-label={copy.canvasGraphFilterValueLabel}
                value={model.draftValue}
                className="border-input bg-input-background h-8 w-full rounded-md border px-2"
                onChange={(event) => onSelectValue(event.currentTarget.value)}
              >
                {selectedOptions.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </label>
            <Button
              type="button"
              size="icon"
              variant="outline"
              className="mt-5 size-8"
              aria-label={copy.canvasGraphFilterAddLabel}
              disabled={model.draftValue.length === 0}
              onClick={onAddPredicate}
            >
              <Plus aria-hidden="true" />
            </Button>
          </div>

          <div className="space-y-2">
            {activeCount === 0 ? (
              <p className="text-muted-foreground text-xs">{copy.canvasGraphFilterEmptyLabel}</p>
            ) : (
              model.predicates.map((predicate) => (
                <div
                  key={`${predicate.dimension}:${predicate.value}`}
                  className="border-border bg-muted/30 flex items-center justify-between gap-2 rounded-md border px-2 py-1.5 text-xs"
                >
                  <span className="min-w-0 truncate">
                    {resolveDimensionLabel(copy, predicate.dimension)}: {predicate.value}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-6 shrink-0"
                    aria-label={formatCanvasCopyTemplate(
                      copy.canvasGraphFilterRemoveLabelTemplate,
                      {
                        dimension: resolveDimensionLabel(copy, predicate.dimension),
                        value: predicate.value,
                      }
                    )}
                    onClick={() => onRemovePredicate(predicate)}
                  >
                    <X aria-hidden="true" />
                  </Button>
                </div>
              ))
            )}
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-full"
            aria-label={copy.canvasGraphFilterClearLabel}
            disabled={activeCount === 0}
            onClick={onClear}
          >
            {copy.canvasGraphFilterClearLabel}
          </Button>
        </PopoverContent>
      </Popover>
    </TooltipProvider>
  );
}

function FilterChoiceGroup({
  label,
  choices,
  selected,
  onSelect,
}: Readonly<{
  label: string;
  choices: readonly { value: string; label: string }[];
  selected: string;
  onSelect: (value: string) => void;
}>): JSX.Element {
  return (
    <fieldset>
      <legend className="text-muted-foreground mb-1 text-xs">{label}</legend>
      <div className="grid grid-cols-2 gap-1">
        {choices.map((choice) => (
          <Button
            key={choice.value}
            type="button"
            size="sm"
            variant={selected === choice.value ? 'secondary' : 'ghost'}
            aria-pressed={selected === choice.value}
            onClick={() => onSelect(choice.value)}
          >
            {choice.label}
          </Button>
        ))}
      </div>
    </fieldset>
  );
}

function resolveDimensionLabel(
  copy: CanvasViewCopy,
  dimension: CanvasGraphFilterDimension
): string {
  return {
    pluginId: copy.canvasGraphFilterPluginDimensionLabel,
    kind: copy.canvasGraphFilterKindDimensionLabel,
    role: copy.canvasGraphFilterRoleDimensionLabel,
    status: copy.canvasGraphFilterStatusDimensionLabel,
    tag: copy.canvasGraphFilterTagDimensionLabel,
  }[dimension];
}

export type { CanvasGraphFilterControlProps };
