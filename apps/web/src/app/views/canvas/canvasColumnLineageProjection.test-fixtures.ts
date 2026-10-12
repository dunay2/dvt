import { projectCanvasColumnLineage } from './canvasColumnLineageProjection';
import { projectCanvasNodePresentationTruth } from './canvasNodePresentationProjection';

export async function projectCanvasColumnLineageForGraph(
  args: Omit<Parameters<typeof projectCanvasColumnLineage>[0], 'presentations'>
) {
  const presentations = new Map(
    await Promise.all(
      args.nodes.map(
        async (node) =>
          [node.id, await projectCanvasNodePresentationTruth({ ...args, node })] as const
      )
    )
  );
  return projectCanvasColumnLineage({ ...args, presentations });
}
