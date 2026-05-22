/** Owned concern: render Templates route slots from catalog, parameter state, and preview projection. */
import { AlertTriangle, CheckCircle2, FileCode2, WandSparkles } from 'lucide-react';
import type { ChangeEvent } from 'react';

import { StatusIndicator, ViewHeader } from '../../components/domain';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Textarea } from '../../components/ui/textarea';
import { cn } from '../../components/ui/utils';
import {
  routeWorkbenchFieldClassName,
  routeWorkbenchHeaderBandClassName,
  routeWorkbenchMutedTextClassName,
  routeWorkbenchPanelClassName,
  routeWorkbenchSectionTitleClassName,
  routeWorkbenchSubtleTextClassName,
} from '../../components/workbench/RouteWorkbenchFrame';

import {
  EXECUTION_TEMPLATE_CATALOG,
  type ExecutionTemplateDefinition,
  type ExecutionTemplateParameterDefinition,
  type ExecutionTemplateParameterValues,
  type ExecutionTemplatePreview,
  resolveExecutionTemplatePreview,
} from './templatesViewModel';
import { TemplateMonacoPreviewPanel } from './TemplateMonacoPreviewPanel';

type TemplatesRouteWorkbenchProps = Readonly<{
  selectedTemplate: ExecutionTemplateDefinition;
  parameterValues: ExecutionTemplateParameterValues;
  onParameterChange: (parameterId: string, value: string) => void;
  onTemplateSelect: (templateId: string) => void;
}>;

export function TemplatesViewHeader() {
  return (
    <div data-slot="templates-view-header-band" className={routeWorkbenchHeaderBandClassName}>
      <ViewHeader
        className="border-0 bg-transparent px-0 py-0"
        title="Templates"
        icon={<WandSparkles className="size-6 text-[var(--status-info)]" />}
        subtitle="Generate governed execution scaffolds for provider-facing review."
        actions={
          <Badge variant="outline" className={cn(routeWorkbenchFieldClassName, 'text-xs')}>
            Profiles: {EXECUTION_TEMPLATE_CATALOG.length}
          </Badge>
        }
      />
    </div>
  );
}

export function TemplatesRouteWorkbench({
  selectedTemplate,
  parameterValues,
  onParameterChange,
  onTemplateSelect,
}: TemplatesRouteWorkbenchProps) {
  const preview = resolveExecutionTemplatePreview(selectedTemplate, parameterValues);

  return (
    <div data-slot="templates-workbench" className="grid gap-4 xl:grid-cols-[22rem_minmax(0,1fr)]">
      <TemplateCatalog selectedTemplate={selectedTemplate} onTemplateSelect={onTemplateSelect} />
      <div className="grid gap-4">
        <TemplateParameterForm
          selectedTemplate={selectedTemplate}
          parameterValues={parameterValues}
          preview={preview}
          onParameterChange={onParameterChange}
        />
        <GeneratedSourcePanel selectedTemplate={selectedTemplate} preview={preview} />
      </div>
    </div>
  );
}

function TemplateCatalog({
  selectedTemplate,
  onTemplateSelect,
}: Readonly<{
  selectedTemplate: ExecutionTemplateDefinition;
  onTemplateSelect: (templateId: string) => void;
}>) {
  return (
    <Card data-slot="templates-catalog" className={cn(routeWorkbenchPanelClassName, 'p-4')}>
      <div className={routeWorkbenchSectionTitleClassName}>Template catalog</div>
      <div className="grid gap-2">
        {EXECUTION_TEMPLATE_CATALOG.map((template) => {
          const isSelected = template.id === selectedTemplate.id;

          return (
            <Button
              key={template.id}
              type="button"
              variant={isSelected ? 'default' : 'outline'}
              className={cn(
                'h-auto justify-start whitespace-normal px-3 py-3 text-left',
                !isSelected && routeWorkbenchFieldClassName
              )}
              onClick={() => onTemplateSelect(template.id)}
            >
              <span className="flex min-w-0 flex-col gap-1">
                <span className="font-semibold">{template.label}</span>
                <span className="text-xs opacity-80">{template.provider}</span>
              </span>
            </Button>
          );
        })}
      </div>
    </Card>
  );
}

function TemplateParameterForm({
  selectedTemplate,
  parameterValues,
  preview,
  onParameterChange,
}: Readonly<{
  selectedTemplate: ExecutionTemplateDefinition;
  parameterValues: ExecutionTemplateParameterValues;
  preview: ExecutionTemplatePreview;
  onParameterChange: (parameterId: string, value: string) => void;
}>) {
  const errorsByParameter = new Map(preview.errors.map((error) => [error.parameterId, error]));

  return (
    <Card data-slot="templates-parameter-form" className={cn(routeWorkbenchPanelClassName, 'p-4')}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="font-semibold text-[var(--text-strong)]">{selectedTemplate.label}</h2>
          <p className={cn('mt-1 text-sm', routeWorkbenchMutedTextClassName)}>
            {selectedTemplate.description}
          </p>
        </div>
        <StatusIndicator
          state={preview.kind === 'ready' ? 'ok' : 'warning'}
          label={preview.kind === 'ready' ? 'Preview ready' : 'Preview blocked'}
          icon={
            preview.kind === 'ready' ? (
              <CheckCircle2 className="size-3" />
            ) : (
              <AlertTriangle className="size-3" />
            )
          }
        />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        {selectedTemplate.parameters.map((parameter) => (
          <TemplateParameterField
            key={parameter.id}
            parameter={parameter}
            value={parameterValues[parameter.id] ?? parameter.defaultValue}
            errorMessage={errorsByParameter.get(parameter.id)?.message}
            onParameterChange={onParameterChange}
          />
        ))}
      </div>
    </Card>
  );
}

function TemplateParameterField({
  parameter,
  value,
  errorMessage,
  onParameterChange,
}: Readonly<{
  parameter: ExecutionTemplateParameterDefinition;
  value: string;
  errorMessage?: string;
  onParameterChange: (parameterId: string, value: string) => void;
}>) {
  const fieldId = `template-parameter-${parameter.id}`;
  const commonProps = {
    id: fieldId,
    name: parameter.id,
    value,
    'aria-invalid': errorMessage ? true : undefined,
    onChange: (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      onParameterChange(parameter.id, event.target.value);
    },
  };

  return (
    <label className="grid gap-2" htmlFor={fieldId}>
      <span className="text-sm font-medium text-[var(--text-strong)]">{parameter.label}</span>
      <span className={cn('text-xs', routeWorkbenchSubtleTextClassName)}>
        {parameter.description}
      </span>
      {parameter.inputKind === 'textarea' ? (
        <Textarea {...commonProps} className={cn(routeWorkbenchFieldClassName, 'min-h-28')} />
      ) : (
        <Input {...commonProps} className={routeWorkbenchFieldClassName} />
      )}
      {errorMessage ? (
        <span className="text-xs text-[var(--status-warning)]">{errorMessage}</span>
      ) : null}
    </label>
  );
}

function GeneratedSourcePanel({
  selectedTemplate,
  preview,
}: Readonly<{
  selectedTemplate: ExecutionTemplateDefinition;
  preview: ExecutionTemplatePreview;
}>) {
  if (preview.kind === 'ready') {
    return (
      <TemplateMonacoPreviewPanel
        exportFileName={preview.exportFileName}
        language={selectedTemplate.exportFileName.endsWith('.yaml') ? 'yaml' : 'sql'}
        provider={selectedTemplate.provider}
        source={preview.source}
      />
    );
  }

  return (
    <Card data-slot="templates-preview-panel" className={cn(routeWorkbenchPanelClassName, 'p-4')}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="font-semibold text-[var(--text-strong)]">Generated preview</h2>
          <p className={cn('mt-1 text-sm', routeWorkbenchMutedTextClassName)}>
            Read-only source preview for {selectedTemplate.provider} export review.
          </p>
        </div>
        <Badge variant="outline" className={cn(routeWorkbenchFieldClassName, 'text-xs')}>
          {preview.exportFileName}
        </Badge>
      </div>

      <div
        data-slot="templates-validation-state"
        className={cn(routeWorkbenchFieldClassName, 'mt-4 rounded-md p-4')}
      >
        <div className="flex items-start gap-3">
          <FileCode2 className="mt-0.5 size-4 text-[var(--status-warning)]" />
          <div>
            <p className="font-medium text-[var(--text-strong)]">Preview blocked</p>
            <p className={cn('mt-1 text-sm', routeWorkbenchMutedTextClassName)}>
              Complete the required parameters before generated source is shown.
            </p>
          </div>
        </div>
      </div>
    </Card>
  );
}
