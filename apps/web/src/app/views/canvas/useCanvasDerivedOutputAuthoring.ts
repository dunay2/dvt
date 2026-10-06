/**
 * Owned concern: query formula identity and types for the selected Transform authoring scope.
 * @baseline ADR-0064: canonical Projects and schema analysis remain the only semantic authority.
 * @decision Share definition descriptions with Output and query types through the existing session.
 * @consequence Visible and hidden producers stay editable without a second formula graph.
 * @version 1.0.0
 */
import { useContext, useEffect, useMemo, useState } from 'react';
import type { RelationAnalysisResult } from '@dvt/substrait-analysis';
import { CanvasRelationAnalysisContext } from './CanvasRelationAnalysisContext';
import { derivedOutputDataType, rootFields } from './canvasDerivedOutputExpression';
import { useCanvasRelationFields } from './useCanvasRelationFields';
import type { DerivedOutputField } from './canvasFormulaAssist';
import { describeCanvasTransformDefinitions } from './canvasTransformDefinitionPresentation';
import { readCanvasTransformDependencyModel } from './canvasTransformDependencyModel';

export function useCanvasDerivedOutputAuthoring(relationId: string) {
  const analysis = useContext(CanvasRelationAnalysisContext);
  const document = analysis?.document;
  const session = analysis?.session;
  const revision = analysis?.revision;
  const error = analysis?.error;
  const model = useMemo(() => {
    if (document == null || session == null || revision == null || error != null) return null;
    try {
      const target = session.locate(relationId, revision);
      return {
        target,
        dependencies:
          target.relation.relType.case === 'project'
            ? readCanvasTransformDependencyModel(target, (id) => session.locate(id, revision))
            : null,
      };
    } catch {
      return null;
    }
  }, [document, error, session, revision, relationId]);
  const schema = useCanvasRelationFields(relationId);
  const input = useCanvasRelationFields(
    model?.dependencies?.input.binding.relationId ?? relationId
  );
  const [settled, setSettled] = useState<{
    model: typeof model;
    schemas: ReadonlyMap<string, RelationAnalysisResult> | null;
  } | null>(null);
  useEffect(() => {
    if (document == null || session == null || model == null) return;
    const cancellation = new AbortController();
    const owners = [
      ...new Set(
        model.dependencies?.definitions.map((definition) => definition.owner.binding.relationId) ??
          []
      ),
    ].filter((id) => id !== relationId);
    void Promise.all(
      owners.map(async (id) => [id, await session.query(id, cancellation.signal)] as const)
    ).then(
      (schemas) => {
        if (!cancellation.signal.aborted) setSettled({ model, schemas: new Map(schemas) });
      },
      () => {
        if (!cancellation.signal.aborted) setSettled({ model, schemas: null });
      }
    );
    return () => cancellation.abort();
  }, [document, session, model, relationId]);
  if (
    analysis?.document == null ||
    model == null ||
    schema.result == null ||
    schema.error != null ||
    input.result == null ||
    input.error != null ||
    settled?.model !== model ||
    settled.schemas == null
  )
    return null;
  try {
    const inputs = rootFields(input.result.bindings).flatMap((field) => {
      const value = input.result!.fields[field.outputOrdinal];
      const dataType = value == null ? null : derivedOutputDataType(value.type);
      return value == null ||
        dataType == null ||
        field.displayName == null ||
        !analysis.session.allowsInputSchema(value)
        ? []
        : [
            {
              fieldId: field.fieldId,
              relationId: field.relationId,
              name: field.displayName,
              dataType,
              origin: 'input' as const,
            },
          ];
    });
    const definitions = model.dependencies?.definitions ?? [];
    const descriptions =
      model.dependencies == null
        ? null
        : describeCanvasTransformDefinitions(model.target.plan, model.dependencies);
    const outputs = definitions.flatMap((definition) => {
      const binding = definition.output ?? definition.binding;
      const result =
        definition.output != null || definition.owner.binding.relationId === relationId
          ? schema.result!
          : settled.schemas!.get(definition.owner.binding.relationId);
      const value = result?.fields[binding.outputOrdinal];
      const dataType = value == null ? null : derivedOutputDataType(value.type);
      if (
        value == null ||
        dataType == null ||
        binding.displayName == null ||
        !analysis.session.allowsInputSchema(value)
      )
        return [];
      return [
        {
          fieldId: binding.fieldId,
          relationId: binding.relationId,
          name: binding.displayName,
          dataType,
          origin: 'calculated' as const,
          formula: descriptions!.get(definition.id)!.formula,
        },
      ];
    });
    const fields: readonly DerivedOutputField[] = [...inputs, ...outputs];
    return {
      fields,
      dragScope: {
        rootId: analysis.session.rootId,
        revision: analysis.revision,
        references: [...inputs, ...outputs],
      },
      outputs,
      intent:
        model.target.relation.relType.case === 'project' ? ('edit' as const) : ('insert' as const),
      provider: analysis.session.executionProvider(analysis.revision),
    };
  } catch {
    return null;
  }
}
