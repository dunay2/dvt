/** Render compiler feedback without independently interpreting an expression. */
import type { CanvasSemanticEditorCopy } from './canvasSemanticEditorCopy';
import type { projectFormulaFeedback } from './canvasFormulaAssist';
import { CanvasRelationalScalarTree } from './CanvasRelationalScalarTree';

export function DerivedOutputFormulaFeedback({
  feedback,
  copy,
  empty,
}: Readonly<{
  feedback: ReturnType<typeof projectFormulaFeedback>;
  copy: CanvasSemanticEditorCopy['derivedOutput'];
  empty: boolean;
}>): JSX.Element {
  if (empty) return <p className="formula-muted">{copy.formulaHint}</p>;
  if (!feedback.ok)
    return (
      <p role="status" className="formula-diagnostic">
        {feedback.message}
      </p>
    );
  return (
    <section className="formula-result" aria-label={copy.previewLabel}>
      <div className="formula-editor-heading" role="status">
        <span>{copy.resultType}</span>
        <code>{feedback.dataType}</code>
      </div>
      <p className="formula-muted">
        {copy.dependencies}:{' '}
        {feedback.dependencies.map((field) => field.name).join(', ') || copy.noDependencies}
      </p>
      <div className="formula-result-tree">
        <CanvasRelationalScalarTree compact graph={feedback.graph} />
      </div>
      <p className="formula-muted">{copy.localValidation}</p>
    </section>
  );
}
