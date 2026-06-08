/** Owned concern: expose governed SQL output target templates for Canvas insertion. */
import type { NodeKindRegistration } from '../../plugins/nodeTypeContracts';
import type { CanvasAuthoringNodeSeed } from './canvasAuthoringNodeCommand';

const DVT_SINK_KIND = 'dvt:sink';

export type CanvasOutputTargetTemplate = Readonly<{
  id: string;
  label: string;
  description: string;
  schema: string;
  table: string;
  materialization: 'table' | 'view';
  writeMode: 'replace' | 'append';
  searchText: string;
}>;

export type CanvasOutputTargetTemplateOption = Readonly<{
  id: string;
  registration: NodeKindRegistration;
  template: CanvasOutputTargetTemplate;
  seed: CanvasAuthoringNodeSeed;
}>;

const OUTPUT_TARGET_TEMPLATES: readonly CanvasOutputTargetTemplate[] = [
  {
    id: 'analytics-table-replace',
    label: 'Analytics table',
    description: 'Write a replaceable analytics table for downstream models.',
    schema: 'analytics',
    table: 'transformed_output',
    materialization: 'table',
    writeMode: 'replace',
    searchText: 'analytics table replace warehouse output target destination',
  },
  {
    id: 'reporting-view-replace',
    label: 'Reporting view',
    description: 'Expose a reporting view without appending rows.',
    schema: 'reporting',
    table: 'transformed_view',
    materialization: 'view',
    writeMode: 'replace',
    searchText: 'reporting view replace dashboard output target destination',
  },
  {
    id: 'analytics-table-append',
    label: 'Append fact table',
    description: 'Append transformed records into an analytics fact table.',
    schema: 'analytics',
    table: 'fact_transformed_events',
    materialization: 'table',
    writeMode: 'append',
    searchText: 'append fact table incremental analytics output target destination',
  },
];

function buildOutputTargetSeed(template: CanvasOutputTargetTemplate): CanvasAuthoringNodeSeed {
  return {
    namePrefix: template.label,
    tags: [`target:${template.id}`],
    metadata: {
      outputTargetTemplateId: template.id,
      outputTargetTemplateLabel: template.label,
      outputTargetTemplateDescription: template.description,
      config: {
        schema: template.schema,
        table: template.table,
        materialization: template.materialization,
        writeMode: template.writeMode,
      },
    },
  };
}

export function buildCanvasOutputTargetTemplateCatalog(
  nodeKinds: readonly NodeKindRegistration[]
): readonly CanvasOutputTargetTemplateOption[] {
  const sinkRegistration = nodeKinds.find((registration) => registration.kind === DVT_SINK_KIND);
  if (sinkRegistration == null) {
    return [];
  }

  return OUTPUT_TARGET_TEMPLATES.map((template) => ({
    id: template.id,
    registration: sinkRegistration,
    template,
    seed: buildOutputTargetSeed(template),
  }));
}
