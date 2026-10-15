/**
 * Owned concern: render Canvas graph filters from their UI binding and emit existing intents only.
 * @baseline GH-3634: control-owned appearance belongs to its stylesheet, not JSX utility strings.
 * @decision Keep semantic CSS classes separate from bindings and shared primitive behavior.
 * @consequence Filter interaction remains unchanged while its presentation has one owner.
 * @version 1.0.0
 */
import { ListFilter, Plus, X } from 'lucide-react';

import { Button } from '../../components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '../../components/ui/popover';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '../../components/ui/tooltip';
import type {
  CanvasGraphFilterComposition,
  CanvasGraphFilterDimension,
  CanvasGraphFilterPresentationMode,
} from './canvasGraphFilter.contract';
import { formatCanvasCopyTemplate } from './canvasCopyFormatting';
import type { CanvasViewCopy } from './canvasCopy.types';
import type { CanvasGraphFilterControlBinding } from './canvasGraphFilterControl.binding';
import styles from './CanvasGraphFilterControl.module.css';

type CanvasGraphFilterControlProps = Readonly<{
  binding: CanvasGraphFilterControlBinding;
  copy: CanvasViewCopy;
}>;

export function CanvasGraphFilterControl({
  binding,
  copy,
}: CanvasGraphFilterControlProps): JSX.Element {
  const { model } = binding;
  const activeCount = model.predicates.length;
  const selectedOptions =
    model.optionGroups.find((group) => group.dimension === model.draftDimension)?.values ?? [];

  return (
    <TooltipProvider delayDuration={250}>
      <Popover open={model.open} onOpenChange={binding.setOpen}>
        <Tooltip>
          <TooltipTrigger asChild>
            <span className={styles.triggerFrame}>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  aria-label={copy.canvasGraphFilterLabel}
                  className={styles.triggerButton}
                >
                  <ListFilter className={styles.triggerIcon} aria-hidden="true" />
                  {activeCount === 0 ? null : (
                    <span className={styles.activeCount}>{activeCount}</span>
                  )}
                </button>
              </PopoverTrigger>
            </span>
          </TooltipTrigger>
          <TooltipContent side="bottom">{copy.canvasGraphFilterLabel}</TooltipContent>
        </Tooltip>

        <PopoverContent
          data-slot="canvas-graph-filter-control"
          align="end"
          sideOffset={8}
          className={styles.content}
        >
          <header>
            <h2 className={styles.title}>{copy.canvasGraphFilterTitle}</h2>
            <p className={styles.matchSummary} aria-live="polite">
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
            onSelect={(value) => binding.setComposition(value as CanvasGraphFilterComposition)}
          />
          <FilterChoiceGroup
            label={copy.canvasGraphFilterPresentationLabel}
            choices={[
              { value: 'dim', label: copy.canvasGraphFilterDimLabel },
              { value: 'hide', label: copy.canvasGraphFilterHideLabel },
            ]}
            selected={model.presentation}
            onSelect={(value) =>
              binding.setPresentation(value as CanvasGraphFilterPresentationMode)
            }
          />

          <div className={styles.draftGrid}>
            <label className={styles.fieldLabel}>
              <span className={styles.mutedLabel}>{copy.canvasGraphFilterDimensionLabel}</span>
              <select
                aria-label={copy.canvasGraphFilterDimensionLabel}
                value={model.draftDimension}
                className={styles.select}
                onChange={(event) =>
                  binding.selectDimension(event.currentTarget.value as CanvasGraphFilterDimension)
                }
              >
                {model.optionGroups.map((group) => (
                  <option key={group.dimension} value={group.dimension}>
                    {resolveDimensionLabel(copy, group.dimension)}
                  </option>
                ))}
              </select>
            </label>
            <label className={styles.fieldLabel}>
              <span className={styles.mutedLabel}>{copy.canvasGraphFilterValueLabel}</span>
              <select
                aria-label={copy.canvasGraphFilterValueLabel}
                value={model.draftValue}
                className={styles.select}
                onChange={(event) => binding.selectValue(event.currentTarget.value)}
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
              className={styles.addButton}
              aria-label={copy.canvasGraphFilterAddLabel}
              disabled={model.draftValue.length === 0}
              onClick={binding.addDraftPredicate}
            >
              <Plus aria-hidden="true" />
            </Button>
          </div>

          <div className={styles.predicateList}>
            {activeCount === 0 ? (
              <p className={styles.empty}>{copy.canvasGraphFilterEmptyLabel}</p>
            ) : (
              model.predicates.map((predicate) => (
                <div
                  key={`${predicate.dimension}:${predicate.value}`}
                  className={styles.predicateRow}
                >
                  <span className={styles.predicateText}>
                    {resolveDimensionLabel(copy, predicate.dimension)}: {predicate.value}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className={styles.removeButton}
                    aria-label={formatCanvasCopyTemplate(
                      copy.canvasGraphFilterRemoveLabelTemplate,
                      {
                        dimension: resolveDimensionLabel(copy, predicate.dimension),
                        value: predicate.value,
                      }
                    )}
                    onClick={() => binding.removePredicate(predicate)}
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
            className={styles.clearButton}
            aria-label={copy.canvasGraphFilterClearLabel}
            disabled={activeCount === 0}
            onClick={binding.clear}
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
      <legend className={styles.choiceLegend}>{label}</legend>
      <div className={styles.choiceGrid}>
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
