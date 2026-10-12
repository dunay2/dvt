/**
 * Owned concern: select a pure canvas draft scenario without transport dependencies.
 * @baseline GH-3578: fixture construction is independent of browser transport.
 * @decision Preserve scenario data and reuse the existing draft contract.
 * @consequence Consumers share one builder without browser globals or HTTP effects.
 * @version 1.0.0
 */
import { buildLargeWorkspaceGraphAuthoringDraft } from '../../../src/app/services/workspace/workspaceGraphDraftAuthoring.test.fixtures';

import { buildColumnMappingDraft } from './columnMapping';
import { buildDbtDraft } from './dbt';
import { buildGeneratedDraft } from './generated';
import { buildJoinDraft } from './join';
import { buildOrdinaryDraft } from './ordinary';
import { buildPerformanceDraft } from './performance';
import { buildProjectionDraft } from './projection';
import { buildScenarioDraft } from './scenario';
import type { CanvasAuthoringDraft, CanvasDraftScenarioOptions } from './scenario';
import { buildUnionDraft } from './union';
import { buildWarehouseDraft } from './warehouse';

export function buildCanvasAuthoringDraft(
  options: CanvasDraftScenarioOptions = {}
): CanvasAuthoringDraft {
  if (options.performanceGraphNodeCount != null)
    return buildPerformanceDraft(options.performanceGraphNodeCount);
  if (options.largeGraph) return buildLargeWorkspaceGraphAuthoringDraft();
  const canvas = {
    id: 'main-canvas',
    kind: options.canvasKind ?? 'transformation',
    title: options.title ?? (options.dbtGraph ? 'dbt graph' : 'Sales canvas'),
  };
  if (options.emptyCanvas)
    return buildScenarioDraft({ canvas, nodePositions: {}, nodes: [], edges: [] });
  if (options.substraitUnionAll) return buildUnionDraft(canvas);
  if (
    options.substraitPendingComposition ||
    options.substraitInnerJoin ||
    options.substraitNInputJoin
  )
    return buildJoinDraft(canvas, options);
  if (options.projectionModel || options.substraitUnsupported)
    return buildProjectionDraft(canvas, options);
  if (options.dbtGraph && options.importedWarehouseSource) return buildWarehouseDraft(canvas);
  if (options.dbtGraph) return buildDbtDraft(canvas, options);
  if (options.columnMapping) return buildColumnMappingDraft(canvas, options);
  if (options.authoringGenerated) return buildGeneratedDraft(canvas, options);
  return buildOrdinaryDraft(canvas, options);
}
