/** Owned concern: render Templates route slots from catalog, parameter state, and preview projection.
 * Why: catalog and form presentation delegate generated-source states to their existing adapter.
 * Corner: styling cannot change immediate validation, profile values or the read-only preview boundary.
 */
import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import type { ChangeEvent } from 'react';
import { StatusIndicator } from '../../components/domain/StatusIndicator';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { cn } from '../../components/ui/utils';
import {
  EXECUTION_TEMPLATE_CATALOG,
  type ExecutionTemplateDefinition,
  type ExecutionTemplateParameterDefinition,
  type ExecutionTemplateParameterValues,
  type ExecutionTemplatePreview,
  resolveExecutionTemplatePreview,
} from './templatesViewModel';
import { GeneratedSourcePanel } from './TemplateMonacoPreviewPanel';
import styles from './templatesPresentation.module.css';

type TemplatesRouteWorkbenchProps = Readonly<{
  selectedTemplate: ExecutionTemplateDefinition;
  parameterValues: ExecutionTemplateParameterValues;
  onParameterChange: (parameterId: string, value: string) => void;
  onTemplateSelect: (templateId: string) => void;
}>;

export function TemplatesRouteWorkbench({
  selectedTemplate,
  parameterValues,
  onParameterChange,
  onTemplateSelect,
}: TemplatesRouteWorkbenchProps) {
  const preview = resolveExecutionTemplatePreview(selectedTemplate, parameterValues);
  return (
    <div data-slot="templates-workbench" className={styles.workbench}>
      <TemplateCatalog selectedTemplate={selectedTemplate} onTemplateSelect={onTemplateSelect} />
      <div className={styles.content}>
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
    <Card data-slot="templates-catalog" className={styles.panel}>
      <h2 className={styles.catalogHeading}>Template catalog</h2>
      <div className={styles.catalogProfiles}>
        {EXECUTION_TEMPLATE_CATALOG.map((template) => (
          <Button
            key={template.id}
            type="button"
            aria-pressed={template.id === selectedTemplate.id}
            variant="outline"
            className={styles.catalogItem}
            onClick={() => onTemplateSelect(template.id)}
          >
            <span className={styles.catalogLabel}>
              <span className={styles.fieldLabel}>{template.label}</span>
              <span className={styles.helper}>{template.provider}</span>
            </span>
          </Button>
        ))}
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
    <Card data-slot="templates-parameter-form" className={styles.panel}>
      <div className={styles.sectionHeader}>
        <div>
          <h2 className={styles.sectionTitle}>{selectedTemplate.label}</h2>
          <p className={styles.description}>{selectedTemplate.description}</p>
        </div>
        <StatusIndicator
          state={preview.kind === 'ready' ? 'ok' : 'error'}
          label={preview.kind === 'ready' ? 'Preview ready' : 'Preview blocked'}
          icon={
            preview.kind === 'ready' ? (
              <CheckCircle2 aria-hidden="true" className={styles.statusIcon} />
            ) : (
              <AlertTriangle aria-hidden="true" className={styles.statusIcon} />
            )
          }
        />
      </div>
      <div className={styles.parameterGrid}>
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
  const helpId = `${fieldId}-help`;
  const errorId = `${fieldId}-error`;
  const commonProps = {
    id: fieldId,
    name: parameter.id,
    value,
    'aria-invalid': errorMessage ? true : undefined,
    'aria-describedby': errorMessage ? `${helpId} ${errorId}` : helpId,
    onChange: (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      onParameterChange(parameter.id, event.target.value);
    },
  };
  return (
    <div className={styles.parameterField}>
      <Label className={styles.fieldLabel} htmlFor={fieldId}>
        {parameter.label}
      </Label>
      <span id={helpId} className={styles.helper}>
        {parameter.description}
      </span>
      {parameter.inputKind === 'textarea' ? (
        <Textarea {...commonProps} className={cn(styles.control, styles.textarea)} />
      ) : (
        <Input {...commonProps} className={styles.control} />
      )}
      {errorMessage ? (
        <span id={errorId} className={styles.fieldError}>
          {errorMessage}
        </span>
      ) : null}
    </div>
  );
}
