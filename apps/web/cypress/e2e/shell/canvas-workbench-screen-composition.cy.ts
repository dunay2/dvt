/**
 * Owned concern: verify the governed Canvas entry screen chrome in browser e2e.
 * @baseline GH-3610: Bezier dependencies use oriented SVG markers, not manual triangles.
 * @decision Requery actual glyph/edge invariants within the existing deadline after media changes.
 * @consequence Direction, node inspection and project-file independence retain real browser proof.
 * @version 1.0.1
 */

import { waitForE2eApiCall } from '../../support/e2eApiStub';
import { pressNativeKey } from '../../support/nativeKeyboard';
import { hoverWorkbenchCard } from '../../support/relationalWorkbench/pointer';
import { assertDirectionalScreenComposition } from '../../support/screenComposition/focusProof';
import { assertNarrowScreenComposition } from '../../support/screenComposition/narrowProof';
import {
  stubScreenCompositionScenario,
  type ScreenCompositionFixtureInput,
  type ScreenCompositionScenario,
} from '../../support/screenComposition/scenario';
import { assertStartupScreenComposition } from '../../support/screenComposition/startupProof';
import { clearBrowserEmulation } from '../../support/shellWorkbench/browserEmulation';
import {
  E2E_WORKSPACE_SESSION,
  visitWithE2eWorkspaceSession,
} from '../../support/workspaceSession';
const ALTERNATE_WORKSPACE_SESSION = {
  tenantId: E2E_WORKSPACE_SESSION.tenantId,
  projectId: 'e2e-project-alt',
  environmentId: 'staging',
} as const;

const ALTERNATE_PROJECT_WORKSPACE = {
  ...ALTERNATE_WORKSPACE_SESSION,
  projectName: 'Alternate Project',
} as const;

const MODEL_PATH = 'models/analytics/model_orders.sql';
const MODEL_SQL = `select order_id,
       customer_id,
       total_amount
from raw.orders`;
const ORPHAN_PATH = 'models/analytics/orphan_metrics.sql';
const ORPHAN_SQL = `select metric_date,
       gross_revenue,
       refund_amount
from analytics.daily_metrics
where metric_date >= current_date
  - interval '30 days'`;
const ALTERNATE_MODEL_PATH = 'models/staging/alternate_orders.sql';
const ALTERNATE_MODEL_SQL = `select order_id, status
from staging.alternate_orders`;
const CLIPBOARD_EOL = Cypress.platform === 'win32' ? '\r\n' : '\n';

const fixtureInput: ScreenCompositionFixtureInput = {
  ALTERNATE_WORKSPACE_SESSION,
  ALTERNATE_PROJECT_WORKSPACE,
  MODEL_PATH,
  MODEL_SQL,
  ORPHAN_PATH,
  ORPHAN_SQL,
  ALTERNATE_MODEL_PATH,
  ALTERNATE_MODEL_SQL,
  CLIPBOARD_EOL,
};

describe('Canvas workbench screen composition', () => {
  let scenario: ScreenCompositionScenario;

  beforeEach(() => {
    scenario = stubScreenCompositionScenario(fixtureInput);
  });

  afterEach(() => {
    clearBrowserEmulation();
  });

  it('reveals compact Focus chrome by pointer or keyboard and retains an open View menu', () => {
    // Auto-hide must not trap users in Focus or replace the route they are working on.
    visitWithE2eWorkspaceSession('/canvas');
    waitForE2eApiCall('/workspace/graph/draft', 'GET');
    cy.window().should((window) => {
      expect(
        window.matchMedia('(hover: hover) and (pointer: fine)').matches,
        'desktop input profile'
      ).to.equal(true);
    });
    cy.get('[data-slot="shell-top-bar"]').should(($header) => {
      expect($header[0]!.getBoundingClientRect().height).to.be.at.most(32);
    });
    cy.get('[data-slot="app-shell-outlet"]').then(($outlet) => {
      cy.get('[data-slot="shell-menu-trigger"]').click();
      cy.contains('[role="menuitemcheckbox"]', /Focus Mode|Modo foco/).click();
      // Radix restores trigger focus; leave it before checking the pointer-only hide path.
      cy.get('[data-slot="app-shell-outlet"]').click('bottomRight');
      hoverWorkbenchCard('[data-slot="app-shell-frame"]');
      cy.get('[role="menu"]').should('not.exist');
      cy.get('[data-slot="app-shell-header-host"]')
        .should('have.attr', 'data-focus-mode', 'true')
        .and(($host) => {
          expect($host[0]!.matches(':hover'), 'pointer is outside header').to.equal(false);
          expect(
            $host[0]!.querySelector(':focus-visible'),
            'keyboard focus is outside header'
          ).to.equal(null);
        });
      cy.get('[data-slot="shell-top-bar"]').should(($header) => {
        expect($header[0]!.getBoundingClientRect().bottom).to.be.at.most(0);
      });
      hoverWorkbenchCard('[data-slot="app-shell-frame"]', 0.001);
      cy.get('[data-slot="shell-menu-trigger"]').should('be.visible').click();
      hoverWorkbenchCard('[data-slot="app-shell-frame"]');
      cy.get('[data-slot="shell-top-bar"]').should(($header) => {
        expect($header[0]!.getBoundingClientRect().top).to.equal(0);
      });
      cy.get('[role="menu"]').should('be.visible');
      pressNativeKey('Escape');
      cy.get('[data-slot="app-shell-skip-link"]').focus();
      cy.press(Cypress.Keyboard.Keys.TAB);
      cy.focused().closest('[data-slot="app-shell-header-host"]').should('exist');
      cy.get('[data-slot="shell-top-bar"]').should(($header) => {
        expect($header[0]!.getBoundingClientRect().top).to.equal(0);
      });
      cy.get('[data-slot="shell-menu-trigger"]').click();
      cy.contains('[role="menuitemcheckbox"]', /Focus Mode|Modo foco/).click();
      cy.get('[data-slot="app-shell-outlet"]').should(($current) => {
        expect($current[0]).to.equal($outlet[0]);
      });
      cy.get('[data-slot="app-shell-left-navigation"]').should('be.visible');
    });
  });

  it('keeps Canvas startup commands route-local and global navigation directly visible on the left', () => {
    assertStartupScreenComposition(fixtureInput);
  });

  it('keeps grouped actions, dialogs, language controls and exits visible in a narrow viewport', () => {
    assertNarrowScreenComposition();
  });

  it('keeps directional focus, node inspection and complete project files independent', () => {
    assertDirectionalScreenComposition(fixtureInput, scenario);
  });
});
