/** Resolve selection against the current analysis index, including a just-retired identity. */
import { useContext } from 'react';
import { SubstraitAnalysisError } from '@dvt/substrait-analysis';
import { CanvasRelationAnalysisContext } from './CanvasRelationAnalysisContext';

export function useSelectedRelation(relationId: string | null) {
  const analysis = useContext(CanvasRelationAnalysisContext);
  if (
    relationId == null ||
    analysis?.document == null ||
    analysis.error != null ||
    analysis.revision !== analysis.session.revision
  )
    return null;
  try {
    return analysis.session.locate(relationId, analysis.revision);
  } catch (error) {
    if (error instanceof SubstraitAnalysisError && error.code === 'unknown_relation') return null;
    throw error;
  }
}
