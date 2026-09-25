/** Translate initial physical-source selection into the same facts used for transformed operands. */
import { hasSameConnectionRef } from '@dvt/postgres-projection';
import type { CanvasDvtCompositionInput } from './canvasDvtCompositionInputCatalog';
import type { CanvasOperationFacts } from './canvasRelationalOperationChoices';
import { hasCompatibleCanvasDvtJoinFields } from './canvasDvtJoinTypeAdmission';

export function sourceOperationFacts(
  args: Readonly<{
    inputs: readonly CanvasDvtCompositionInput[];
    readOnly: boolean;
    predicateAvailable: boolean;
    unionAllAvailable: boolean;
    unionDistinctAvailable?: boolean;
    intersectDistinctAvailable?: boolean;
    exceptDistinctAvailable?: boolean;
    intersectAllAvailable?: boolean;
    exceptAllAvailable?: boolean;
  }>
): CanvasOperationFacts {
  const connection = args.inputs[0]?.sourceRef.connectionRef;
  return {
    readOnly: args.readOnly,
    inputCount: args.inputs.length,
    predicateAvailable: args.predicateAvailable,
    sameConnection:
      connection != null &&
      connection.provider === 'postgres' &&
      args.inputs.every((input) => hasSameConnectionRef(connection, input.sourceRef.connectionRef)),
    completeSchema: args.inputs.every(
      (input) =>
        input.fields.length > 0 && input.fields.every((field) => field.joinDataType != null)
    ),
    comparableFields: args.inputs.some((left, index) =>
      args.inputs
        .slice(index + 1)
        .some((right) => hasCompatibleCanvasDvtJoinFields(left.fields, right.fields))
    ),
    sets: {
      union_all: args.unionAllAvailable,
      union_distinct: args.unionDistinctAvailable ?? args.unionAllAvailable,
      intersect_distinct: args.intersectDistinctAvailable ?? args.unionAllAvailable,
      except_distinct: args.exceptDistinctAvailable ?? args.unionAllAvailable,
      intersect_all: args.intersectAllAvailable ?? args.unionAllAvailable,
      except_all: args.exceptAllAvailable ?? args.unionAllAvailable,
    },
  };
}
