/** Owned concern: resolve one root-package dbt resource authorized for YAML description editing. */
import type { DbtProjectGraphProjection } from '@dvt/contracts';

import {
  DbtYamlDescriptionResourceNotFoundError,
  DbtYamlDescriptionResourceUnsupportedError,
  type DbtYamlDescriptionResourceContext,
  type DbtYamlDescriptionResourceIdentity,
  type IDbtYamlDescriptionResourceResolver,
} from '../../ports/dbtYamlDescriptionEdit.js';
import type { ProjectDbtGraphFromFilesUseCase } from '../projectDbtGraphFromFilesUseCase.js';

const EDITABLE_RESOURCE_TYPES = new Set<DbtYamlDescriptionResourceIdentity['resourceType']>([
  'model',
  'seed',
  'snapshot',
  'source',
  'exposure',
  'metric',
]);

export class DbtYamlDescriptionResourceResolver implements IDbtYamlDescriptionResourceResolver {
  public constructor(
    private readonly deps: Readonly<{
      projectGraph: Pick<ProjectDbtGraphFromFilesUseCase, 'execute'>;
    }>
  ) {}

  public async resolve(
    input: Parameters<IDbtYamlDescriptionResourceResolver['resolve']>[0]
  ): Promise<DbtYamlDescriptionResourceContext> {
    const projection = await this.deps.projectGraph.execute({
      scope: input.scope,
      canvasId: input.canvasId,
    });
    const resource = projection.nodes.find((node) => node.uniqueId === input.resourceUniqueId);
    if (!resource) throw new DbtYamlDescriptionResourceNotFoundError(input.resourceUniqueId);

    const authority = projection.authorityBinding.authority;
    const supportsDescriptionEdit =
      resource.visualEditability.status === 'partially_editable' &&
      resource.visualEditability.operations.includes('yaml_description');
    if (
      authority.kind !== 'dbt-project-files' ||
      projection.projectRevision.projectName === undefined ||
      resource.packageName !== projection.projectRevision.projectName ||
      !isEditableResourceType(resource.resourceType) ||
      resource.descriptionFilePath === undefined ||
      !supportsDescriptionEdit
    ) {
      throw new DbtYamlDescriptionResourceUnsupportedError(input.resourceUniqueId);
    }

    return {
      resource: {
        uniqueId: resource.uniqueId,
        resourceType: resource.resourceType,
        name: resource.name,
        packageName: resource.packageName,
        ...(resource.sourceName === undefined ? {} : { sourceName: resource.sourceName }),
      },
      path: joinProjectPath(authority.projectRoot, resource.descriptionFilePath),
    };
  }
}

function isEditableResourceType(
  value: DbtProjectGraphProjection['nodes'][number]['resourceType']
): value is DbtYamlDescriptionResourceIdentity['resourceType'] {
  return EDITABLE_RESOURCE_TYPES.has(value as DbtYamlDescriptionResourceIdentity['resourceType']);
}

function joinProjectPath(projectRoot: string, descriptionFilePath: string): string {
  const normalizedFilePath = descriptionFilePath.replaceAll('\\', '/').replace(/^\/+|\/+$/gu, '');
  const segments = normalizedFilePath.split('/');
  if (
    normalizedFilePath.length === 0 ||
    segments.some((segment) => segment.length === 0 || segment === '.' || segment === '..')
  ) {
    throw new DbtYamlDescriptionResourceUnsupportedError(descriptionFilePath);
  }
  return projectRoot === '.' ? normalizedFilePath : `${projectRoot}/${normalizedFilePath}`;
}
