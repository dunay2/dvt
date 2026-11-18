/** Render typed template parameters and associate each validation message with its field. */
import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import type { ChangeEvent } from 'react';
import { StatusIndicator } from '../../components/domain/StatusIndicator';
import { Card } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { cn } from '../../components/ui/utils';
import { acceptsProjectModel } from './templateParameters';
import { templatesCopy } from './templatesCopy';
import type {
  ExecutionTemplateDefinition,
  ExecutionTemplateParameterDefinition,
  ExecutionTemplateParameterValues,
  ExecutionTemplatePreview,
} from './templatesViewModel';
import styles from './templatesPresentation.module.css';

export function TemplateParameterForm({
  selectedTemplate,
  parameterValues,
  preview,
  onParameterChange,
  onRelationFocus,
}: Readonly<{
  selectedTemplate: ExecutionTemplateDefinition;
  parameterValues: ExecutionTemplateParameterValues;
  preview: ExecutionTemplatePreview;
  onParameterChange: (parameterId: string, value: string) => void;
  onRelationFocus: (field: string) => void;
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
          label={
            preview.kind === 'ready'
              ? templatesCopy(selectedTemplate.language).ready
              : templatesCopy(selectedTemplate.language).blocked
          }
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
            onRelationFocus={onRelationFocus}
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
  onRelationFocus,
}: Readonly<{
  parameter: ExecutionTemplateParameterDefinition;
  value: string;
  errorMessage?: string;
  onParameterChange: (parameterId: string, value: string) => void;
  onRelationFocus: (field: string) => void;
}>) {
  const fieldId = `template-parameter-${parameter.id}`;
  const helpId = `${fieldId}-help`;
  const errorId = `${fieldId}-error`;
  const commonProps = {
    id: fieldId,
    name: parameter.id,
    onFocus: () => {
      if (acceptsProjectModel(parameter)) {
        onRelationFocus(parameter.id);
      }
    },
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
