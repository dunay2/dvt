/** Owned concern: adapt Templates route command state into the execution-template workbench.
 * Why: the route owns its shared header and profile-local values, while preview rules stay in the model.
 * Corner: changing presentation or profile cannot discard another profile's captured parameters.
 * Command/query rails: `SelectExecutionTemplateProfile`, `UpdateExecutionTemplateParameterValue`.
 */
import { WandSparkles } from 'lucide-react';
import { useState } from 'react';

import { createCompleteRouteBootstrapPresentation } from '../bootstrap/routeBootstrapContract';
import { usePublishedRouteBootstrap } from '../bootstrap/usePublishedRouteBootstrap';
import { ViewHeader } from '../components/domain/ViewHeader';
import { Badge } from '../components/ui/badge';
import { RouteWorkbenchFrame } from '../components/workbench/RouteWorkbenchFrame';

import { TemplatesRouteWorkbench } from './templates/TemplatesRouteWorkbench';
import styles from './templates/templatesPresentation.module.css';
import {
  EXECUTION_TEMPLATE_CATALOG,
  createDefaultExecutionTemplateValues,
  resolveExecutionTemplateSelection,
} from './templates/templatesViewModel';

export function TemplatesViewHeader() {
  return (
    <div data-slot="templates-view-header-band" className={styles.headerBand}>
      <ViewHeader
        className={styles.viewHeader}
        title="Templates"
        icon={<WandSparkles aria-hidden="true" className={styles.headerIcon} />}
        subtitle="Generate governed execution scaffolds for provider-facing review."
        actions={
          <Badge variant="outline" className={styles.fileName}>
            Profiles: {EXECUTION_TEMPLATE_CATALOG.length}
          </Badge>
        }
      />
    </div>
  );
}

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
      bodyClassName={styles.routeBody}
      bodyContainerClassName={styles.bodyContainer}
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
