/** Owned concern: guard the execution-selection recovery component boundary and rail vocabulary. */
import { describe, expect, it } from 'vitest';

import { readArchitectureSiblingSource } from '../architecture.test.support';

const MODEL_SOURCE = readArchitectureSiblingSource(
  import.meta.dirname,
  'canvasExecutionSelectionRecovery.ts'
);
const HOOK_SOURCE = readArchitectureSiblingSource(
  import.meta.dirname,
  'useCanvasExecutionSelectionRecovery.ts'
);
const AUTHORITY_ADAPTER_SOURCE = readArchitectureSiblingSource(
  import.meta.dirname,
  'canvasExecutionSelectionRecoveryAuthorityAdapter.ts'
);
const SCOPE_POLICY_SOURCE = readArchitectureSiblingSource(
  import.meta.dirname,
  'dbtExecutionScopePolicy.ts'
);
const VIEW_SOURCE = readArchitectureSiblingSource(
  import.meta.dirname,
  '../../components/shell/OperationalDrawerSelectionRecoveryView.tsx'
);
const PRESENTATION_PRIMITIVES_SOURCE = readArchitectureSiblingSource(
  import.meta.dirname,
  '../../components/shell/OperationalDrawerSelectionRecoveryPrimitives.tsx'
);
const AUTHORED_CONTROLLER_SOURCE = readArchitectureSiblingSource(
  import.meta.dirname,
  'useCanvasController.ts'
);
const EXTERNAL_AUTHORITY_CONTROLLER_SOURCE = readArchitectureSiblingSource(
  import.meta.dirname,
  'useDbtProjectFilesAuthorityController.ts'
);
const DRAWER_SOURCE = readArchitectureSiblingSource(
  import.meta.dirname,
  '../../components/shell/OperationalDrawerPanels.tsx'
);
const MESSAGES_SOURCE = readArchitectureSiblingSource(
  import.meta.dirname,
  '../../components/shell/operationalDrawerSelectionRecoveryMessages.ts'
);

describe('canvas execution-selection recovery architecture', () => {
  it('separates pure policy, state adapter, and presentation template', () => {
    expect(MODEL_SOURCE).not.toContain("from 'react'");
    expect(MODEL_SOURCE).not.toContain('Store');
    expect(MODEL_SOURCE).toContain('buildCanvasExecutionSelectionRecoveryReadModel');
    expect(MODEL_SOURCE).toContain('recoverCanvasExecutionSelection');
    expect(MODEL_SOURCE).toContain('buildDbtExecutionScopeGraph');
    expect(MODEL_SOURCE).not.toContain('isDbtExecutionSelectableNode');
    expect(SCOPE_POLICY_SOURCE).toContain('export function buildDbtExecutionScopeGraph');

    expect(HOOK_SOURCE).toContain("from './canvasExecutionSelectionRecovery'");
    expect(HOOK_SOURCE).toContain('setSelectionIntent');
    expect(HOOK_SOURCE).toContain('refreshAnalysis');
    expect(HOOK_SOURCE).not.toContain('Authoritative analysis could not be refreshed.');
    expect(AUTHORITY_ADAPTER_SOURCE).toContain('if (result.isError)');
    expect(AUTHORITY_ADAPTER_SOURCE).not.toContain(
      'Authoritative analysis could not be refreshed.'
    );

    expect(VIEW_SOURCE).not.toContain('className=');
    expect(VIEW_SOURCE).not.toContain('Store');
    expect(VIEW_SOURCE).toContain("from './OperationalDrawerSelectionRecoveryPrimitives'");
    expect(PRESENTATION_PRIMITIVES_SOURCE).toContain('selectionRecoveryClassNames');
    expect(PRESENTATION_PRIMITIVES_SOURCE).toContain('var(--status-success)');
    expect(VIEW_SOURCE).not.toContain('Use workspace scope');
    expect(MESSAGES_SOURCE).toContain('OperationalDrawerSelectionRecoveryMessages');
    expect(MESSAGES_SOURCE).not.toContain('Authoritative analysis could not be refreshed.');
  });

  it('uses one query rail and one explicit recovery command rail', () => {
    expect(MODEL_SOURCE).toContain("queryRail: 'CollectCanvasExecutionSelection'");
    expect(MODEL_SOURCE).toContain("commandRail: 'RecoverCanvasExecutionSelection'");
    expect(MODEL_SOURCE).toContain("rail: 'RecoverCanvasExecutionSelection'");
  });

  it('adapts authored and external dbt authorities into the same recovery component', () => {
    expect(AUTHORED_CONTROLLER_SOURCE).toContain('useCanvasExecutionSelectionRecovery({');
    expect(EXTERNAL_AUTHORITY_CONTROLLER_SOURCE).toContain('useCanvasExecutionSelectionRecovery({');
    expect(AUTHORED_CONTROLLER_SOURCE).toContain('buildCanvasExecutionSelectionRecoveryGraph({');
    expect(EXTERNAL_AUTHORITY_CONTROLLER_SOURCE).toContain(
      'buildCanvasExecutionSelectionRecoveryGraph({'
    );
    expect(AUTHORED_CONTROLLER_SOURCE).toContain('refreshCanvasExecutionSelectionAuthority');
    expect(EXTERNAL_AUTHORITY_CONTROLLER_SOURCE).toContain(
      'refreshCanvasExecutionSelectionAuthority'
    );
    expect(DRAWER_SOURCE).toContain('<OperationalDrawerSelectionRecoveryView');
  });
});
