/** Owned concern: own the discardable relation draft and reset/hydrate it atomically. */
import { useCallback, useState, type SetStateAction } from 'react';
import type { CanvasRelationalOperation } from './canvasRelationalOperationChoices';
import type { SubstraitDocument } from '@dvt/substrait-analysis';
import type { RelationalApplyRejection } from './canvasRelationalTreeWorkbench.types';
import type { CanvasRelationalTreeSeedHydration } from './useCanvasRelationalTreeExistingSeed';
import { useCanvasRelationalOperandSlots } from './useCanvasRelationalOperandSlots';
import type { PendingSourceOccurrence } from './relational-source-occurrence/pendingSourceOccurrence';
import type { CanvasStagedOperation } from './canvasStagedOperation';
import { indexSubstraitRelations } from '@dvt/substrait-analysis';
import type { CardPosition } from './canvasRelationalTreeGeometry';
import { encodeDvtSubstraitSemanticDocument } from './canvasDvtSubstraitSemanticDocument';
import type { prepareCanvasSourceOccurrenceInputRecovery } from './canvasSourceOccurrenceInputRecovery';

type GraphSnapshot = Readonly<{
  joinDraft: SubstraitDocument | null;
  pendingSources: readonly PendingSourceOccurrence[];
  stagedOperations: readonly CanvasStagedOperation[];
  outputRelationId: string | null;
  inputRecovery:
    | (Awaited<ReturnType<typeof prepareCanvasSourceOccurrenceInputRecovery>> & {
        authorityIdentity: string;
      })
    | null;
}>;
const emptyGraph: GraphSnapshot = {
  joinDraft: null,
  pendingSources: [],
  stagedOperations: [],
  outputRelationId: null,
  inputRecovery: null,
};

export function useCanvasRelationalTreeDraftState() {
  const [operation, setOperation] = useState<CanvasRelationalOperation | null>(null);
  const [active, setActive] = useState(false);
  const [graph, setGraph] = useState(emptyGraph);
  const { joinDraft, pendingSources, stagedOperations, outputRelationId } = graph;
  const updateGraph = useCallback(
    <K extends keyof GraphSnapshot>(key: K, update: SetStateAction<GraphSnapshot[K]>) => {
      setGraph((current) => {
        const value =
          typeof update === 'function'
            ? (update as (previous: GraphSnapshot[K]) => GraphSnapshot[K])(current[key])
            : update;
        return value === current[key] ? current : { ...current, [key]: value };
      });
    },
    []
  );
  const setJoinDraft = useCallback(
    (update: SetStateAction<SubstraitDocument | null>) => updateGraph('joinDraft', update),
    [updateGraph]
  );
  const setPendingSources = useCallback(
    (update: SetStateAction<readonly PendingSourceOccurrence[]>) =>
      updateGraph('pendingSources', update),
    [updateGraph]
  );
  const setStagedOperations = useCallback(
    (update: SetStateAction<readonly CanvasStagedOperation[]>) =>
      updateGraph('stagedOperations', update),
    [updateGraph]
  );
  const setOutputRelationId = useCallback(
    (update: SetStateAction<string | null>) => updateGraph('outputRelationId', update),
    [updateGraph]
  );
  const [pendingSourceId, setPendingSourceId] = useState<string | null>(null);
  const [selectedStagedOperationId, setSelectedStagedOperationId] = useState<string | null>(null);
  const [positions, setPositions] = useState<ReadonlyMap<string, CardPosition>>(() => new Map());
  const [applyRejection, setApplyRejection] = useState<RelationalApplyRejection | null>(null);
  const slots = useCanvasRelationalOperandSlots();
  const { resetOperands, replaceInputs } = slots;
  const reset = useCallback(() => {
    setActive(false);
    setOperation(null);
    resetOperands();
    setGraph(emptyGraph);
    setPendingSourceId(null);
    setSelectedStagedOperationId(null);
    setApplyRejection(null);
  }, [resetOperands]);
  const hydrate = useCallback(
    (seed: CanvasRelationalTreeSeedHydration) => {
      setActive(true);
      replaceInputs(seed.inputIds);
      setOperation(seed.operation);
      setSelectedStagedOperationId(null);
      const indexed = indexSubstraitRelations(seed.draft);
      setGraph((current) => ({
        ...current,
        joinDraft: seed.draft,
        stagedOperations: [],
        outputRelationId: indexed.ok ? indexed.index.rootId : null,
        inputRecovery: null,
      }));
    },
    [replaceInputs]
  );
  return {
    graphSnapshot: graph,
    commitInputRecovery: useCallback(
      (expected: GraphSnapshot, recovery: NonNullable<GraphSnapshot['inputRecovery']>) => {
        setGraph((current) =>
          current !== expected
            ? current
            : { ...current, joinDraft: recovery.document, inputRecovery: recovery }
        );
      },
      []
    ),
    commitOutputInitialization: useCallback(
      (expected: GraphSnapshot, document: SubstraitDocument, consumedIds: readonly string[]) => {
        setGraph((current) => {
          if (current !== expected || current.outputRelationId == null) return current;
          const stagedRoot = current.stagedOperations.find(
            (operation) => operation.id === current.outputRelationId
          );
          return {
            ...current,
            joinDraft: stagedRoot == null ? document : current.joinDraft,
            stagedOperations:
              stagedRoot == null
                ? current.stagedOperations
                : current.stagedOperations.map((operation) =>
                    operation === stagedRoot
                      ? {
                          ...operation,
                          semanticDocument: encodeDvtSubstraitSemanticDocument(document),
                        }
                      : operation
                  ),
            pendingSources: current.pendingSources.map((source) => {
              if (!consumedIds.includes(source.read.binding.relationId)) return source;
              const { initialOutputFieldIds: _initialOutputFieldIds, ...retained } = source;
              return retained;
            }),
          };
        });
      },
      []
    ),
    slots,
    operation,
    setOperation,
    active,
    setActive,
    joinDraft,
    setJoinDraft,
    pendingSources,
    setPendingSources,
    pendingSourceId,
    setPendingSourceId,
    stagedOperations,
    setStagedOperations,
    selectedStagedOperationId,
    setSelectedStagedOperationId,
    outputRelationId,
    setOutputRelationId,
    positions,
    setPositions,
    restoreIncomplete: useCallback(
      (
        draft: Readonly<{
          sources: readonly PendingSourceOccurrence[];
          operations: readonly CanvasStagedOperation[];
          outputRelationId: string | null;
          positions: ReadonlyMap<string, CardPosition>;
        }>
      ) => {
        setActive(true);
        setGraph((current) => ({
          ...current,
          pendingSources: draft.sources,
          stagedOperations: draft.operations,
          outputRelationId: draft.outputRelationId,
          inputRecovery: null,
        }));
        setPendingSourceId(null);
        setSelectedStagedOperationId(null);
        setPositions((current) => new Map([...current, ...draft.positions]));
      },
      []
    ),
    clear: () => {
      setActive(true);
      setOperation(null);
      resetOperands();
      setGraph((current) => ({ ...emptyGraph, pendingSources: current.pendingSources }));
      setPendingSourceId(null);
      setSelectedStagedOperationId(null);
      setApplyRejection(null);
    },
    applyRejection,
    setApplyRejection,
    reset,
    hydrate,
  };
}
