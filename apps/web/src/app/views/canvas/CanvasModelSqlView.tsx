/** Owned concern: show SQL derived from the applied canonical Model, never the local edit draft. */
import { useEffect, useState } from 'react';
import { MonacoCodeViewer } from '../../components/monaco/MonacoCodeViewer';
import type { CanonicalEdge, CanonicalNode } from '../../types/canonical';
import { projectDvtSubstraitTransformOutputToPostgresSql } from './canvasDvtSubstraitOutputProjection';
import type { CanvasSemanticEditorCopy } from './canvasSemanticEditorCopy';

export function CanvasModelSqlView({
  transformNode,
  nodes,
  edges,
  copy,
}: Readonly<{
  transformNode: CanonicalNode;
  nodes: readonly CanonicalNode[];
  edges: readonly CanonicalEdge[];
  copy: CanvasSemanticEditorCopy;
}>): JSX.Element {
  const [result, setResult] = useState<{ sql: string } | { error: true } | null>(null);
  useEffect(() => {
    let current = true;
    setResult(null);
    void projectDvtSubstraitTransformOutputToPostgresSql({ transformNode, nodes, edges }).then(
      (sql) => {
        if (current) setResult({ sql });
      },
      () => {
        if (current) setResult({ error: true });
      }
    );
    return () => {
      current = false;
    };
  }, [transformNode, nodes, edges]);
  return (
    <section data-slot="canvas-model-sql" className="flex h-full min-h-0 flex-col gap-3 p-4">
      <p className="text-xs text-(--text-muted)">{copy.sqlHint}</p>
      {result == null ? (
        <p role="status">{copy.loading}</p>
      ) : 'error' in result ? (
        <p role="alert" className="text-sm text-(--status-danger)">
          {copy.sqlError}
        </p>
      ) : (
        <MonacoCodeViewer
          ariaLabel={copy.sql}
          language="sql"
          loadingLabel={copy.sql}
          containerClassName="min-h-0 flex-1"
          value={result.sql}
        />
      )}
    </section>
  );
}
