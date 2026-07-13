/** Owned concern: resolve explicit Canvas semantic authority from route parameters. */
import { CanvasAuthoringAuthorityBindingSchema } from '@dvt/contracts';

import type { DbtProjectFilesAuthorityBinding } from '../../ports/dbtProjectGraph';

export type CanvasRouteAuthorityResolution =
  | Readonly<{ kind: 'graph-draft' }>
  | Readonly<{ kind: 'dbt-project-files'; binding: DbtProjectFilesAuthorityBinding }>
  | Readonly<{ kind: 'invalid'; message: string }>;

const FILE_AUTHORITY = 'dbt-project-files';

export function resolveCanvasRouteAuthority(
  searchParams: URLSearchParams
): CanvasRouteAuthorityResolution {
  const requestedAuthority = searchParams.get('authority');
  const projectRoot = searchParams.get('projectRoot');

  if (requestedAuthority === null && projectRoot === null) {
    return { kind: 'graph-draft' };
  }

  if (requestedAuthority !== FILE_AUTHORITY) {
    return {
      kind: 'invalid',
      message: 'The requested Canvas authority is not supported.',
    };
  }

  const parsed = CanvasAuthoringAuthorityBindingSchema.safeParse({
    schemaVersion: 'canvas-authoring-authority-binding.v1',
    canvasId: searchParams.get('canvasId'),
    authority: {
      kind: FILE_AUTHORITY,
      projectRoot,
    },
  });
  if (!parsed.success || parsed.data.authority.kind !== FILE_AUTHORITY) {
    return {
      kind: 'invalid',
      message: 'The file-backed Canvas authority binding is invalid.',
    };
  }

  return {
    kind: FILE_AUTHORITY,
    binding: parsed.data as DbtProjectFilesAuthorityBinding,
  };
}
