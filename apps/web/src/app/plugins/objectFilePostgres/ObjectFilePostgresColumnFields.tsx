/** Owned concern: render bounded source-to-PostgreSQL column mappings. */
import { Plus, Trash2 } from 'lucide-react';
import { OBJECT_FILE_POSTGRES_COLUMN_TYPE } from '@dvt/contracts';

import { Button } from '../../components/ui/button';
import { Checkbox } from '../../components/ui/checkbox';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import { Tooltip, TooltipContent, TooltipTrigger } from '../../components/ui/tooltip';
import { inspectorVisualClasses } from '../../components/inspector/inspectorVisualTokens';
import { canvasViewCopy } from '../../views/canvas/copy';
import type { ObjectFilePostgresColumnDraft } from '../../views/canvas/objectFilePostgresAuthoringModel';
import { ObjectFilePostgresFieldError } from './ObjectFilePostgresFieldError';
import type { ObjectFilePostgresSectionProps } from './objectFilePostgresAuthoringFields.types';
import { objectFilePostgresAuthoringClasses as classes } from './objectFilePostgresAuthoringVisualTokens';

function updateColumn(
  columns: readonly ObjectFilePostgresColumnDraft[],
  index: number,
  patch: Partial<ObjectFilePostgresColumnDraft>
): readonly ObjectFilePostgresColumnDraft[] {
  return columns.map((column, currentIndex) =>
    currentIndex === index ? { ...column, ...patch } : column
  );
}

export function ObjectFilePostgresColumnFields({
  nodeId,
  disabled,
  draft,
  errors,
  onChange,
}: ObjectFilePostgresSectionProps): JSX.Element {
  const updateColumns = (columns: readonly ObjectFilePostgresColumnDraft[]): void =>
    onChange({ ...draft, columns });

  return (
    <section className={classes.separatedSection}>
      <div className={classes.sectionHeader}>
        <h3 className={inspectorVisualClasses.contextPanelSectionTitle}>
          {canvasViewCopy.inspectorObjectFileColumnsTitle}
        </h3>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled}
          onClick={() =>
            updateColumns([
              ...draft.columns,
              { sourceField: '', targetColumn: '', dataType: 'text', nullable: true },
            ])
          }
        >
          <Plus className={classes.icon} />
          {canvasViewCopy.inspectorObjectFileAddColumnLabel}
        </Button>
      </div>

      {draft.columns.map((column, index) => (
        <div
          key={`${nodeId}-column-${index}`}
          data-slot="object-file-postgres-column-mapping"
          className={classes.mapping}
        >
          <div className={classes.twoColumnGrid}>
            <div className={classes.field}>
              <Label htmlFor={`${nodeId}-source-field-${index}`}>
                {canvasViewCopy.inspectorObjectFileSourceFieldLabel}
              </Label>
              <Input
                id={`${nodeId}-source-field-${index}`}
                value={column.sourceField}
                disabled={disabled}
                onChange={(event) =>
                  updateColumns(
                    updateColumn(draft.columns, index, { sourceField: event.target.value })
                  )
                }
              />
            </div>
            <div className={classes.field}>
              <Label htmlFor={`${nodeId}-target-column-${index}`}>
                {canvasViewCopy.inspectorObjectFileTargetColumnLabel}
              </Label>
              <Input
                id={`${nodeId}-target-column-${index}`}
                value={column.targetColumn}
                disabled={disabled}
                onChange={(event) =>
                  updateColumns(
                    updateColumn(draft.columns, index, { targetColumn: event.target.value })
                  )
                }
              />
            </div>
          </div>
          <div className={classes.mappingFooter}>
            <div className={classes.mappingType}>
              <Label>{canvasViewCopy.inspectorObjectFileDataTypeLabel}</Label>
              <Select
                value={column.dataType}
                disabled={disabled}
                onValueChange={(value) =>
                  updateColumns(
                    updateColumn(draft.columns, index, {
                      dataType: value as ObjectFilePostgresColumnDraft['dataType'],
                    })
                  )
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {OBJECT_FILE_POSTGRES_COLUMN_TYPE.map((dataType) => (
                    <SelectItem key={dataType} value={dataType}>
                      {dataType}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className={classes.nullable}>
              <Checkbox
                id={`${nodeId}-nullable-${index}`}
                checked={column.nullable}
                disabled={disabled}
                onCheckedChange={(checked) =>
                  updateColumns(updateColumn(draft.columns, index, { nullable: checked === true }))
                }
              />
              <Label htmlFor={`${nodeId}-nullable-${index}`}>
                {canvasViewCopy.inspectorObjectFileNullableLabel}
              </Label>
            </div>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  disabled={disabled || draft.columns.length === 1}
                  aria-label={canvasViewCopy.inspectorObjectFileRemoveColumnLabel}
                  onClick={() =>
                    updateColumns(draft.columns.filter((_, currentIndex) => currentIndex !== index))
                  }
                >
                  <Trash2 className={classes.icon} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{canvasViewCopy.inspectorObjectFileRemoveColumnLabel}</TooltipContent>
            </Tooltip>
          </div>
        </div>
      ))}
      <ObjectFilePostgresFieldError code={errors?.columns} />
    </section>
  );
}
