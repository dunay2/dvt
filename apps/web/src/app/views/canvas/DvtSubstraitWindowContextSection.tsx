/** Owned concern: project and edit one admitted Window as a contextual self-relation. */
import { useId } from 'react';

import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { canvasViewCopy } from './copy';

type WindowFieldOption = Readonly<{ fieldId: string; name: string }>;

type ConfiguredWindowProps = Readonly<{
  mode: 'configured';
  sourceName: string;
  disabled: boolean;
  partitionName: string;
  orderName: string;
  outputName: string;
  onOutputNameChange: (value: string) => void;
  onOutputNameCommit: () => void;
  onRemove: () => void;
}>;

type AuthoringWindowProps = Readonly<{
  mode: 'authoring';
  sourceName: string;
  disabled: boolean;
  fields: readonly WindowFieldOption[];
  partitionFieldId: string;
  orderFieldId: string;
  outputName: string;
  canApply: boolean;
  onPartitionChange: (fieldId: string) => void;
  onOrderChange: (fieldId: string) => void;
  onOutputNameChange: (value: string) => void;
  onApply: () => void;
}>;

type DvtSubstraitWindowContextSectionProps = ConfiguredWindowProps | AuthoringWindowProps;

export function DvtSubstraitWindowContextSection(
  props: DvtSubstraitWindowContextSectionProps
): JSX.Element {
  const titleId = useId();

  const partitionControl =
    props.mode === 'configured' ? (
      <div
        data-slot="dvt-substrait-window-partition-readonly"
        className="rounded border border-[color:var(--border-default)] px-2 py-1.5 text-xs"
      >
        {props.partitionName}
      </div>
    ) : (
      <select
        aria-label={canvasViewCopy.inspectorDvtSubstraitWindowPartitionFieldLabel}
        data-slot="dvt-substrait-window-partition-field"
        className="h-9 w-full rounded-md border border-input bg-input-background px-3 text-sm"
        disabled={props.disabled}
        value={props.partitionFieldId}
        onChange={(event) => props.onPartitionChange(event.currentTarget.value)}
      >
        {props.fields.map((field) => (
          <option key={field.fieldId} value={field.fieldId}>
            {field.name}
          </option>
        ))}
      </select>
    );
  const orderControl =
    props.mode === 'configured' ? (
      <div
        data-slot="dvt-substrait-window-order-readonly"
        className="rounded border border-[color:var(--border-default)] px-2 py-1.5 text-xs"
      >
        {props.orderName}
      </div>
    ) : (
      <select
        aria-label={canvasViewCopy.inspectorDvtSubstraitWindowOrderFieldLabel}
        data-slot="dvt-substrait-window-order-field"
        className="h-9 w-full rounded-md border border-input bg-input-background px-3 text-sm"
        disabled={props.disabled}
        value={props.orderFieldId}
        onChange={(event) => props.onOrderChange(event.currentTarget.value)}
      >
        {props.fields.map((field) => (
          <option key={field.fieldId} value={field.fieldId}>
            {field.name}
          </option>
        ))}
      </select>
    );

  return (
    <section
      data-slot="dvt-substrait-window-context"
      aria-labelledby={titleId}
      className="space-y-3 rounded border border-[color:var(--border-default)] p-3"
    >
      <h4 id={titleId} className="text-xs font-medium text-(--text-default)">
        {canvasViewCopy.inspectorDvtSubstraitWindowTitle}
      </h4>
      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
        <dt className="text-(--text-muted)">
          {canvasViewCopy.inspectorDvtSubstraitWindowInputLabel}
        </dt>
        <dd className="truncate font-mono text-(--text-default)">{props.sourceName}</dd>
        <dt className="text-(--text-muted)">
          {canvasViewCopy.inspectorDvtSubstraitWindowFrameLabel}
        </dt>
        <dd>{canvasViewCopy.inspectorDvtSubstraitWindowFrameUnspecifiedLabel}</dd>
        <dt className="text-(--text-muted)">
          {canvasViewCopy.inspectorDvtSubstraitWindowOperationLabel}
        </dt>
        <dd className="font-mono">ROW_NUMBER</dd>
      </dl>
      <div className="space-y-1">
        <p className="text-xs font-medium">
          {canvasViewCopy.inspectorDvtSubstraitWindowPartitionFieldLabel}
        </p>
        {partitionControl}
      </div>
      <div className="space-y-1">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-medium">
            {canvasViewCopy.inspectorDvtSubstraitWindowOrderFieldLabel}
          </p>
          <span className="font-mono text-[11px] text-(--text-muted)">
            {canvasViewCopy.inspectorDvtSubstraitWindowOrderDirectionLabel}
          </span>
        </div>
        {orderControl}
      </div>
      <div className="space-y-1">
        <p className="text-xs font-medium">
          {canvasViewCopy.inspectorDvtSubstraitWindowOutputLabel}
        </p>
        <Input
          aria-label={canvasViewCopy.inspectorDvtSubstraitWindowOutputLabel}
          data-slot="dvt-substrait-window-output-name"
          disabled={props.disabled}
          value={props.outputName}
          onChange={(event) => props.onOutputNameChange(event.currentTarget.value)}
          onBlur={props.mode === 'configured' ? props.onOutputNameCommit : undefined}
          onKeyDown={(event) => {
            if (props.mode === 'configured' && event.key === 'Enter') {
              event.currentTarget.blur();
            }
          }}
        />
      </div>
      {props.mode === 'configured' ? (
        <Button
          type="button"
          size="sm"
          variant="outline"
          data-slot="dvt-substrait-remove-window"
          disabled={props.disabled}
          onClick={props.onRemove}
        >
          {canvasViewCopy.inspectorDvtSubstraitRemoveWindowLabel}
        </Button>
      ) : (
        <Button
          type="button"
          size="sm"
          data-slot="dvt-substrait-apply-window"
          disabled={props.disabled || !props.canApply}
          onClick={props.onApply}
          onKeyDown={(event) => {
            if (event.key !== 'Enter' && event.key !== ' ') return;
            event.preventDefault();
            props.onApply();
          }}
        >
          {canvasViewCopy.inspectorDvtSubstraitApplyWindowLabel}
        </Button>
      )}
    </section>
  );
}
