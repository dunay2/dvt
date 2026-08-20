/** Owned concern: adapt the DVT visual-to-SQL command to one contextual Workbench contribution. */
import type { CanonicalEdge, CanonicalNode } from '../../types/canonical';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '../../components/ui/alert-dialog';
import { Button } from '../../components/ui/button';
import { useApplicationLanguageStore } from '../../stores/applicationLanguageStore';
import { hasVisualDvtTransformAuthoringAuthority } from './canvasDvtTransformAuthoringAuthority';
import { projectCanvasNodePresentationTruth } from './canvasNodePresentationProjection';
import type { CanvasNodeWorkbenchContribution } from './canvasNodeWorkbenchContribution';
import { resolveCanvasViewCopy } from './canvasCopyCatalog';

type BuildDvtVisualTransformToSqlWorkbenchContributionsOptions = Readonly<{
  node: CanonicalNode | null;
  nodes: readonly CanonicalNode[];
  edges: readonly CanonicalEdge[];
  onConvert: ((generatedSql: string) => void) | null;
}>;

function DvtVisualTransformToSqlWorkbenchAction({
  generatedSql,
  onConvert,
}: Readonly<{
  generatedSql: string;
  onConvert: (generatedSql: string) => void;
}>): JSX.Element {
  const applicationLanguage = useApplicationLanguageStore((state) => state.language);
  const copy = resolveCanvasViewCopy(applicationLanguage);

  return (
    <div className="flex justify-end pt-1">
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button
            type="button"
            variant="outline"
            data-slot="canvas-node-workbench-convert-visual-to-sql"
          >
            {copy.inspectorVisualTransformConvertToSqlLabel}
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{copy.inspectorVisualTransformConvertToSqlTitle}</AlertDialogTitle>
            <AlertDialogDescription>
              {copy.inspectorVisualTransformConvertToSqlDescription}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{copy.inspectorCancelLabel}</AlertDialogCancel>
            <AlertDialogAction onClick={() => onConvert(generatedSql)}>
              {copy.inspectorVisualTransformConvertToSqlLabel}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export function buildDvtVisualTransformToSqlWorkbenchContributions({
  node,
  nodes,
  edges,
  onConvert,
}: BuildDvtVisualTransformToSqlWorkbenchContributionsOptions): readonly CanvasNodeWorkbenchContribution[] {
  if (node == null || onConvert == null || !hasVisualDvtTransformAuthoringAuthority(node)) {
    return [];
  }

  const code = projectCanvasNodePresentationTruth({ node, nodes, edges }).code;
  if (code.kind !== 'generated') {
    return [];
  }

  return [
    {
      id: 'dvt-visual-transform-to-sql',
      nodeId: node.id,
      sectionId: 'code',
      placement: 'after-body',
      content: (
        <DvtVisualTransformToSqlWorkbenchAction generatedSql={code.content} onConvert={onConvert} />
      ),
    },
  ];
}
