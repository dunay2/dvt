/** Adapt one admitted SQL proposal to the existing Model draft command. */
import type { ModelSqlCompilationResponse } from '@dvt/contracts';
import { useEffect, useRef, useState } from 'react';
import type { CanonicalNode } from '../../../types/canonical';
import { applyDvtSubstraitSemanticDocument } from '../canvasDvtTransformAuthoringAuthority';
import { createCanvasInspectorNodeDraft } from '../canvasInspectorAuthoringModel';
import type {
  CanvasRelationalTreeAuthoringContract,
  CanvasRelationalTreeApplyResult,
} from '../canvasRelationalTreeWorkbench.types';

export async function applyModelSqlProposal(
  node: CanonicalNode,
  authoring: CanvasRelationalTreeAuthoringContract | undefined,
  proposal: ModelSqlCompilationResponse,
  signal: AbortSignal
): Promise<CanvasRelationalTreeApplyResult> {
  if (signal.aborted || authoring?.canEditNode !== true || proposal.status !== 'valid')
    return { outcome: 'rejected', reason: 'command_unavailable' };
  const canonical = applyDvtSubstraitSemanticDocument(node, proposal.semanticDocument);
  const draft = { ...createCanvasInspectorNodeDraft(canonical), relationalAuthoringDraft: null };
  return authoring.onApplyNodeDraft(node.id, draft, {
    inputAdditions: proposal.inputAdditions.map((addition) => ({
      nodeId: addition.nodeId,
      columnId: addition.columnId,
    })),
    signal,
  });
}

/** Keep command acknowledgement independent of the query revision it changes itself. */
export function useModelSqlApplyCommand(onApplyingChange?: (applying: boolean) => void) {
  const active = useRef<AbortController | null>(null);
  const [applying, setApplying] = useState(false);
  const cancel = () => {
    active.current?.abort();
  };
  useEffect(
    () => () => {
      active.current?.abort();
    },
    []
  );
  return {
    applying,
    isApplying: () => active.current != null,
    cancel,
    run: async (command: (signal: AbortSignal) => Promise<CanvasRelationalTreeApplyResult>) => {
      if (active.current != null) return null;
      const controller = new AbortController();
      active.current = controller;
      setApplying(true);
      try {
        onApplyingChange?.(true);
        return await command(controller.signal);
      } finally {
        if (active.current === controller) {
          active.current = null;
          setApplying(false);
          onApplyingChange?.(false);
        }
      }
    },
  };
}
