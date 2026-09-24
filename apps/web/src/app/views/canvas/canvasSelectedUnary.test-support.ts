import { CanvasRelationAnalysisSession } from './canvasRelationAnalysisSession';
import { createDvtSubstraitJoinDraft } from './canvasDvtSubstraitJoinComposition';
import { source } from './canvasRelationalOperator.test-support';

export function selectedUnaryScenario() {
  const document = createDvtSubstraitJoinDraft({
    left: source('left'),
    right: source('right'),
    targetNodeId: 'model',
  });
  const session = new CanvasRelationAnalysisSession('model');
  session.receive(document);
  const root = session.locate(session.rootId, session.revision);
  return { document, session, root };
}
