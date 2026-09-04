/** Owned concern: project only the admitted pilot, aggregate/window, Join and Set shapes to PostgreSQL. */
import { deparse } from 'pgsql-deparser';

import {
  inspectDvtSubstraitPilotDraft,
  type DvtSubstraitPilotDraft,
  type DvtSubstraitPilotProjection,
} from './canvasDvtSubstraitPilot';
import {
  inspectDvtSubstraitProjectionDraft,
  type DvtSubstraitProjection,
  type DvtSubstraitProjectionDraft,
} from './canvasDvtSubstraitProjection';
import {
  inspectDvtSubstraitPilotAggregationDraft,
  removeDvtSubstraitPilotAggregation,
  type DvtSubstraitPilotAggregationProjection,
} from './canvasDvtSubstraitAggregation';
import {
  inspectDvtSubstraitPilotAggregateWindowDraft,
  removeDvtSubstraitPilotAggregateRowNumber,
  type DvtSubstraitPilotAggregateWindowProjection,
} from './canvasDvtSubstraitAggregateWindow';
import {
  inspectDvtSubstraitPilotWindowDraft,
  removeDvtSubstraitPilotRowNumber,
  type DvtSubstraitPilotWindowProjection,
} from './canvasDvtSubstraitWindow';
import {
  inspectDvtSubstraitInnerJoinGroupedWindowDraft,
  inspectDvtSubstraitInnerJoinGroupingDraft,
  inspectDvtSubstraitInnerJoinDraft,
  inspectDvtSubstraitNInputJoinDraft,
  removeDvtSubstraitInnerJoinGroupedRowNumber,
  removeDvtSubstraitInnerJoinGrouping,
  type DvtSubstraitInnerJoinDraft,
  type DvtSubstraitInnerJoinGroupedWindowProjection,
  type DvtSubstraitInnerJoinGroupingProjection,
  type DvtSubstraitInnerJoinProjection,
  type DvtSubstraitNInputJoinProjection,
} from './canvasDvtSubstraitJoinComposition';
import {
  inspectDvtSubstraitUnionAllGroupedWindowDraft,
  inspectDvtSubstraitUnionAllGroupingDraft,
  inspectDvtSubstraitUnionAllDraft,
  removeDvtSubstraitUnionAllGroupedRowNumber,
  removeDvtSubstraitUnionAllGrouping,
  type DvtSubstraitUnionAllDraft,
  type DvtSubstraitUnionAllGroupedWindowProjection,
  type DvtSubstraitUnionAllGroupingProjection,
  type DvtSubstraitUnionAllProjection,
} from './canvasDvtSubstraitSetComposition';
import {
  pgColumnRef,
  pgCountRows,
  pgFunction,
  pgOrderedRowNumber,
  pgQualifiedColumnRef,
  pgRangeVar,
  pgRowNumber,
  pgRowNumberOverCount,
  pgString,
  pgStringLiteral,
  pgTimestampTzLiteral,
  type PostgresAstNode,
} from './canvasDvtSubstraitPostgresAst';
import { resolveDvtSubstraitFilterPostgresProjection } from './canvasDvtSubstraitFilterPostgresProjection';

export type DvtSubstraitPostgresProjectionErrorCode =
  'unsupported_shape' | 'invalid_source_binding' | 'deparse_failed';

export type DvtSubstraitPostgresSourceBinding = Readonly<{
  schema: string;
  table: string;
}>;

export class DvtSubstraitPostgresProjectionError extends Error {
  constructor(
    public readonly code: DvtSubstraitPostgresProjectionErrorCode,
    message: string,
    options?: ErrorOptions
  ) {
    super(message, options);
    this.name = 'DvtSubstraitPostgresProjectionError';
  }
}

function buildPilotOutputExpression(projection: DvtSubstraitPilotProjection): PostgresAstNode {
  return projection.operations.reduce<PostgresAstNode>(
    (expression, operation) => pgFunction(operation, expression),
    pgColumnRef(projection.inputFieldName)
  );
}

function requireConnectedFieldProjection(
  draft: DvtSubstraitProjectionDraft
): DvtSubstraitProjection {
  const inspection = inspectDvtSubstraitProjectionDraft(draft);
  if (!inspection.ok) {
    throw new DvtSubstraitPostgresProjectionError(
      'unsupported_shape',
      'PostgreSQL projection supports only the admitted connected-field Substrait shape.'
    );
  }
  return inspection.projection;
}

function buildConnectedFieldPostgresAst(
  projection: DvtSubstraitProjection,
  whereClause?: PostgresAstNode
): PostgresAstNode {
  const calculatedExpression = (
    output: DvtSubstraitProjection['outputs'][number]
  ): PostgresAstNode | null => {
    const calculation = output.calculation;
    if (calculation?.kind === 'string-literal') return pgStringLiteral(calculation.value);
    if (calculation?.kind === 'timestamp-literal') return pgTimestampTzLiteral(calculation.value);
    if (calculation?.kind === 'row-number') {
      const orderField = projection.source.fields[calculation.orderSourceOrdinal];
      return orderField == null ? null : pgOrderedRowNumber(orderField.name);
    }
    return null;
  };
  const outputExpression = (output: DvtSubstraitProjection['outputs'][number]): PostgresAstNode => {
    const calculated = calculatedExpression(output);
    if (calculated != null) return calculated;
    if (output.sourceFieldName == null) {
      throw new DvtSubstraitPostgresProjectionError(
        'unsupported_shape',
        'Projection output has no admitted source or calculation.'
      );
    }
    return (output.operations ?? []).reduce<PostgresAstNode>(
      (expression, operation) => pgFunction(operation, expression),
      pgColumnRef(output.sourceFieldName)
    );
  };
  return {
    SelectStmt: {
      targetList: projection.outputs.map((output) => ({
        ResTarget: {
          ...(output.name === output.sourceFieldName ? {} : { name: output.name }),
          val: outputExpression(output),
        },
      })),
      fromClause: [
        pgRangeVar({ schema: projection.source.schema, table: projection.source.table }),
      ],
      ...(whereClause == null ? {} : { whereClause }),
      limitOption: 'LIMIT_OPTION_DEFAULT',
      op: 'SETOP_NONE',
    },
  };
}

function requireFinalPilotProjection(draft: DvtSubstraitPilotDraft): DvtSubstraitPilotProjection {
  const inspection = inspectDvtSubstraitPilotDraft(draft);
  if (!inspection.ok || inspection.projection.operations.join(',') !== 'trim,upper') {
    throw new DvtSubstraitPostgresProjectionError(
      'unsupported_shape',
      'PostgreSQL projection supports only the completed VTX2 #2598 pilot recipe.'
    );
  }
  return inspection.projection;
}

function requirePhysicalSourceBinding(
  sourceBinding: DvtSubstraitPostgresSourceBinding
): DvtSubstraitPostgresSourceBinding {
  const schema = sourceBinding.schema.trim();
  const table = sourceBinding.table.trim();
  if (!schema || !table) {
    throw new DvtSubstraitPostgresProjectionError(
      'invalid_source_binding',
      'PostgreSQL projection requires one complete physical source binding.'
    );
  }
  return { schema, table };
}

function buildPilotPostgresAst(
  projection: DvtSubstraitPilotProjection,
  sourceBinding?: DvtSubstraitPostgresSourceBinding
): PostgresAstNode {
  const physicalSource = sourceBinding == null ? null : requirePhysicalSourceBinding(sourceBinding);
  const transformedInput = buildPilotOutputExpression(projection);
  const targetList: PostgresAstNode[] = [
    {
      ResTarget: {
        name: projection.outputName,
        val: transformedInput,
      },
    },
    ...projection.outputs.slice(1).map((output) => ({
      ResTarget: {
        val: pgColumnRef(output.name),
      },
    })),
  ];

  return {
    SelectStmt: {
      targetList,
      fromClause: [
        {
          RangeVar: {
            ...(physicalSource == null ? {} : { schemaname: physicalSource.schema }),
            relname: physicalSource?.table ?? projection.sourceName,
            inh: true,
            relpersistence: 'p',
          },
        },
      ],
      limitOption: 'LIMIT_OPTION_DEFAULT',
      op: 'SETOP_NONE',
    },
  };
}

function requireAggregateProjection(draft: DvtSubstraitPilotDraft): Readonly<{
  aggregate: DvtSubstraitPilotAggregationProjection;
  base: DvtSubstraitPilotProjection;
}> {
  const aggregateInspection = inspectDvtSubstraitPilotAggregationDraft(draft);
  const baseInspection = inspectDvtSubstraitPilotDraft(removeDvtSubstraitPilotAggregation(draft));
  if (!aggregateInspection.ok || !baseInspection.ok) {
    throw new DvtSubstraitPostgresProjectionError(
      'unsupported_shape',
      'PostgreSQL projection supports only the admitted VTX2 grouping/count shape.'
    );
  }
  return { aggregate: aggregateInspection.projection, base: baseInspection.projection };
}

function buildAggregatePostgresAst(
  projections: Readonly<{
    aggregate: DvtSubstraitPilotAggregationProjection;
    base: DvtSubstraitPilotProjection;
  }>,
  sourceBinding?: DvtSubstraitPostgresSourceBinding
): PostgresAstNode {
  const physicalSource = sourceBinding == null ? null : requirePhysicalSourceBinding(sourceBinding);
  const baseOutput = projections.base.outputs[projections.aggregate.groupField.inputOrdinal];
  if (baseOutput == null) {
    throw new DvtSubstraitPostgresProjectionError(
      'unsupported_shape',
      'Grouping field does not resolve to the admitted pilot input.'
    );
  }
  const groupExpression =
    projections.aggregate.groupField.inputOrdinal === 0
      ? buildPilotOutputExpression(projections.base)
      : pgColumnRef(baseOutput.name);

  return {
    SelectStmt: {
      targetList: [
        {
          ResTarget: {
            name: projections.aggregate.groupField.name,
            val: groupExpression,
          },
        },
        {
          ResTarget: {
            name: projections.aggregate.measure.name,
            val: pgCountRows(),
          },
        },
      ],
      fromClause: [
        pgRangeVar({
          schema: physicalSource?.schema,
          table: physicalSource?.table ?? projections.aggregate.sourceName,
        }),
      ],
      groupClause: [groupExpression],
      limitOption: 'LIMIT_OPTION_DEFAULT',
      op: 'SETOP_NONE',
    },
  };
}

function requireAggregateWindowProjection(draft: DvtSubstraitPilotDraft): Readonly<{
  composition: DvtSubstraitPilotAggregateWindowProjection;
  aggregate: DvtSubstraitPilotAggregationProjection;
  base: DvtSubstraitPilotProjection;
}> {
  const compositionInspection = inspectDvtSubstraitPilotAggregateWindowDraft(draft);
  const aggregateDraft = removeDvtSubstraitPilotAggregateRowNumber(draft);
  const aggregateProjections = requireAggregateProjection(aggregateDraft);
  if (!compositionInspection.ok) {
    throw new DvtSubstraitPostgresProjectionError(
      'unsupported_shape',
      'PostgreSQL projection supports only the admitted VTX2 aggregate-window composition.'
    );
  }
  return {
    composition: compositionInspection.projection,
    aggregate: aggregateProjections.aggregate,
    base: aggregateProjections.base,
  };
}

function buildAggregateWindowPostgresAst(
  projections: Readonly<{
    composition: DvtSubstraitPilotAggregateWindowProjection;
    aggregate: DvtSubstraitPilotAggregationProjection;
    base: DvtSubstraitPilotProjection;
  }>,
  sourceBinding?: DvtSubstraitPostgresSourceBinding
): PostgresAstNode {
  const physicalSource = sourceBinding == null ? null : requirePhysicalSourceBinding(sourceBinding);
  const baseOutput = projections.base.outputs[projections.aggregate.groupField.inputOrdinal];
  if (baseOutput == null) {
    throw new DvtSubstraitPostgresProjectionError(
      'unsupported_shape',
      'Aggregate-window grouping field does not resolve to the admitted pilot input.'
    );
  }
  const groupExpression =
    projections.aggregate.groupField.inputOrdinal === 0
      ? buildPilotOutputExpression(projections.base)
      : pgColumnRef(baseOutput.name);

  return {
    SelectStmt: {
      targetList: [
        {
          ResTarget: {
            name: projections.composition.groupField.name,
            val: groupExpression,
          },
        },
        {
          ResTarget: {
            name: projections.composition.measure.name,
            val: pgCountRows(),
          },
        },
        {
          ResTarget: {
            name: projections.composition.result.name,
            val: pgRowNumberOverCount(groupExpression),
          },
        },
      ],
      fromClause: [
        pgRangeVar({
          schema: physicalSource?.schema,
          table: physicalSource?.table ?? projections.composition.sourceName,
        }),
      ],
      groupClause: [groupExpression],
      limitOption: 'LIMIT_OPTION_DEFAULT',
      op: 'SETOP_NONE',
    },
  };
}

function requireWindowProjection(draft: DvtSubstraitPilotDraft): Readonly<{
  window: DvtSubstraitPilotWindowProjection;
  base: DvtSubstraitPilotProjection;
}> {
  const windowInspection = inspectDvtSubstraitPilotWindowDraft(draft);
  const baseInspection = inspectDvtSubstraitPilotDraft(removeDvtSubstraitPilotRowNumber(draft));
  if (!windowInspection.ok || !baseInspection.ok) {
    throw new DvtSubstraitPostgresProjectionError(
      'unsupported_shape',
      'PostgreSQL projection supports only the admitted VTX2 row-number window shape.'
    );
  }
  return { window: windowInspection.projection, base: baseInspection.projection };
}

function buildWindowPostgresAst(
  projections: Readonly<{
    window: DvtSubstraitPilotWindowProjection;
    base: DvtSubstraitPilotProjection;
  }>,
  sourceBinding?: DvtSubstraitPostgresSourceBinding
): PostgresAstNode {
  const physicalSource = sourceBinding == null ? null : requirePhysicalSourceBinding(sourceBinding);
  const inputFieldNames = [
    projections.base.inputFieldName,
    ...projections.base.outputs.slice(1).map((output) => output.name),
  ];
  const partitionFieldName = inputFieldNames[projections.window.partitionField.inputOrdinal];
  const orderFieldName = inputFieldNames[projections.window.orderField.inputOrdinal];
  if (partitionFieldName == null || orderFieldName == null) {
    throw new DvtSubstraitPostgresProjectionError(
      'unsupported_shape',
      'Window fields do not resolve to the admitted pilot input.'
    );
  }
  return {
    SelectStmt: {
      targetList: [
        {
          ResTarget: {
            name: projections.base.outputName,
            val: buildPilotOutputExpression(projections.base),
          },
        },
        ...projections.base.outputs.slice(1).map((output) => ({
          ResTarget: { val: pgColumnRef(output.name) },
        })),
        {
          ResTarget: {
            name: projections.window.result.name,
            val: pgRowNumber(partitionFieldName, orderFieldName),
          },
        },
      ],
      fromClause: [
        pgRangeVar({
          schema: physicalSource?.schema,
          table: physicalSource?.table ?? projections.window.sourceName,
        }),
      ],
      limitOption: 'LIMIT_OPTION_DEFAULT',
      op: 'SETOP_NONE',
    },
  };
}

function requireInnerJoinProjection(
  draft: DvtSubstraitInnerJoinDraft
): DvtSubstraitInnerJoinProjection {
  const inspection = inspectDvtSubstraitInnerJoinDraft(draft);
  if (!inspection.ok) {
    throw new DvtSubstraitPostgresProjectionError(
      'unsupported_shape',
      'PostgreSQL projection supports only the admitted VTX2 two-source INNER JOIN.'
    );
  }
  return inspection.projection;
}

function buildInnerJoinPostgresAst(projection: DvtSubstraitInnerJoinProjection): PostgresAstNode {
  const leftAlias = 'left_source';
  const rightAlias = 'right_source';

  return {
    SelectStmt: {
      targetList: projection.outputs.map((output) => ({
        ResTarget: {
          name: output.name,
          val: pgQualifiedColumnRef(
            output.source.relation === 'left' ? leftAlias : rightAlias,
            output.source.name
          ),
        },
      })),
      fromClause: [
        {
          JoinExpr: {
            jointype: 'JOIN_INNER',
            larg: pgRangeVar({
              schema: projection.left.schema,
              table: projection.left.table,
              alias: leftAlias,
            }),
            rarg: pgRangeVar({
              schema: projection.right.schema,
              table: projection.right.table,
              alias: rightAlias,
            }),
            quals: {
              A_Expr: {
                kind: 'AEXPR_OP',
                name: [pgString('=')],
                lexpr: pgQualifiedColumnRef(leftAlias, projection.leftKey),
                rexpr: pgQualifiedColumnRef(rightAlias, projection.rightKey),
              },
            },
          },
        },
      ],
      limitOption: 'LIMIT_OPTION_DEFAULT',
      op: 'SETOP_NONE',
    },
  };
}

function nInputJoinAlias(inputIndex: number): string {
  if (inputIndex === 0) return 'left_source';
  if (inputIndex === 1) return 'right_source';
  return `join_source_${inputIndex + 1}`;
}

function buildNInputJoinPostgresAst(projection: DvtSubstraitNInputJoinProjection): PostgresAstNode {
  const fieldBindings = new Map<string, Readonly<{ alias: string; name: string }>>();
  projection.inputs.forEach((input, inputIndex) => {
    const alias = nInputJoinAlias(inputIndex);
    input.fields.forEach((field) => fieldBindings.set(field.fieldId, { alias, name: field.name }));
  });
  const requireFieldBinding = (fieldId: string): Readonly<{ alias: string; name: string }> => {
    const binding = fieldBindings.get(fieldId);
    if (binding == null) {
      throw new DvtSubstraitPostgresProjectionError(
        'unsupported_shape',
        'The recursive INNER JOIN references a field outside its admitted inputs.'
      );
    }
    return binding;
  };

  const firstInput = projection.inputs[0];
  if (firstInput == null || projection.joins.length !== projection.inputs.length - 1) {
    throw new DvtSubstraitPostgresProjectionError(
      'unsupported_shape',
      'The recursive INNER JOIN tree does not have one predicate per appended input.'
    );
  }
  let joinedInputs = pgRangeVar({
    schema: firstInput.schema,
    table: firstInput.table,
    alias: nInputJoinAlias(0),
  });
  for (let inputIndex = 1; inputIndex < projection.inputs.length; inputIndex += 1) {
    const input = projection.inputs[inputIndex]!;
    const predicate = projection.joins[inputIndex - 1]!;
    const left = requireFieldBinding(predicate.leftSourceFieldId);
    const right = requireFieldBinding(predicate.rightSourceFieldId);
    joinedInputs = {
      JoinExpr: {
        jointype: 'JOIN_INNER',
        larg: joinedInputs,
        rarg: pgRangeVar({
          schema: input.schema,
          table: input.table,
          alias: nInputJoinAlias(inputIndex),
        }),
        quals: {
          A_Expr: {
            kind: 'AEXPR_OP',
            name: [pgString('=')],
            lexpr: pgQualifiedColumnRef(left.alias, left.name),
            rexpr: pgQualifiedColumnRef(right.alias, right.name),
          },
        },
      },
    };
  }

  return {
    SelectStmt: {
      targetList: projection.outputs.map((output) => {
        const source = requireFieldBinding(output.source.fieldId);
        return {
          ResTarget: {
            name: output.name,
            val: pgQualifiedColumnRef(source.alias, source.name),
          },
        };
      }),
      fromClause: [joinedInputs],
      limitOption: 'LIMIT_OPTION_DEFAULT',
      op: 'SETOP_NONE',
    },
  };
}

function buildGroupedInnerJoinPostgresAst(
  composition:
    DvtSubstraitInnerJoinGroupingProjection | DvtSubstraitInnerJoinGroupedWindowProjection,
  innerJoin: PostgresAstNode
): PostgresAstNode {
  const groupExpression = pgColumnRef(composition.groupField.name);
  const groupedWindow = 'result' in composition ? composition : null;
  return {
    SelectStmt: {
      targetList: [
        { ResTarget: { val: groupExpression } },
        { ResTarget: { name: composition.measure.name, val: pgCountRows() } },
        ...(groupedWindow == null
          ? []
          : [
              {
                ResTarget: {
                  name: groupedWindow.result.name,
                  val: pgRowNumberOverCount(groupExpression),
                },
              },
            ]),
      ],
      fromClause: [pgRangeSubselect(innerJoin, 'inner_join_input')],
      groupClause: [groupExpression],
      limitOption: 'LIMIT_OPTION_DEFAULT',
      op: 'SETOP_NONE',
    },
  };
}

function buildAcceptedInnerJoinPostgresAst(draft: DvtSubstraitInnerJoinDraft): PostgresAstNode {
  const nInputJoin = inspectDvtSubstraitNInputJoinDraft(draft);
  return nInputJoin.ok && nInputJoin.projection.inputs.length > 2
    ? buildNInputJoinPostgresAst(nInputJoin.projection)
    : buildInnerJoinPostgresAst(requireInnerJoinProjection(draft));
}

function requireUnionAllProjection(
  draft: DvtSubstraitUnionAllDraft
): DvtSubstraitUnionAllProjection {
  const inspection = inspectDvtSubstraitUnionAllDraft(draft);
  if (!inspection.ok) {
    throw new DvtSubstraitPostgresProjectionError(
      'unsupported_shape',
      'PostgreSQL projection supports only the admitted VTX2 N-source UNION ALL.'
    );
  }
  return inspection.projection;
}

function buildUnionAllInputPostgresAst(
  input: DvtSubstraitUnionAllProjection['inputs'][number],
  outputs: DvtSubstraitUnionAllProjection['outputs']
): PostgresAstNode {
  return {
    targetList: outputs.map((output) => ({
      ResTarget: {
        ...(output.name === output.fieldKey ? {} : { name: output.name }),
        val: pgColumnRef(output.fieldKey),
      },
    })),
    fromClause: [pgRangeVar({ schema: input.schema, table: input.table })],
    limitOption: 'LIMIT_OPTION_DEFAULT',
    op: 'SETOP_NONE',
  };
}

function buildUnionAllPostgresAst(projection: DvtSubstraitUnionAllProjection): PostgresAstNode {
  const first = projection.inputs[0];
  if (first == null || projection.inputs.length < 2) {
    throw new DvtSubstraitPostgresProjectionError(
      'unsupported_shape',
      'UNION ALL requires at least two admitted inputs.'
    );
  }
  let union = buildUnionAllInputPostgresAst(first, projection.outputs);
  for (const input of projection.inputs.slice(1)) {
    union = {
      op: 'SETOP_UNION',
      all: true,
      larg: union,
      rarg: buildUnionAllInputPostgresAst(input, projection.outputs),
      limitOption: 'LIMIT_OPTION_DEFAULT',
    };
  }
  return { SelectStmt: union };
}

function pgRangeSubselect(subquery: PostgresAstNode, alias: string): PostgresAstNode {
  return {
    RangeSubselect: {
      subquery,
      alias: { aliasname: alias },
    },
  };
}

function buildGroupedUnionAllPostgresAst(
  composition: DvtSubstraitUnionAllGroupingProjection | DvtSubstraitUnionAllGroupedWindowProjection,
  unionAll: DvtSubstraitUnionAllProjection
): PostgresAstNode {
  const groupExpression = pgColumnRef(composition.groupField.name);
  const groupedWindow = 'result' in composition ? composition : null;
  return {
    SelectStmt: {
      targetList: [
        { ResTarget: { val: groupExpression } },
        {
          ResTarget: {
            name: composition.measure.name,
            val: pgCountRows(),
          },
        },
        ...(groupedWindow == null
          ? []
          : [
              {
                ResTarget: {
                  name: groupedWindow.result.name,
                  val: pgRowNumberOverCount(groupExpression),
                },
              },
            ]),
      ],
      fromClause: [pgRangeSubselect(buildUnionAllPostgresAst(unionAll), 'union_all_input')],
      groupClause: [groupExpression],
      limitOption: 'LIMIT_OPTION_DEFAULT',
      op: 'SETOP_NONE',
    },
  };
}

async function deparseBoundedPostgresAst(postgresAst: PostgresAstNode): Promise<string> {
  try {
    return await deparse(postgresAst as Parameters<typeof deparse>[0]);
  } catch (error) {
    throw new DvtSubstraitPostgresProjectionError(
      'deparse_failed',
      'The bounded PostgreSQL AST could not be rendered.',
      { cause: error }
    );
  }
}

/**
 * Render the single accepted Substrait pilot fixture. Every broader Substrait
 * shape fails closed until a second real use case earns a larger projection.
 */
export async function projectDvtSubstraitProjectionToPostgresSql(
  draft: DvtSubstraitProjectionDraft
): Promise<string> {
  const filter = resolveDvtSubstraitFilterPostgresProjection(draft);
  return deparseBoundedPostgresAst(
    buildConnectedFieldPostgresAst(
      requireConnectedFieldProjection(filter.baseDraft),
      filter.whereClause
    )
  );
}

export async function projectDvtSubstraitPilotToPostgresSql(
  draft: DvtSubstraitPilotDraft,
  sourceBinding?: DvtSubstraitPostgresSourceBinding
): Promise<string> {
  const projection = requireFinalPilotProjection(draft);
  const postgresAst = buildPilotPostgresAst(projection, sourceBinding);
  return deparseBoundedPostgresAst(postgresAst);
}

export async function projectDvtSubstraitPilotAggregationToPostgresSql(
  draft: DvtSubstraitPilotDraft,
  sourceBinding?: DvtSubstraitPostgresSourceBinding
): Promise<string> {
  return deparseBoundedPostgresAst(
    buildAggregatePostgresAst(requireAggregateProjection(draft), sourceBinding)
  );
}

export async function projectDvtSubstraitPilotAggregateWindowToPostgresSql(
  draft: DvtSubstraitPilotDraft,
  sourceBinding?: DvtSubstraitPostgresSourceBinding
): Promise<string> {
  return deparseBoundedPostgresAst(
    buildAggregateWindowPostgresAst(requireAggregateWindowProjection(draft), sourceBinding)
  );
}

export async function projectDvtSubstraitPilotWindowToPostgresSql(
  draft: DvtSubstraitPilotDraft,
  sourceBinding?: DvtSubstraitPostgresSourceBinding
): Promise<string> {
  return deparseBoundedPostgresAst(
    buildWindowPostgresAst(requireWindowProjection(draft), sourceBinding)
  );
}

export async function projectDvtSubstraitInnerJoinToPostgresSql(
  draft: DvtSubstraitInnerJoinDraft
): Promise<string> {
  const groupedWindow = inspectDvtSubstraitInnerJoinGroupedWindowDraft(draft);
  if (groupedWindow.ok) {
    const groupingDraft = removeDvtSubstraitInnerJoinGroupedRowNumber(draft);
    const innerJoin = buildAcceptedInnerJoinPostgresAst(
      removeDvtSubstraitInnerJoinGrouping(groupingDraft)
    );
    return deparseBoundedPostgresAst(
      buildGroupedInnerJoinPostgresAst(groupedWindow.projection, innerJoin)
    );
  }
  const grouping = inspectDvtSubstraitInnerJoinGroupingDraft(draft);
  if (grouping.ok) {
    const innerJoin = buildAcceptedInnerJoinPostgresAst(removeDvtSubstraitInnerJoinGrouping(draft));
    return deparseBoundedPostgresAst(
      buildGroupedInnerJoinPostgresAst(grouping.projection, innerJoin)
    );
  }
  const nInputJoin = inspectDvtSubstraitNInputJoinDraft(draft);
  return deparseBoundedPostgresAst(
    nInputJoin.ok
      ? buildNInputJoinPostgresAst(nInputJoin.projection)
      : buildInnerJoinPostgresAst(requireInnerJoinProjection(draft))
  );
}

export async function projectDvtSubstraitUnionAllToPostgresSql(
  draft: DvtSubstraitUnionAllDraft
): Promise<string> {
  const groupedWindow = inspectDvtSubstraitUnionAllGroupedWindowDraft(draft);
  if (groupedWindow.ok) {
    const groupingDraft = removeDvtSubstraitUnionAllGroupedRowNumber(draft);
    const unionAll = requireUnionAllProjection(removeDvtSubstraitUnionAllGrouping(groupingDraft));
    return deparseBoundedPostgresAst(
      buildGroupedUnionAllPostgresAst(groupedWindow.projection, unionAll)
    );
  }
  const grouping = inspectDvtSubstraitUnionAllGroupingDraft(draft);
  if (grouping.ok) {
    const unionAll = requireUnionAllProjection(removeDvtSubstraitUnionAllGrouping(draft));
    return deparseBoundedPostgresAst(
      buildGroupedUnionAllPostgresAst(grouping.projection, unionAll)
    );
  }
  return deparseBoundedPostgresAst(buildUnionAllPostgresAst(requireUnionAllProjection(draft)));
}
