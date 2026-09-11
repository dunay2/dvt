/** Owned concern: inspect and edit one canonical DVT Transform semantic document. */
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  Background,
  Handle,
  Position,
  ReactFlow,
  useNodesState,
  type NodeTypes,
} from '@xyflow/react';
import { ArrowLeft, Braces, Database, Equal, GitMerge, Hash, Maximize2 } from 'lucide-react';

import { Tooltip, TooltipContent, TooltipTrigger } from '../../components/ui/tooltip';
import type { CanonicalNode } from '../../types/canonical';
import {
  DVT_SUBSTRAIT_JOIN_COMPARISON_OPERATORS,
  addDvtSubstraitJoinPredicateCondition,
  decodeDvtSubstraitInnerJoinDocument,
  encodeDvtSubstraitInnerJoinDocument,
  inspectDvtSubstraitNInputJoinDraft,
  removeDvtSubstraitJoinPredicateCondition,
  setDvtSubstraitJoinPredicateFields,
  updateDvtSubstraitJoinPredicateCondition,
  type DvtSubstraitInnerJoinDraft,
  type DvtSubstraitJoinComparisonOperator,
} from './canvasDvtSubstraitJoinComposition';
import {
  applyDvtSubstraitSemanticDocument,
  readDvtTransformAuthoringAuthority,
} from './canvasDvtTransformAuthoringAuthority';
import { SemanticWorkbenchJoinConditionEditor } from './SemanticWorkbenchJoinConditionEditor';
import { projectSemanticWorkbenchGraph } from './semanticWorkbenchProjection';

const COMPARISON_LABEL: Readonly<Record<DvtSubstraitJoinComparisonOperator, string>> = {
  equal: '=',
  not_equal: '!=',
  gt: '>',
  gte: '>=',
  lt: '<',
  lte: '<=',
};

type PendingJoinPredicate = Readonly<{
  joinRelationId: string;
  leftSourceFieldId: string;
  rightSourceFieldId: string;
  operator: DvtSubstraitJoinComparisonOperator;
}>;
type EditableJoinCondition = Parameters<
  typeof addDvtSubstraitJoinPredicateCondition
>[0]['condition'];

export type SemanticTransformFocusPanelProps = Readonly<{
  transform: CanonicalNode;
  canEdit: boolean;
  onTransformChange: (transform: CanonicalNode) => void;
}>;

export function canOpenSemanticTransformFocus(node: CanonicalNode): boolean {
  if (node.kind !== 'dvt:transform') return false;
  try {
    projectSemanticWorkbenchGraph(node, { view: 'relations' });
    return true;
  } catch {
    return false;
  }
}

const semanticNodeTypes: NodeTypes = {
  semanticRelation: ({ data }) => {
    const relationKind = data.relationKind;
    const handleStyle = {
      width: 10,
      height: 10,
      border: '2px solid #22d3ee',
      background: '#071827',
    };
    return (
      <div
        data-slot="semantic-workbench-relation-node"
        className="relative"
        style={{ minHeight: relationKind === 'join' ? 76 : 56 }}
      >
        {relationKind === 'join' ? (
          <>
            <Handle
              id="left"
              type="target"
              position={Position.Left}
              isConnectable={false}
              style={{ ...handleStyle, top: '32%' }}
            />
            <span className="pointer-events-none absolute left-1 top-[21%] z-[2] font-mono text-[8px] font-bold text-cyan-300">
              L
            </span>
            <Handle
              id="right"
              type="target"
              position={Position.Left}
              isConnectable={false}
              style={{ ...handleStyle, top: '70%' }}
            />
            <span className="pointer-events-none absolute left-1 top-[59%] z-[2] font-mono text-[8px] font-bold text-cyan-300">
              R
            </span>
          </>
        ) : relationKind === 'read' ? null : (
          <Handle
            id="in"
            type="target"
            position={Position.Left}
            isConnectable={false}
            style={handleStyle}
          />
        )}
        {data.label as ReactNode}
        <Handle
          id="out"
          type="source"
          position={Position.Right}
          isConnectable={false}
          style={handleStyle}
        />
        {relationKind === 'join' ? (
          <span className="pointer-events-none absolute right-2 top-[43%] z-[2] -translate-y-1/2 font-mono text-[8px] font-bold text-cyan-300">
            OUT
          </span>
        ) : null}
      </div>
    );
  },
};

export function SemanticTransformFocusPanel({
  transform,
  canEdit,
  onTransformChange,
}: SemanticTransformFocusPanelProps): JSX.Element {
  const [expandedJoinRelationId, setExpandedJoinRelationId] = useState<string | null>(null);
  const [pendingJoinPredicate, setPendingJoinPredicate] = useState<PendingJoinPredicate | null>(
    null
  );
  const authorityGraph = useMemo(() => projectSemanticWorkbenchGraph(transform), [transform]);
  const semanticGraph = useMemo(
    () =>
      projectSemanticWorkbenchGraph(
        transform,
        expandedJoinRelationId == null
          ? { view: 'relations' }
          : { view: 'join-expression', joinRelationId: expandedJoinRelationId }
      ),
    [expandedJoinRelationId, transform]
  );
  const [selectedSemanticId, setSelectedSemanticId] = useState(authorityGraph.relationId);
  const selectedSemantic =
    authorityGraph.nodes.find((node) => node.id === selectedSemanticId) ??
    authorityGraph.nodes.find((node) => node.data.semanticKind !== 'group') ??
    null;
  const joinProjection = useMemo(() => {
    try {
      const authority = readDvtTransformAuthoringAuthority(transform);
      if (authority == null) return null;
      const inspection = inspectDvtSubstraitNInputJoinDraft(
        decodeDvtSubstraitInnerJoinDocument(authority.semanticDocument)
      );
      return inspection.ok ? inspection.projection : null;
    } catch {
      return null;
    }
  }, [transform]);
  const selectedJoinPredicate = useMemo(() => {
    const joinOperand = selectedSemantic?.data.joinOperand;
    if (joinProjection == null) return null;
    const joinRelationId =
      joinOperand?.joinRelationId ??
      (selectedSemantic?.data.semanticKind === 'relation' &&
      joinProjection.joinRelations.some((relation) => relation.relationId === selectedSemantic.id)
        ? selectedSemantic.id
        : null);
    if (joinRelationId == null) return null;
    const stageIndex = joinProjection.joinRelations.findIndex(
      (relation) => relation.relationId === joinRelationId
    );
    const predicate = joinProjection.joins[stageIndex];
    if (stageIndex < 0 || predicate == null) return null;
    const rightInputIndex = stageIndex + 1;
    const selectedOutputFieldIds = new Set(
      joinProjection.outputs.map((output) => output.source.fieldId)
    );
    const optionsFor = (operand: 'left' | 'right') =>
      joinProjection.inputs.flatMap((input, inputIndex) =>
        (operand === 'left' ? inputIndex < rightInputIndex : inputIndex === rightInputIndex)
          ? input.fields.flatMap((field) =>
              selectedOutputFieldIds.has(field.fieldId) ||
              field.fieldId === predicate.leftSourceFieldId ||
              field.fieldId === predicate.rightSourceFieldId
                ? [
                    {
                      fieldId: field.fieldId,
                      label: `${input.schema}.${input.table}.${field.name}`,
                      dataType: field.dataType,
                    },
                  ]
                : []
            )
          : []
      );
    const pending =
      pendingJoinPredicate?.joinRelationId === joinRelationId
        ? pendingJoinPredicate
        : {
            joinRelationId,
            leftSourceFieldId: predicate.leftSourceFieldId,
            rightSourceFieldId: predicate.rightSourceFieldId,
            operator: predicate.operator ?? 'equal',
          };
    const fieldTypeById = new Map(
      joinProjection.inputs.flatMap((input) =>
        input.fields.map((field) => [field.fieldId, field.dataType] as const)
      )
    );
    return {
      ...pending,
      projection: joinProjection,
      rightInputIndex,
      additionalConditions: predicate.additionalConditions ?? [],
      leftOptions: optionsFor('left'),
      rightOptions: optionsFor('right'),
      compatible:
        fieldTypeById.get(pending.leftSourceFieldId) ===
        fieldTypeById.get(pending.rightSourceFieldId),
      dirty:
        pending.leftSourceFieldId !== predicate.leftSourceFieldId ||
        pending.rightSourceFieldId !== predicate.rightSourceFieldId ||
        pending.operator !== (predicate.operator ?? 'equal'),
    };
  }, [joinProjection, pendingJoinPredicate, selectedSemantic]);

  const editJoinDraft = useCallback(
    (edit: (draft: DvtSubstraitInnerJoinDraft) => DvtSubstraitInnerJoinDraft) => {
      if (!canEdit) return;
      const authority = readDvtTransformAuthoringAuthority(transform);
      if (authority == null) return;
      const current = decodeDvtSubstraitInnerJoinDocument(authority.semanticDocument);
      const next = edit(current);
      if (next === current) return;
      onTransformChange(
        applyDvtSubstraitSemanticDocument(transform, encodeDvtSubstraitInnerJoinDocument(next))
      );
    },
    [canEdit, onTransformChange, transform]
  );
  const addCondition = useCallback(
    (joinRelationId: string, condition: EditableJoinCondition, groupWithPrevious: boolean) =>
      editJoinDraft((draft) =>
        addDvtSubstraitJoinPredicateCondition({
          draft,
          joinRelationId,
          condition,
          groupWithPrevious,
        })
      ),
    [editJoinDraft]
  );
  const updateCondition = useCallback(
    (joinRelationId: string, conditionKey: string, condition: EditableJoinCondition) =>
      editJoinDraft((draft) =>
        updateDvtSubstraitJoinPredicateCondition({
          draft,
          joinRelationId,
          conditionKey,
          condition,
        })
      ),
    [editJoinDraft]
  );
  const removeCondition = useCallback(
    (joinRelationId: string, conditionKey: string) =>
      editJoinDraft((draft) =>
        removeDvtSubstraitJoinPredicateCondition({ draft, joinRelationId, conditionKey })
      ),
    [editJoinDraft]
  );
  const projectedNodes = useMemo(
    () =>
      semanticGraph.nodes.map((node) => {
        if (node.data.semanticKind === 'group') {
          return {
            ...node,
            data: {
              ...node.data,
              label: <span data-slot="semantic-workbench-group-label">{node.data.label}</span>,
            },
          };
        }
        const [title, ...details] = node.data.label.split('\n');
        const Icon =
          node.data.semanticKind === 'field'
            ? Hash
            : node.data.semanticKind === 'expression'
              ? Equal
              : node.data.semanticKind === 'literal'
                ? Braces
                : title === 'SOURCE'
                  ? Database
                  : GitMerge;
        const tone =
          node.data.semanticKind === 'field'
            ? '#7dd3fc'
            : node.data.semanticKind === 'expression'
              ? '#34d399'
              : title === 'SOURCE'
                ? '#60a5fa'
                : '#22d3ee';
        return {
          ...node,
          selected: node.id === selectedSemanticId,
          data: {
            ...node.data,
            label: (
              <Tooltip>
                <TooltipTrigger asChild>
                  <span
                    data-slot="semantic-workbench-node"
                    tabIndex={0}
                    className="flex min-w-0 items-center gap-2 p-2 text-left"
                  >
                    <span
                      aria-hidden="true"
                      className="grid size-7 shrink-0 place-items-center rounded-md border"
                      style={{ borderColor: tone, color: tone, background: `${tone}14` }}
                    >
                      <Icon size={15} strokeWidth={1.8} />
                    </span>
                    <span className="min-w-0">
                      <span
                        className="block text-[9px] font-bold tracking-[0.06em]"
                        style={{ color: tone }}
                      >
                        {title}
                      </span>
                      <span className="block font-mono text-[10px] leading-snug text-slate-200">
                        {details.join(' · ')}
                      </span>
                    </span>
                  </span>
                </TooltipTrigger>
                <TooltipContent side="top" sideOffset={6}>
                  {node.data.detail}
                </TooltipContent>
              </Tooltip>
            ),
          },
        };
      }),
    [selectedSemanticId, semanticGraph.nodes]
  );
  const [nodes, setNodes, onNodesChange] = useNodesState(projectedNodes);
  useEffect(() => {
    setNodes((current) => {
      if (expandedJoinRelationId != null) return projectedNodes;
      const positions = new Map(current.map((node) => [node.id, node.position] as const));
      return projectedNodes.map((node) => ({
        ...node,
        position: positions.get(node.id) ?? node.position,
      }));
    });
  }, [expandedJoinRelationId, projectedNodes, setNodes]);
  const sourceCount = authorityGraph.nodes.filter(
    (node) => node.data.relationKind === 'read'
  ).length;
  const joinCount = authorityGraph.nodes.filter((node) => node.data.relationKind === 'join').length;

  return (
    <div data-slot="semantic-transform-focus" className="grid h-full min-h-0 grid-rows-[36px_1fr]">
      <header className="flex items-center justify-between gap-4 border-b border-slate-700 bg-slate-950/70 px-4">
        <strong className="text-[11px] tracking-[0.06em] text-sky-300">
          TRANSFORM FOCUS · {transform.name}
        </strong>
        <span className="font-mono text-[10px] text-slate-400">
          {expandedJoinRelationId == null
            ? 'relational projection · expressions on demand'
            : 'selected JOIN · semantic expression detail'}
        </span>
      </header>
      <section className="grid min-h-0 grid-cols-[minmax(0,1fr)_320px] overflow-hidden">
        <div className="relative min-h-0 min-w-0">
          <ReactFlow
            nodes={nodes}
            edges={semanticGraph.edges}
            nodeTypes={semanticNodeTypes}
            fitView
            fitViewOptions={{ padding: 0.2, maxZoom: 1 }}
            minZoom={0.25}
            maxZoom={1.6}
            nodesDraggable={expandedJoinRelationId == null}
            nodesConnectable={false}
            elementsSelectable={expandedJoinRelationId == null}
            onNodesChange={onNodesChange}
            onNodeClick={(_, node) => {
              if (expandedJoinRelationId == null && node.data.semanticKind !== 'group') {
                setSelectedSemanticId(node.id);
              }
            }}
            onNodeDoubleClick={(_, node) => {
              if (node.data.relationKind !== 'join') return;
              setSelectedSemanticId(node.id);
              setExpandedJoinRelationId(node.id);
            }}
            proOptions={{ hideAttribution: true }}
          >
            <Background color="#182844" gap={24} size={1} />
          </ReactFlow>
          <div className="absolute left-4 top-3 z-[4] rounded-lg border border-slate-700 bg-slate-950/90 px-3 py-2 font-mono text-[10px] text-slate-400">
            {expandedJoinRelationId == null ? (
              <>
                Relational flow · {sourceCount} sources · {joinCount} joins
              </>
            ) : (
              <button
                type="button"
                aria-label="Volver al flujo relacional"
                onClick={() => setExpandedJoinRelationId(null)}
                className="flex items-center gap-1.5 text-emerald-400"
              >
                <ArrowLeft aria-hidden="true" size={12} />
                JOIN expression · {semanticGraph.expressionCount} nodes
              </button>
            )}
          </div>
        </div>
        <aside
          data-slot="semantic-workbench-inspector"
          className="min-h-0 overflow-auto border-l border-slate-700 bg-[#05090f] p-4"
        >
          <div className="text-[10px] font-bold tracking-[0.07em] text-sky-300">RESUMEN</div>
          {selectedSemantic == null ? (
            <p className="mt-4 text-[11px] leading-relaxed text-slate-400">
              Selecciona una relación, campo o expresión.
            </p>
          ) : (
            <div className="mt-4">
              <div className="text-[15px] font-bold text-slate-200">
                {selectedSemantic.data.label.split('\n')[0]}
              </div>
              <div className="mt-1 font-mono text-[10px] text-slate-400">
                {selectedSemantic.data.label.split('\n').slice(1).join(' · ')}
              </div>
              {selectedJoinPredicate == null ? null : (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      data-slot="semantic-workbench-expand-expression"
                      aria-label={
                        expandedJoinRelationId === selectedJoinPredicate.joinRelationId
                          ? 'Volver al flujo relacional'
                          : 'Expandir la expresión del join'
                      }
                      aria-pressed={expandedJoinRelationId === selectedJoinPredicate.joinRelationId}
                      onClick={() =>
                        setExpandedJoinRelationId((current) =>
                          current === selectedJoinPredicate.joinRelationId
                            ? null
                            : selectedJoinPredicate.joinRelationId
                        )
                      }
                      className="mt-3 flex w-full items-center justify-center gap-2 rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-[10px] font-bold text-sky-300"
                    >
                      {expandedJoinRelationId === selectedJoinPredicate.joinRelationId ? (
                        <ArrowLeft aria-hidden="true" size={13} />
                      ) : (
                        <Maximize2 aria-hidden="true" size={13} />
                      )}
                      {expandedJoinRelationId === selectedJoinPredicate.joinRelationId
                        ? 'Volver al flujo relacional'
                        : 'Expand expression'}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>
                    {expandedJoinRelationId === selectedJoinPredicate.joinRelationId
                      ? 'Ocultar el AST y volver a las relaciones.'
                      : 'Mostrar sólo el árbol Substrait de este JOIN.'}
                  </TooltipContent>
                </Tooltip>
              )}
              {selectedJoinPredicate == null ? null : (
                <div className="mt-4">
                  <div className="text-[9px] font-bold text-slate-400">CONDICIÓN DEL JOIN</div>
                  <label className="mt-2 block text-[9px] text-slate-400">
                    CAMPO IZQUIERDO
                    <select
                      data-slot="semantic-workbench-left-field-select"
                      aria-label="Cambiar campo izquierdo del join"
                      title="Campos habilitados en la conexión superior izquierda."
                      value={selectedJoinPredicate.leftSourceFieldId}
                      disabled={!canEdit}
                      onChange={(event) =>
                        setPendingJoinPredicate({
                          joinRelationId: selectedJoinPredicate.joinRelationId,
                          leftSourceFieldId: event.currentTarget.value,
                          rightSourceFieldId: selectedJoinPredicate.rightSourceFieldId,
                          operator: selectedJoinPredicate.operator,
                        })
                      }
                      className="mt-1.5 w-full rounded-md border border-sky-800 bg-slate-950 px-2.5 py-2 font-mono text-[10px] text-sky-300"
                    >
                      {selectedJoinPredicate.leftOptions.map((option) => (
                        <option key={option.fieldId} value={option.fieldId}>
                          {option.label} · {option.dataType}
                        </option>
                      ))}
                    </select>
                  </label>
                  <select
                    aria-label="Comparador de la condición principal"
                    title="Operador aplicado entre los dos campos del JOIN."
                    value={selectedJoinPredicate.operator}
                    disabled={!canEdit}
                    className="mt-2 w-full rounded-md border border-emerald-700 bg-slate-950 px-2.5 py-2 font-mono text-[9px] text-emerald-400"
                    onChange={(event) =>
                      setPendingJoinPredicate({
                        ...selectedJoinPredicate,
                        operator: event.currentTarget.value as DvtSubstraitJoinComparisonOperator,
                      })
                    }
                  >
                    {DVT_SUBSTRAIT_JOIN_COMPARISON_OPERATORS.map((operator) => (
                      <option key={operator} value={operator}>
                        {COMPARISON_LABEL[operator]}
                      </option>
                    ))}
                  </select>
                  <label className="mt-2 block text-[9px] text-slate-400">
                    CAMPO DERECHO
                    <select
                      data-slot="semantic-workbench-right-field-select"
                      aria-label="Cambiar campo derecho del join"
                      title="Campos habilitados en la conexión superior derecha."
                      value={selectedJoinPredicate.rightSourceFieldId}
                      disabled={!canEdit}
                      onChange={(event) =>
                        setPendingJoinPredicate({
                          joinRelationId: selectedJoinPredicate.joinRelationId,
                          leftSourceFieldId: selectedJoinPredicate.leftSourceFieldId,
                          rightSourceFieldId: event.currentTarget.value,
                          operator: selectedJoinPredicate.operator,
                        })
                      }
                      className="mt-1.5 w-full rounded-md border border-sky-800 bg-slate-950 px-2.5 py-2 font-mono text-[10px] text-sky-300"
                    >
                      {selectedJoinPredicate.rightOptions.map((option) => (
                        <option key={option.fieldId} value={option.fieldId}>
                          {option.label} · {option.dataType}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button
                    type="button"
                    disabled={
                      !canEdit || !selectedJoinPredicate.compatible || !selectedJoinPredicate.dirty
                    }
                    title={
                      selectedJoinPredicate.compatible
                        ? 'Aplicar ambos campos a la condición.'
                        : 'Los dos campos deben tener el mismo tipo.'
                    }
                    onClick={() => {
                      editJoinDraft((draft) =>
                        setDvtSubstraitJoinPredicateFields({
                          draft,
                          joinRelationId: selectedJoinPredicate.joinRelationId,
                          leftSourceFieldId: selectedJoinPredicate.leftSourceFieldId,
                          rightSourceFieldId: selectedJoinPredicate.rightSourceFieldId,
                          operator: selectedJoinPredicate.operator,
                        })
                      );
                      setPendingJoinPredicate(null);
                    }}
                    className="mt-3 w-full rounded-md border border-blue-600 bg-blue-950 px-3 py-2 text-[10px] font-bold text-blue-100 disabled:cursor-not-allowed disabled:border-slate-700 disabled:bg-slate-900 disabled:text-slate-500"
                  >
                    Aplicar condición
                  </button>
                  {!selectedJoinPredicate.compatible ? (
                    <div className="mt-2 text-[9px] text-amber-300">
                      Selecciona dos campos del mismo tipo.
                    </div>
                  ) : null}
                  {canEdit ? (
                    <SemanticWorkbenchJoinConditionEditor
                      key={selectedJoinPredicate.joinRelationId}
                      projection={selectedJoinPredicate.projection}
                      rightInputIndex={selectedJoinPredicate.rightInputIndex}
                      conditions={selectedJoinPredicate.additionalConditions}
                      onAdd={(condition, groupWithPrevious) =>
                        addCondition(
                          selectedJoinPredicate.joinRelationId,
                          condition,
                          groupWithPrevious
                        )
                      }
                      onUpdate={(conditionKey, condition) =>
                        updateCondition(
                          selectedJoinPredicate.joinRelationId,
                          conditionKey,
                          condition
                        )
                      }
                      onRemove={(conditionKey) =>
                        removeCondition(selectedJoinPredicate.joinRelationId, conditionKey)
                      }
                    />
                  ) : null}
                </div>
              )}
              {selectedSemantic.data.expression == null ? null : (
                <div className="mt-4 rounded-lg border border-sky-800 bg-sky-950/30 p-3">
                  <div className="text-[9px] font-bold text-slate-400">EXPRESIÓN</div>
                  <div className="mt-1.5 font-mono text-[10px] text-sky-300">
                    {selectedSemantic.data.expression}
                  </div>
                </div>
              )}
              {selectedSemantic.data.detail === selectedSemantic.data.expression ? null : (
                <p className="mt-3 text-[10px] leading-relaxed text-slate-400">
                  {selectedSemantic.data.detail}
                </p>
              )}
            </div>
          )}
          <p className="mt-5 border-t border-slate-700 pt-3 text-[10px] text-slate-400">
            Este grafo proyecta la semántica interna del Transform seleccionado.
          </p>
        </aside>
      </section>
    </div>
  );
}
