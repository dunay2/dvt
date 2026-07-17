/** Owned concern: define exact dbt YAML description-edit contracts and failure vocabulary. */

export const DBT_YAML_DESCRIPTION_RESOURCE_TYPE = {
  model: 'model',
  seed: 'seed',
  snapshot: 'snapshot',
  source: 'source',
  exposure: 'exposure',
  metric: 'metric',
} as const;

export type DbtYamlDescriptionResourceType =
  (typeof DBT_YAML_DESCRIPTION_RESOURCE_TYPE)[keyof typeof DBT_YAML_DESCRIPTION_RESOURCE_TYPE];

export type DbtYamlDescriptionResourceIdentity = Readonly<{
  uniqueId: string;
  resourceType: DbtYamlDescriptionResourceType;
  name: string;
  sourceName?: string;
}>;

export type DbtYamlDescriptionMutation = Readonly<{
  content: string;
  previousDescription: string | null;
  nextDescription: string | null;
}>;

export interface IDbtYamlDescriptionMutator {
  mutate(
    input: Readonly<{
      content: string;
      resource: DbtYamlDescriptionResourceIdentity;
      nextDescription: string | null;
    }>
  ): DbtYamlDescriptionMutation;
}

export class DbtYamlDescriptionResourceNotFoundError extends Error {
  public constructor(readonly resourceUniqueId: string) {
    super(`dbt YAML resource was not found: ${resourceUniqueId}`);
    this.name = 'DbtYamlDescriptionResourceNotFoundError';
  }
}

export class DbtYamlDescriptionResourceAmbiguousError extends Error {
  public constructor(readonly resourceUniqueId: string) {
    super(`dbt YAML resource is ambiguous: ${resourceUniqueId}`);
    this.name = 'DbtYamlDescriptionResourceAmbiguousError';
  }
}

export class DbtYamlDescriptionDocumentInvalidError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = 'DbtYamlDescriptionDocumentInvalidError';
  }
}
