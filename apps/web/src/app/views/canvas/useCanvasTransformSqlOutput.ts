/**
 * Owned concern: retain only a current, server-authorized Transform SQL query result.
 * Reason: Code and Model Output share request currentness without sharing selection state.
 * Corner invariant: an obsolete completion cannot cross graph, Canvas, scope or port identity.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  projectDvtSubstraitTransformOutputToPostgresSql,
  type DvtSubstraitTransformOutputProjectionArgs,
} from './canvasDvtSubstraitOutputProjection';

type DerivedSqlState =
  | Readonly<{ status: 'idle' }>
  | Readonly<{ status: 'loading' | 'error'; input: DvtSubstraitTransformOutputProjectionArgs }>
  | Readonly<{ status: 'ready'; sql: string; input: DvtSubstraitTransformOutputProjectionArgs }>;

export function useCanvasTransformSqlOutput({
  transformNode,
  nodes,
  edges,
  codeProjection,
}: DvtSubstraitTransformOutputProjectionArgs) {
  const [state, setState] = useState<DerivedSqlState>({ status: 'idle' });
  const requestId = useRef(0);
  const isCurrent =
    state.status !== 'idle' &&
    state.input.transformNode === transformNode &&
    state.input.nodes === nodes &&
    state.input.edges === edges &&
    state.input.codeProjection === codeProjection;

  useEffect(
    () => () => {
      requestId.current += 1;
    },
    [transformNode, nodes, edges, codeProjection]
  );

  const request = useCallback((): void => {
    const currentRequestId = ++requestId.current;
    const input = { transformNode, nodes, edges, codeProjection };
    setState({ status: 'loading', input });
    void projectDvtSubstraitTransformOutputToPostgresSql(input).then(
      (sql) => {
        if (requestId.current === currentRequestId) setState({ status: 'ready', sql, input });
      },
      () => {
        if (requestId.current === currentRequestId) setState({ status: 'error', input });
      }
    );
  }, [transformNode, nodes, edges, codeProjection]);

  return { state, isCurrent, request };
}
