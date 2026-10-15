/**
 * Owned concern: keep Canvas composition appearance in its stylesheet owners.
 * @baseline GH-3629: embedded utilities survived a partial presentation extraction.
 * @decision Reuse the shared ownership assertion; do not duplicate behavioral suites.
 * @consequence This guard proves ownership, not browser geometry or interaction behavior.
 * @version 1.0.0
 */
import { readFileSync } from 'node:fs';
import { basename, resolve } from 'node:path';
import { describe, it } from 'vitest';

import { assertComponentStyleOwnership } from '../../../testing/componentStyleOwnership.test.support';

describe('Canvas composition stylesheet ownership', () => {
  it.each([
    '../../plugins/graph/GraphNodeColumnPiece',
    'CanvasRelationalTreeJoinEditor',
    'CanvasRelationalTreeWorkbench',
    'CanvasShell',
    'CanvasWorkspaceMenuControls',
    'DvtSubstraitJoinPredicateEditors',
    'SemanticWorkbenchJoinConditionEditor',
    'join-condition/JoinConditionForm',
  ])('%s reuses its external appearance owner', (owner) => {
    assertComponentStyleOwnership({
      componentSource: readFileSync(resolve(import.meta.dirname, `${owner}.tsx`), 'utf8'),
      stylesheetSource: readFileSync(resolve(import.meta.dirname, `${owner}.module.css`), 'utf8'),
      stylesheetImport: `./${basename(owner)}.module.css`,
    });
  });
});
