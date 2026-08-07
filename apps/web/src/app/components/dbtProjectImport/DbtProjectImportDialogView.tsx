/** Owned concern: render the dbt project import presentation model without transport logic. */
import { AlertCircle, CheckCircle2, FolderInput, LoaderCircle } from 'lucide-react';
import type { FormEvent } from 'react';

import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { cn } from '../ui/utils';
import type { DbtProjectImportPresentationModel } from './dbtProjectImportPresentationModel';
import { useApplicationLanguageStore } from '../../stores/applicationLanguageStore';
import { resolveDbtProjectImportCopy, type DbtProjectImportCopy } from './dbtProjectImportCopy';

type DbtProjectImportDialogViewProps = Readonly<{
  open: boolean;
  model: DbtProjectImportPresentationModel;
  onOpenChange: (open: boolean) => void;
  onProjectRootChange: (value: string) => void;
  onCanvasIdChange: (value: string) => void;
  onRestoreFocus?: () => void;
  onValidate: () => void;
  onImport: () => void;
}>;

const STATUS_TONE_CLASS = {
  neutral: 'border-(--border-default) text-(--text-muted)',
  info: 'border-(--status-info) text-(--status-info)',
  success: 'border-(--status-success) text-(--status-success)',
  warning: 'border-(--status-warning) text-(--status-warning)',
  danger: 'border-(--status-danger) text-(--status-danger)',
} as const;

function ProjectSummary({
  model,
  copy,
}: Readonly<{ model: DbtProjectImportPresentationModel; copy: DbtProjectImportCopy }>) {
  if (model.project == null || model.inventory == null) {
    return null;
  }

  const metrics = [
    [copy.filesLabel, copy.fileCountTemplate.replace('{count}', String(model.inventory.fileCount))],
    [copy.includedLabel, String(model.inventory.includedFileCount)],
    [copy.excludedLabel, String(model.inventory.excludedFileCount)],
    [copy.projectSizeLabel, model.inventory.totalBytesLabel],
  ] as const;

  return (
    <section
      aria-labelledby="dbt-import-summary-title"
      className="border-t border-(--border-muted) pt-4"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 id="dbt-import-summary-title" className="text-sm font-semibold text-(--text-default)">
            {model.project.name}
          </h3>
          <p className="mt-1 text-xs text-(--text-muted)">
            {copy.adapterLabel}:{' '}
            <span className="font-mono text-(--text-default)">{model.project.adapter}</span>
          </p>
        </div>
        <Badge
          variant="outline"
          className={STATUS_TONE_CLASS[model.status.tone]}
          aria-live="polite"
        >
          {model.status.busy ? <LoaderCircle className="animate-spin" /> : null}
          {copy.statusByPhase[model.phase]}
        </Badge>
      </div>
      <dl className="mt-4 grid grid-cols-2 border-y border-(--border-muted) md:grid-cols-4">
        {metrics.map(([label, value]) => (
          <div
            key={label}
            className="border-(--border-muted) px-3 py-2 md:border-r md:last:border-r-0"
          >
            <dt className="text-xs text-(--text-muted)">{label}</dt>
            <dd className="mt-1 text-sm font-semibold text-(--text-default)">{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function ProjectInventory({
  model,
  copy,
}: Readonly<{ model: DbtProjectImportPresentationModel; copy: DbtProjectImportCopy }>) {
  if (model.inventory == null) {
    return null;
  }

  return (
    <section aria-labelledby="dbt-import-inventory-title">
      <h3
        id="dbt-import-inventory-title"
        className="mb-2 text-sm font-semibold text-(--text-default)"
      >
        {copy.inventoryTitle}
      </h3>
      <div className="max-h-52 overflow-auto border-y border-(--border-muted)">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{copy.pathLabel}</TableHead>
              <TableHead>{copy.classificationLabel}</TableHead>
              <TableHead>{copy.decisionLabel}</TableHead>
              <TableHead className="text-right">{copy.sizeLabel}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {model.inventory.files.map((file) => (
              <TableRow key={file.path}>
                <TableCell className="max-w-80 whitespace-normal font-mono text-xs">
                  <span>{file.path}</span>
                  {file.reason == null ? null : (
                    <span className="mt-1 block font-sans text-(--text-muted)">{file.reason}</span>
                  )}
                </TableCell>
                <TableCell>{file.classification}</TableCell>
                <TableCell>
                  <Badge variant="outline">
                    {file.decisionLabel === 'Included'
                      ? copy.includedLabel
                      : file.decisionLabel === 'Excluded'
                        ? copy.excludedLabel
                        : file.decisionLabel}
                  </Badge>
                </TableCell>
                <TableCell className="text-right font-mono text-xs">{file.byteSizeLabel}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </section>
  );
}

function ProjectDiagnostics({
  model,
  copy,
}: Readonly<{ model: DbtProjectImportPresentationModel; copy: DbtProjectImportCopy }>) {
  if (model.diagnostics.length === 0 && model.failureMessage == null) {
    return null;
  }

  return (
    <section aria-labelledby="dbt-import-diagnostics-title">
      <h3
        id="dbt-import-diagnostics-title"
        className="mb-2 text-sm font-semibold text-(--text-default)"
      >
        {copy.diagnosticsTitle}
      </h3>
      <div className="grid gap-2">
        {model.failureMessage == null ? null : (
          <Alert variant="destructive">
            <AlertCircle />
            <AlertTitle>{copy.requestFailedTitle}</AlertTitle>
            <AlertDescription>{model.failureMessage}</AlertDescription>
          </Alert>
        )}
        {model.diagnostics.map((diagnostic, index) => (
          <Alert
            key={`${diagnostic.code}-${diagnostic.location ?? ''}-${index}`}
            variant={diagnostic.severity === 'error' ? 'destructive' : 'default'}
            className={cn(
              diagnostic.severity === 'warning' && 'border-(--status-warning)',
              diagnostic.severity === 'info' && 'border-(--status-info)'
            )}
          >
            <AlertCircle />
            <AlertTitle>{diagnostic.code}</AlertTitle>
            <AlertDescription>
              <span>{diagnostic.message}</span>
              {diagnostic.location == null ? null : (
                <span className="font-mono text-xs">{diagnostic.location}</span>
              )}
            </AlertDescription>
          </Alert>
        ))}
      </div>
    </section>
  );
}

function ImportReceipt({
  model,
  copy,
}: Readonly<{ model: DbtProjectImportPresentationModel; copy: DbtProjectImportCopy }>) {
  if (model.receipt == null) {
    return null;
  }

  return (
    <Alert className="border-(--status-success)" data-slot="dbt-project-import-receipt">
      <CheckCircle2 className="text-(--status-success)" />
      <AlertTitle>{copy.authorityEstablishedTitle}</AlertTitle>
      <AlertDescription>
        <span>
          {copy.projectedResourcesTemplate.replace(
            '{count}',
            String(model.receipt.projectedResourceCount)
          )}
        </span>
        <span>
          {copy.canvasLabel} <strong>{model.receipt.canvasId}</strong>{' '}
          {copy.projectRootConnectorLabel}{' '}
          <span className="font-mono">{model.receipt.projectRoot}</span>
        </span>
        <span className="font-mono text-xs">
          {copy.revisionLabel} {model.receipt.revision}
        </span>
      </AlertDescription>
    </Alert>
  );
}

export function DbtProjectImportDialogView({
  open,
  model,
  onOpenChange,
  onProjectRootChange,
  onCanvasIdChange,
  onRestoreFocus,
  onValidate,
  onImport,
}: DbtProjectImportDialogViewProps): JSX.Element {
  const language = useApplicationLanguageStore((state) => state.language);
  const copy = resolveDbtProjectImportCopy(language);
  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    if (model.canValidate) {
      onValidate();
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        data-slot="dbt-project-import-dialog"
        closeLabel={copy.closeLabel}
        onCloseAutoFocus={(event) => {
          if (onRestoreFocus == null) {
            return;
          }
          event.preventDefault();
          onRestoreFocus();
        }}
        className="max-h-[min(90vh,54rem)] max-w-5xl overflow-hidden border-(--border-default) bg-(--surface-panel) p-0 text-(--text-default)"
      >
        <DialogHeader className="border-b border-(--border-muted) px-6 py-5 pr-14">
          <DialogTitle className="flex items-center gap-2">
            <FolderInput className="size-5 text-(--accent-default)" />
            {copy.title}
          </DialogTitle>
          <DialogDescription>{copy.description}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="min-h-0 overflow-y-auto px-6 py-5">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="dbt-project-root">{copy.projectRootLabel}</Label>
              <Input
                id="dbt-project-root"
                data-slot="dbt-project-import-root"
                defaultValue={model.projectRoot}
                disabled={model.status.busy || model.phase === 'imported'}
                onChange={(event) => onProjectRootChange(event.currentTarget.value)}
                placeholder="analytics/dbt"
                autoComplete="off"
              />
              <p className="text-xs text-(--text-muted)">{copy.projectRootHelp}</p>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="dbt-project-canvas-id">{copy.canvasIdLabel}</Label>
              <Input
                id="dbt-project-canvas-id"
                data-slot="dbt-project-import-canvas-id"
                defaultValue={model.canvasId}
                disabled={model.status.busy || model.phase === 'imported'}
                onChange={(event) => onCanvasIdChange(event.currentTarget.value)}
                placeholder="warehouse-analytics"
                autoComplete="off"
              />
              <p className="text-xs text-(--text-muted)">{copy.canvasIdHelp}</p>
            </div>
          </div>

          <div className="mt-5 grid gap-5">
            <ProjectSummary model={model} copy={copy} />
            <ProjectInventory model={model} copy={copy} />
            <ProjectDiagnostics model={model} copy={copy} />
            <ImportReceipt model={model} copy={copy} />
          </div>

          <button type="submit" className="sr-only" tabIndex={-1} aria-hidden="true" />
        </form>

        <DialogFooter className="flex-col border-t border-(--border-muted) bg-(--surface-panel-subtle) px-6 py-4 sm:flex-row">
          <DialogClose asChild>
            <Button type="button" variant="outline" data-slot="dbt-project-cancel-command">
              {copy.cancelLabel}
            </Button>
          </DialogClose>
          <Button
            type="button"
            variant="outline"
            data-slot="dbt-project-validate-command"
            disabled={!model.canValidate}
            onClick={onValidate}
          >
            {model.phase === 'validating' ? <LoaderCircle className="animate-spin" /> : null}
            {copy.validateLabel}
          </Button>
          <Button
            type="button"
            data-slot="dbt-project-import-command"
            disabled={!model.canImport}
            onClick={onImport}
          >
            {model.phase === 'importing' ? <LoaderCircle className="animate-spin" /> : null}
            {copy.importLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
