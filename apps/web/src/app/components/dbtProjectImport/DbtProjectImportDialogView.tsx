/** Owned concern: render the dbt project import presentation model without transport logic. */
import { AlertCircle, CheckCircle2, FolderInput, LoaderCircle } from 'lucide-react';
import type { FormEvent } from 'react';

import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import {
  Dialog,
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

type DbtProjectImportDialogViewProps = Readonly<{
  open: boolean;
  model: DbtProjectImportPresentationModel;
  onOpenChange: (open: boolean) => void;
  onProjectRootChange: (value: string) => void;
  onCanvasIdChange: (value: string) => void;
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

function ProjectSummary({ model }: Readonly<{ model: DbtProjectImportPresentationModel }>) {
  if (model.project == null || model.inventory == null) {
    return null;
  }

  const metrics = [
    ['Files', `${model.inventory.fileCount} files`],
    ['Included', String(model.inventory.includedFileCount)],
    ['Excluded', String(model.inventory.excludedFileCount)],
    ['Project size', model.inventory.totalBytesLabel],
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
            Adapter:{' '}
            <span className="font-mono text-(--text-default)">{model.project.adapter}</span>
          </p>
        </div>
        <Badge
          variant="outline"
          className={STATUS_TONE_CLASS[model.status.tone]}
          aria-live="polite"
        >
          {model.status.busy ? <LoaderCircle className="animate-spin" /> : null}
          {model.status.label}
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

function ProjectInventory({ model }: Readonly<{ model: DbtProjectImportPresentationModel }>) {
  if (model.inventory == null) {
    return null;
  }

  return (
    <section aria-labelledby="dbt-import-inventory-title">
      <h3
        id="dbt-import-inventory-title"
        className="mb-2 text-sm font-semibold text-(--text-default)"
      >
        Project inventory
      </h3>
      <div className="max-h-52 overflow-auto border-y border-(--border-muted)">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Path</TableHead>
              <TableHead>Classification</TableHead>
              <TableHead>Decision</TableHead>
              <TableHead className="text-right">Size</TableHead>
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
                  <Badge variant="outline">{file.decisionLabel}</Badge>
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

function ProjectDiagnostics({ model }: Readonly<{ model: DbtProjectImportPresentationModel }>) {
  if (model.diagnostics.length === 0 && model.failureMessage == null) {
    return null;
  }

  return (
    <section aria-labelledby="dbt-import-diagnostics-title">
      <h3
        id="dbt-import-diagnostics-title"
        className="mb-2 text-sm font-semibold text-(--text-default)"
      >
        Diagnostics
      </h3>
      <div className="grid gap-2">
        {model.failureMessage == null ? null : (
          <Alert variant="destructive">
            <AlertCircle />
            <AlertTitle>Import request failed</AlertTitle>
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

function ImportReceipt({ model }: Readonly<{ model: DbtProjectImportPresentationModel }>) {
  if (model.receipt == null) {
    return null;
  }

  return (
    <Alert className="border-(--status-success)" data-slot="dbt-project-import-receipt">
      <CheckCircle2 className="text-(--status-success)" />
      <AlertTitle>Project authority established</AlertTitle>
      <AlertDescription>
        <span>{model.receipt.projectedResourceCount} projected resources</span>
        <span>
          Canvas <strong>{model.receipt.canvasId}</strong> at{' '}
          <span className="font-mono">{model.receipt.projectRoot}</span>
        </span>
        <span className="font-mono text-xs">Revision {model.receipt.revision}</span>
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
  onValidate,
  onImport,
}: DbtProjectImportDialogViewProps): JSX.Element {
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
        className="max-h-[min(90vh,54rem)] max-w-5xl overflow-hidden border-(--border-default) bg-(--surface-panel) p-0 text-(--text-default)"
      >
        <DialogHeader className="border-b border-(--border-muted) px-6 py-5 pr-14">
          <DialogTitle className="flex items-center gap-2">
            <FolderInput className="size-5 text-(--accent-default)" />
            Import dbt project
          </DialogTitle>
          <DialogDescription>
            Validate an existing workspace project before establishing file-backed Canvas authority.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="min-h-0 overflow-y-auto px-6 py-5">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="dbt-project-root">Project root</Label>
              <Input
                id="dbt-project-root"
                data-slot="dbt-project-import-root"
                value={model.projectRoot}
                disabled={model.status.busy || model.phase === 'imported'}
                onChange={(event) => onProjectRootChange(event.currentTarget.value)}
                placeholder="analytics/dbt"
                autoComplete="off"
              />
              <p className="text-xs text-(--text-muted)">
                Workspace-relative directory containing dbt_project.yml.
              </p>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="dbt-project-canvas-id">Canvas ID</Label>
              <Input
                id="dbt-project-canvas-id"
                data-slot="dbt-project-import-canvas-id"
                value={model.canvasId}
                disabled={model.status.busy || model.phase === 'imported'}
                onChange={(event) => onCanvasIdChange(event.currentTarget.value)}
                placeholder="warehouse-analytics"
                autoComplete="off"
              />
              <p className="text-xs text-(--text-muted)">
                New Canvas identity; an existing graph-owned Canvas is rejected.
              </p>
            </div>
          </div>

          <div className="mt-5 grid gap-5">
            <ProjectSummary model={model} />
            <ProjectInventory model={model} />
            <ProjectDiagnostics model={model} />
            <ImportReceipt model={model} />
          </div>

          <button type="submit" className="sr-only" tabIndex={-1} aria-hidden="true" />
        </form>

        <DialogFooter className="border-t border-(--border-muted) bg-(--surface-panel-subtle) px-6 py-4">
          <Button
            type="button"
            variant="outline"
            data-slot="dbt-project-validate-command"
            disabled={!model.canValidate}
            onClick={onValidate}
          >
            {model.phase === 'validating' ? <LoaderCircle className="animate-spin" /> : null}
            Validate project
          </Button>
          <Button
            type="button"
            data-slot="dbt-project-import-command"
            disabled={!model.canImport}
            onClick={onImport}
          >
            {model.phase === 'importing' ? <LoaderCircle className="animate-spin" /> : null}
            Import project
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
