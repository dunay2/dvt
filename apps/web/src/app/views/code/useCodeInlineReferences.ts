/** Project the existing scoped dbt query onto one accepted Code buffer. */
import type { DbtProjectGraphProjection } from '@dvt/contracts';
import { useMemo } from 'react';

import type { FileContent } from '../../ports/workspace';
import { useDbtSelectedModelAnalysisQuery } from '../../queries/dbtSelectedModelAnalysisQueries';
import {
  projectCodeInlineReferences,
  resolveCodeSelectedModel,
  type CodeInlineReferenceProjection,
} from './codeInlineReferences';

export type CodeInlineReferenceState =
  Readonly<{ kind: 'inactive' | 'checking' | 'unavailable' }> | CodeInlineReferenceProjection;

export function useCodeInlineReferences({
  project,
  file,
  value,
  enabled,
}: Readonly<{
  project: DbtProjectGraphProjection | undefined;
  file: FileContent | undefined;
  value: string;
  enabled: boolean;
}>): CodeInlineReferenceState {
  const selectedUniqueId = useMemo(
    () => resolveCodeSelectedModel(project, file?.path),
    [project, file?.path]
  );
  const binding = project?.authorityBinding;
  const acceptedBinding = useMemo(
    () =>
      binding?.authority.kind === 'dbt-project-files'
        ? { ...binding, authority: binding.authority }
        : undefined,
    [binding]
  );
  const analysis = useDbtSelectedModelAnalysisQuery(acceptedBinding, selectedUniqueId, {
    enabled: enabled && project?.freshness === 'fresh',
    revisionToken:
      project == null
        ? undefined
        : `${project.analysisSha256}:${project.projectRevision.contentSetSha256}`,
  });
  return useMemo<CodeInlineReferenceState>(() => {
    if (project == null || file == null) return { kind: 'inactive' };
    if (selectedUniqueId == null)
      return file.language.toLowerCase() === 'sql'
        ? { kind: 'text-only', reason: 'model-unresolved' }
        : { kind: 'inactive' };
    if (!enabled || file.content !== value) return { kind: 'text-only', reason: 'dirty-buffer' };
    if (analysis.isError) return { kind: 'unavailable' };
    if (analysis.data == null) return { kind: 'checking' };
    return projectCodeInlineReferences({ project, analysis: analysis.data, file, value });
  }, [project, selectedUniqueId, file, value, enabled, analysis.data, analysis.isError]);
}
