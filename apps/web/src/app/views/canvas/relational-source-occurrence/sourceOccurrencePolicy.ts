/** Admit a new occurrence from the already derived output, never from a PostgreSQL tree profile. */
import type { RelationAnalysisResult } from '@dvt/substrait-analysis';
import type { CanvasRelationAnalysisSession } from '../canvasRelationAnalysisSession';
import type { CanvasDvtCompositionInput } from '../canvasDvtCompositionInputCatalog';
import { conditionDataType } from '../canvasSelectedJoin';
import type { CanvasRelationalOperation } from '../canvasRelationalOperationChoices';
import { isCanvasSetOperation } from '../canvasRelationalOperationChoices';

export type SourceOccurrenceRejection =
  'read_only' | 'unsupported' | 'unavailable' | 'incompatible';

export function sourceOccurrenceAppendRejection(
  args: Readonly<{
    editable: boolean;
    output: RelationAnalysisResult | null;
    session: CanvasRelationAnalysisSession | null;
    revision: number;
    input: CanvasDvtCompositionInput | undefined;
    operation?: CanvasRelationalOperation | null;
  }>
): SourceOccurrenceRejection | null {
  if (!args.editable) return 'read_only';
  if (args.input == null) return 'unavailable';
  if (args.output == null || args.session == null) return 'unsupported';
  try {
    args.session.matchingSources(args.input.sourceRef, args.revision);
  } catch {
    return 'unavailable';
  }
  const types = args.input.fields.map((field) => field.joinDataType);
  if (types.length === 0 || types.some((type) => type == null)) return 'incompatible';
  if (args.operation === 'cross_join' || args.operation === 'projection' || args.operation == null)
    return null;
  const outputs = args.output.fields.map((field) => conditionDataType(field.type.kind.case));
  const compatible = isCanvasSetOperation(args.operation)
    ? outputs.length === types.length && outputs.every((type, index) => type === types[index])
    : outputs.some((type) => type != null && types.includes(type));
  return compatible ? null : 'incompatible';
}
