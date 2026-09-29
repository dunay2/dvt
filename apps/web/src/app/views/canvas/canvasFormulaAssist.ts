/** Read-only assistance over the existing compiler and capability catalog; no formula AST. */
import { resolveDvtSubstraitColumnFunctions } from '@dvt/postgres-projection';
import type { DerivedOutputField } from './DerivedOutputOperands';
import { inspectDerivedOutputFormula } from './canvasDerivedOutputFormula';
import { createSemanticExpressionProjector } from './semanticExpressionGraphProjection';
import type { SemanticWorkbenchGraph } from './semanticWorkbenchProjection';

export type FormulaSuggestion = Readonly<{
  label: string;
  text: string;
  detail: string;
  kind: 'field' | 'function' | 'literal';
  fieldId?: string;
  argumentCount?: number;
}>;

export function formulaSuggestions(
  fields: readonly DerivedOutputField[],
  provider: string
): readonly FormulaSuggestion[] {
  const functions = [
    ...new Set([...fields.map((field) => field.dataType), 'string', 'bigint', 'double precision']),
  ]
    .flatMap((dataType) =>
      resolveDvtSubstraitColumnFunctions({ dataType, provider, resolution: 'proposal' })
    )
    .filter((fn) => /^[a-z_]+$/i.test(fn.name));
  return [
    ...fields.map((field): FormulaSuggestion => ({
      kind: 'field',
      label: field.name,
      text: `"${field.name.replaceAll('"', '""')}"`,
      detail: field.dataType,
      fieldId: field.fieldId,
    })),
    ...functions
      .filter((fn, index) => functions.findIndex((other) => other.name === fn.name) === index)
      .map((fn): FormulaSuggestion => ({
        kind: 'function',
        label: fn.name.toUpperCase(),
        text: fn.name.toUpperCase(),
        detail: `${fn.name.toUpperCase()}(${Array.from({ length: fn.minimumArgumentCount }, (_, index) => `arg${index + 1}`).join(', ')})`,
        argumentCount: fn.minimumArgumentCount,
      })),
    ...["''", '0', 'true', 'false'].map((text): FormulaSuggestion => ({
      kind: 'literal',
      label: text,
      text,
      detail: '',
    })),
  ];
}

export function projectFormulaFeedback(
  formula: string,
  fields: readonly DerivedOutputField[],
  provider: string
) {
  const compiled = inspectDerivedOutputFormula({ formula, fields, provider });
  if (!compiled.ok) return compiled;
  const graph: SemanticWorkbenchGraph = {
    relationId: 'formula-draft',
    nodes: [],
    edges: [],
    expressionCount: 0,
    relationCount: 0,
  };
  let sequence = 0;
  const projector = createSemanticExpressionProjector({
    plan: compiled.plan,
    nodes: graph.nodes,
    edges: graph.edges,
    nextId: (prefix) => `formula-${prefix}-${sequence++}`,
  });
  projector.addExpression(
    compiled.expression,
    fields.map((field) => field.name)
  );
  return {
    ok: true as const,
    dataType: compiled.dataType,
    graph: { ...graph, expressionCount: projector.count },
    dependencies: compiled.fieldIds.flatMap((id) => fields.filter((field) => field.fieldId === id)),
  };
}
