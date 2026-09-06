export const DVT_TRACEABILITY_FACET_PRODUCER =
  'https://github.com/dunay2/dvt/tree/main/packages/@dvt/traceability-service' as const;

export const OPENLINEAGE_SQL_JOB_FACET_SCHEMA_URL =
  'https://openlineage.io/spec/facets/1-0-0/SqlJobFacet.json' as const;

export interface LineageFacetMetadata<TSchemaUrl extends string> {
  _producer: typeof DVT_TRACEABILITY_FACET_PRODUCER;
  _schemaURL: TSchemaUrl;
}

export function buildLineageFacetMetadata<TSchemaUrl extends string>(
  schemaUrl: TSchemaUrl
): LineageFacetMetadata<TSchemaUrl> {
  return {
    _producer: DVT_TRACEABILITY_FACET_PRODUCER,
    _schemaURL: schemaUrl,
  };
}
