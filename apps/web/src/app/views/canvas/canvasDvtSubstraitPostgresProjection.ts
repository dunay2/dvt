import {
  buildNInputJoinPostgresAst,
  DvtSubstraitPostgresProjectionError,
  projectDvtSetDraftToPostgresSql,
} from '@dvt/postgres-projection';
export {
  DvtSubstraitPostgresProjectionError,
  type DvtSubstraitPostgresProjectionErrorCode,
} from '@dvt/postgres-projection';
/** Owned concern: project only the admitted pilot, aggregate/window, Join and Set shapes to PostgreSQL. */
import { deparse } from 'pgsql-deparser';

import {
  inspectDvtSubstraitPilotDraft,
  type DvtSubstraitPilotDraft,
  type DvtSubstraitPilotProjection,
} from './canvasDvtSubstraitPilot';
import { type DvtSubstraitProjectionDraft } from './canvasDvtSubstraitProjection';
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
  inspectDvtSubstraitJoinDraft,
  removeDvtSubstraitInnerJoinGroupedRowNumber,
  removeDvtSubstraitInnerJoinGrouping,
  type DvtSubstraitJoinDraft,
  type DvtSubstraitInnerJoinGroupedWindowProjection,
  type DvtSubstraitInnerJoinGroupingProjection,
  type DvtSubstraitJoinPredicateOperand,
  type DvtSubstraitNInputJoinProjection,
} from './canvasDvtSubstraitJoinComposition';
import {
  isDvtSubstraitJoinNullCondition,
  reduceDvtSubstraitJoinConditions,
} from './canvasDvtSubstraitJoinCondition';
import { resolveDvtSubstraitJoinUnaryFunction } from './canvasDvtSubstraitJoinOperand';
import { type DvtSubstraitUnionAllDraft } from './canvasDvtSubstraitSetComposition';
import {
  pgAnd,
  pgBooleanLiteral,
  pgColumnRef,
  pgCountRows,
  pgComparison,
  pgNullTest,
  pgFp64Literal,
  pgFunction,
  pgI64Literal,
  pgOr,
  pgRangeVar,
  pgRangeSubselect,
  pgRowNumber,
  pgRowNumberOverCount,
  pgStringLiteral,
  pgTimestampTzLiteral,
  type PostgresAstNode,
} from './canvasDvtSubstraitPostgresAst';
import { buildDvtSubstraitProjectionPostgresAst } from './canvasDvtSubstraitProjectPostgresAst';
export type DvtSubstraitPostgresSourceBinding = Readonly<{
  schema: string;
  table: string;
}>;

function buildPilotOutputExpression(projection: DvtSubstraitPilotProjection): PostgresAstNode {
  return projection.operations.reduce<PostgresAstNode>(
    (expression, operation) => pgFunction(operation, expression),
    pgColumnRef(projection.inputFieldName)
  );
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

function buildAcceptedJoinPostgresAst(draft: DvtSubstraitJoinDraft): PostgresAstNode {
  const inspection = inspectDvtSubstraitJoinDraft(draft);
  if (!inspection.ok) {
    throw new DvtSubstraitPostgresProjectionError(
      'unsupported_shape',
      'PostgreSQL projection supports only admitted VTX2 JOIN-family shapes.'
    );
  }
  return buildNInputJoinPostgresAst(inspection.projection);
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
  return deparseBoundedPostgresAst(buildDvtSubstraitProjectionPostgresAst(draft));
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

export async function projectDvtSubstraitJoinToPostgresSql(
  draft: DvtSubstraitJoinDraft
): Promise<string> {
  const groupedWindow = inspectDvtSubstraitInnerJoinGroupedWindowDraft(draft);
  if (groupedWindow.ok) {
    const groupingDraft = removeDvtSubstraitInnerJoinGroupedRowNumber(draft);
    const innerJoin = buildAcceptedJoinPostgresAst(
      removeDvtSubstraitInnerJoinGrouping(groupingDraft)
    );
    return deparseBoundedPostgresAst(
      buildGroupedInnerJoinPostgresAst(groupedWindow.projection, innerJoin)
    );
  }
  const grouping = inspectDvtSubstraitInnerJoinGroupingDraft(draft);
  if (grouping.ok) {
    const innerJoin = buildAcceptedJoinPostgresAst(removeDvtSubstraitInnerJoinGrouping(draft));
    return deparseBoundedPostgresAst(
      buildGroupedInnerJoinPostgresAst(grouping.projection, innerJoin)
    );
  }
  return deparseBoundedPostgresAst(buildAcceptedJoinPostgresAst(draft));
}

export async function projectDvtSubstraitUnionAllToPostgresSql(
  draft: DvtSubstraitUnionAllDraft
): Promise<string> {
  return (await projectDvtSetDraftToPostgresSql(draft)).sql;
}
