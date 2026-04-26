/** Owned concern: serialize Canvas node-admission command effects over one local snapshot. */
import { useCallback, useRef } from 'react';
import type { Dispatch, SetStateAction } from 'react';

import type { Node } from '@xyflow/react';

import type { CanonicalNode } from '../../types/canonical';
import { canvasViewCopy } from './copy';
import type { CanvasDraftSession } from './canvasDraftSession';
import {
  resolveCanvasNodeAdmissionTransaction,
  type CanvasNodeAdmissionTransaction,
} from './canvasNodeAdmissionTransaction';

type CanvasNodeAdmissionCommandRunnerState = {
  draftSession: CanvasDraftSession;
  nodes: Node[];
};

type CanvasNodeAdmissionCommandRunnerEffects = {
  setNodes: Dispatch<SetStateAction<Node[]>>;
  setDraftSession: Dispatch<SetStateAction<CanvasDraftSession>>;
};

type CanvasNodeAdmissionCommandRunnerPolicy = {
  columnLevelLineageEnabled: boolean;
  allowsCanonicalNode: (node: CanonicalNode) => boolean;
};

type UseCanvasNodeAdmissionCommandRunnerArgs = {
  state: CanvasNodeAdmissionCommandRunnerState;
  effects: CanvasNodeAdmissionCommandRunnerEffects;
  policy: CanvasNodeAdmissionCommandRunnerPolicy;
};

type RunCanvasNodeAdmissionCommandArgs = {
  canonicalNode: CanonicalNode;
  position: { x: number; y: number };
  onNoop?: (reason: string) => void;
  onAdded?: (canonicalNode: CanonicalNode) => void;
};

export type RunCanvasNodeAdmissionCommand = (
  args: RunCanvasNodeAdmissionCommandArgs
) => CanvasNodeAdmissionTransaction;

export function useCanvasNodeAdmissionCommandRunner({
  state,
  effects,
  policy,
}: UseCanvasNodeAdmissionCommandRunnerArgs): RunCanvasNodeAdmissionCommand {
  const { draftSession, nodes } = state;
  const { setDraftSession, setNodes } = effects;
  const { columnLevelLineageEnabled, allowsCanonicalNode } = policy;
  const latestNodesRef = useRef(nodes);
  const latestDraftSessionRef = useRef(draftSession);
  latestNodesRef.current = nodes;
  latestDraftSessionRef.current = draftSession;

  return useCallback<RunCanvasNodeAdmissionCommand>(
    ({ canonicalNode, position, onNoop, onAdded }) => {
      if (!allowsCanonicalNode(canonicalNode)) {
        const transaction: CanvasNodeAdmissionTransaction = {
          outcome: 'noop',
          reason: canvasViewCopy.nodeKindUnavailableForCanvasMessage,
        };
        onNoop?.(transaction.reason);
        return transaction;
      }

      const transaction = resolveCanvasNodeAdmissionTransaction({
        canonicalNode,
        draftSession: latestDraftSessionRef.current,
        existingNodes: latestNodesRef.current,
        position,
        columnLevelLineageEnabled,
      });

      switch (transaction.outcome) {
        case 'noop':
          onNoop?.(transaction.reason);
          return transaction;
        case 'added':
          latestNodesRef.current = transaction.nodes;
          latestDraftSessionRef.current = transaction.draftSession;
          setNodes(transaction.nodes);
          setDraftSession(transaction.draftSession);
          onAdded?.(transaction.canonicalNode);
          return transaction;
      }
    },
    [allowsCanonicalNode, columnLevelLineageEnabled, setDraftSession, setNodes]
  );
}
