/** Owned concern: expose governed SQL transformation templates for Canvas insertion. */
import type { NodeKindRegistration } from '../../plugins/nodeTypeContracts';
import type { CanvasAuthoringNodeSeed } from './canvasAuthoringNodeCommand';

const SQL_TRANSFORM_KIND = 'dvt:sql_transform';

export type CanvasTransformationTemplate = Readonly<{
  id: string;
  label: string;
  description: string;
  sql: string;
  searchText: string;
}>;

export type CanvasTransformationTemplateOption = Readonly<{
  id: string;
  registration: NodeKindRegistration;
  template: CanvasTransformationTemplate;
  seed: CanvasAuthoringNodeSeed;
}>;

const TRANSFORMATION_TEMPLATES: readonly CanvasTransformationTemplate[] = [
  {
    id: 'filter-rows',
    label: 'Filter rows',
    description: 'Start from one source and constrain the records used downstream.',
    sql: 'select *\nfrom {{ source }}\nwhere {{ condition }}',
    searchText: 'filter rows where source condition clean narrow subset',
  },
  {
    id: 'join-sources',
    label: 'Join sources',
    description: 'Combine two upstream sources with an explicit join key.',
    sql: 'select\n  left_source.*,\n  right_source.*\nfrom {{ left_source }} left_source\njoin {{ right_source }} right_source\n  on left_source.{{ join_key }} = right_source.{{ join_key }}',
    searchText: 'join sources combine lookup dimension fact relationship key',
  },
  {
    id: 'aggregate-metrics',
    label: 'Aggregate metrics',
    description: 'Group records and calculate a business metric for reporting.',
    sql: 'select\n  {{ group_by_column }},\n  count(*) as record_count\nfrom {{ source }}\ngroup by {{ group_by_column }}',
    searchText: 'aggregate metrics group by count sum report measure',
  },
];

function buildTemplateSeed(template: CanvasTransformationTemplate): CanvasAuthoringNodeSeed {
  return {
    namePrefix: template.label,
    tags: [`template:${template.id}`],
    metadata: {
      transformationTemplateId: template.id,
      transformationTemplateLabel: template.label,
      transformationTemplateDescription: template.description,
      sql: template.sql,
      config: {
        sql: template.sql,
      },
    },
  };
}

export function buildCanvasTransformationTemplateCatalog(
  nodeKinds: readonly NodeKindRegistration[]
): readonly CanvasTransformationTemplateOption[] {
  const sqlTransformRegistration = nodeKinds.find(
    (registration) => registration.kind === SQL_TRANSFORM_KIND
  );
  if (sqlTransformRegistration == null) {
    return [];
  }

  return TRANSFORMATION_TEMPLATES.map((template) => ({
    id: template.id,
    registration: sqlTransformRegistration,
    template,
    seed: buildTemplateSeed(template),
  }));
}
