import { CanvasRelationAnalysisSession } from './canvasRelationAnalysisSession';
import { createCustomerOrdersJoin } from './canvasJoin.test-support';
import { source } from './canvasRelationalOperator.test-support';

export function selectedUnaryScenario() {
  const document = createCustomerOrdersJoin({
    left: source('left'),
    right: source('right'),
    targetNodeId: 'model',
  });
  const session = new CanvasRelationAnalysisSession('model');
  session.receive(document);
  const root = session.locate(session.rootId, session.revision);
  return { document, session, root };
}
