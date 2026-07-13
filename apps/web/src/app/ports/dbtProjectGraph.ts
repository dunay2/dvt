/** Owned concern: define the browser query port for a file-authoritative dbt graph. */
import type { CanvasAuthoringAuthorityBinding, DbtProjectGraphProjection } from '@dvt/contracts';

export type DbtProjectFilesAuthorityBinding = CanvasAuthoringAuthorityBinding &
  Readonly<{
    authority: {
      kind: 'dbt-project-files';
      projectRoot: string;
    };
  }>;

export interface IDbtProjectGraphQueryPort {
  getProjectGraph(
    authorityBinding: DbtProjectFilesAuthorityBinding
  ): Promise<DbtProjectGraphProjection>;
}
