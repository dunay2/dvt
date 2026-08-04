/** Owned concern: render immutable object source identity fields. */
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import { inspectorVisualClasses } from '../../components/inspector/inspectorVisualTokens';
import { canvasViewCopy } from '../../views/canvas/copy';
import { ObjectFilePostgresFieldError } from './ObjectFilePostgresFieldError';
import type { ObjectFilePostgresSectionProps } from './objectFilePostgresAuthoringFields.types';
import { objectFilePostgresAuthoringClasses as classes } from './objectFilePostgresAuthoringVisualTokens';

export function ObjectFilePostgresSourceFields({
  nodeId,
  disabled,
  draft,
  errors,
  onChange,
}: ObjectFilePostgresSectionProps): JSX.Element {
  const update = (patch: Partial<typeof draft>): void => onChange({ ...draft, ...patch });

  return (
    <section className={classes.section}>
      <div>
        <h3 className={inspectorVisualClasses.contextPanelSectionTitle}>
          {canvasViewCopy.inspectorObjectFileTitle}
        </h3>
        <p className={inspectorVisualClasses.inspectorBody}>
          {canvasViewCopy.inspectorObjectFileDescription}
        </p>
      </div>

      <div className={classes.field}>
        <Label htmlFor={`${nodeId}-object-uri`}>
          {canvasViewCopy.inspectorObjectFileStorageUriLabel}
        </Label>
        <Input
          id={`${nodeId}-object-uri`}
          value={draft.storageUri}
          disabled={disabled}
          aria-invalid={errors?.storageUri ? 'true' : undefined}
          onChange={(event) => update({ storageUri: event.target.value })}
        />
        <ObjectFilePostgresFieldError code={errors?.storageUri} />
      </div>

      <div className={classes.field}>
        <Label htmlFor={`${nodeId}-object-sha256`}>
          {canvasViewCopy.inspectorObjectFileSha256Label}
        </Label>
        <Input
          id={`${nodeId}-object-sha256`}
          value={draft.sha256}
          disabled={disabled}
          aria-invalid={errors?.sha256 ? 'true' : undefined}
          onChange={(event) => update({ sha256: event.target.value })}
        />
        <ObjectFilePostgresFieldError code={errors?.sha256} />
      </div>

      <div className={classes.twoColumnGrid}>
        <div className={classes.field}>
          <Label htmlFor={`${nodeId}-object-size`}>
            {canvasViewCopy.inspectorObjectFileSizeBytesLabel}
          </Label>
          <Input
            id={`${nodeId}-object-size`}
            inputMode="numeric"
            value={draft.sizeBytes}
            disabled={disabled}
            aria-invalid={errors?.sizeBytes ? 'true' : undefined}
            onChange={(event) => update({ sizeBytes: event.target.value })}
          />
          <ObjectFilePostgresFieldError code={errors?.sizeBytes} />
        </div>
        <div className={classes.field}>
          <Label htmlFor={`${nodeId}-object-max-size`}>
            {canvasViewCopy.inspectorObjectFileMaxBytesLabel}
          </Label>
          <Input
            id={`${nodeId}-object-max-size`}
            inputMode="numeric"
            value={draft.maxBytes}
            disabled={disabled}
            aria-invalid={errors?.maxBytes ? 'true' : undefined}
            onChange={(event) => update({ maxBytes: event.target.value })}
          />
          <ObjectFilePostgresFieldError code={errors?.maxBytes} />
        </div>
      </div>

      <div className={classes.field}>
        <Label>{canvasViewCopy.inspectorObjectFileFormatLabel}</Label>
        <Select
          value={draft.format}
          disabled={disabled}
          onValueChange={(value) => update({ format: value as 'csv' | 'jsonl' })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="csv">{canvasViewCopy.inspectorObjectFileCsvLabel}</SelectItem>
            <SelectItem value="jsonl">
              {canvasViewCopy.inspectorObjectFileJsonLinesLabel}
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className={classes.field}>
        <Label htmlFor={`${nodeId}-object-credential`}>
          {canvasViewCopy.inspectorObjectFileSourceCredentialLabel}
        </Label>
        <Input
          id={`${nodeId}-object-credential`}
          value={draft.sourceCredentialRef}
          disabled={disabled}
          aria-invalid={errors?.sourceCredentialRef ? 'true' : undefined}
          onChange={(event) => update({ sourceCredentialRef: event.target.value })}
        />
        <ObjectFilePostgresFieldError code={errors?.sourceCredentialRef} />
      </div>
    </section>
  );
}
