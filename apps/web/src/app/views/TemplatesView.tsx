/** Owned concern: adapt Templates route command state into the execution-template workbench. */
import { useState } from 'react';

import { createCompleteRouteBootstrapPresentation } from '../bootstrap/routeBootstrapContract';
import { usePublishedRouteBootstrap } from '../bootstrap/usePublishedRouteBootstrap';
import { RouteWorkbenchFrame } from '../components/workbench/RouteWorkbenchFrame';

import { TemplatesRouteWorkbench, TemplatesViewHeader } from './templates/TemplatesRouteWorkbench';
import {
  createDefaultExecutionTemplateValues,
  resolveExecutionTemplateSelection,
} from './templates/templatesViewModel';

export default function TemplatesView() {
  usePublishedRouteBootstrap(
    'dvt.templates',
    createCompleteRouteBootstrapPresentation('Templates route is ready')
  );
  const [selectedTemplateId, setSelectedTemplateId] = useState('snowflake-task');
  const selectedTemplate = resolveExecutionTemplateSelection(selectedTemplateId);
  const [parameterValuesByTemplate, setParameterValuesByTemplate] = useState<
    Record<string, Record<string, string>>
  >(() => ({
    [selectedTemplate.id]: createDefaultExecutionTemplateValues(selectedTemplate),
  }));
  const parameterValues =
    parameterValuesByTemplate[selectedTemplate.id] ??
    createDefaultExecutionTemplateValues(selectedTemplate);

  function handleTemplateSelect(templateId: string): void {
    const nextTemplate = resolveExecutionTemplateSelection(templateId);
    setSelectedTemplateId(nextTemplate.id);
    setParameterValuesByTemplate((current) => ({
      ...current,
      [nextTemplate.id]:
        current[nextTemplate.id] ?? createDefaultExecutionTemplateValues(nextTemplate),
    }));
  }

  function handleParameterChange(parameterId: string, value: string): void {
    setParameterValuesByTemplate((current) => ({
      ...current,
      [selectedTemplate.id]: {
        ...parameterValues,
        [parameterId]: value,
      },
    }));
  }

  return (
    <RouteWorkbenchFrame
      header={<TemplatesViewHeader />}
      bodyContainerClassName="mx-auto max-w-7xl"
      slots={{
        primarySurface: (
          <TemplatesRouteWorkbench
            selectedTemplate={selectedTemplate}
            parameterValues={parameterValues}
            onParameterChange={handleParameterChange}
            onTemplateSelect={handleTemplateSelect}
          />
        ),
      }}
    />
  );
}
