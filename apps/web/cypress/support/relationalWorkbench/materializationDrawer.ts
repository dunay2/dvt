/** Observe the same loaded drawer across a draft write and its acknowledgement. */
import type { WorkspaceGraphAuthoringDraft } from '@dvt/contracts';

import { getE2eApiCalls } from '../e2eApiStub';

import { tableSelector, frameSelector, searchSelector } from './sampleGridInteractions';

const drawerSelector = '[data-slot="bottom-operational-drawer"]';
const tabSelector =
  '[data-slot="bottom-operational-drawer-tab"][data-tab="data:transform-customers"]';

export function observeLoadedDrawer(window: Cypress.AUTWindow): {
  assertContinuity(): void;
  disconnect(): void;
} {
  const drawer = window.document.querySelector<HTMLElement>(drawerSelector)!;
  const tab = window.document.querySelector<HTMLElement>(tabSelector)!;
  const search = window.document.querySelector<HTMLInputElement>(searchSelector)!;
  const table = window.document.querySelector<HTMLElement>(tableSelector)!;
  const frame = window.document.querySelector<HTMLElement>(frameSelector)!;
  const height = drawer.getBoundingClientRect().height;
  const scrollTop = frame.scrollTop;
  const tableText = table.textContent!;
  const disruptions: string[] = [];
  const observer = new window.MutationObserver(() => {
    if (![drawer, tab, search, table, frame].every((element) => element.isConnected))
      disruptions.push('loaded drawer DOM was removed');
    if (search.value !== 'customer' || tab.getAttribute('aria-selected') !== 'true')
      disruptions.push('loaded exploration state changed');
  });
  observer.observe(window.document.body, { childList: true, subtree: true, attributes: true });

  const assertContinuity = (): void => {
    cy.get(drawerSelector).should(($drawer) => {
      expect($drawer[0], 'same drawer').to.equal(drawer);
      expect(drawer.getBoundingClientRect().height, 'drawer layout').to.equal(height);
      expect(disruptions, 'no transient empty or replaced drawer').to.deep.equal([]);
    });
    cy.get(tabSelector).should('have.attr', 'aria-selected', 'true');
    cy.get(searchSelector)
      .should('have.value', 'customer')
      .and(($search) => {
        expect($search[0], 'same search control').to.equal(search);
      });
    cy.get(tableSelector).should(($table) => {
      expect($table[0], 'same loaded table').to.equal(table);
      expect(table.textContent, 'same loaded values and order').to.equal(tableText);
    });
    cy.get(frameSelector).should(($frame) => {
      expect($frame[0], 'same table viewport').to.equal(frame);
      expect(frame.scrollTop, 'loaded row position').to.equal(scrollTop);
    });
    cy.then(() => {
      expect(
        getE2eApiCalls(/\/transforms\/transform-customers\/data-sample$/, 'GET')
      ).to.have.length(1);
    });
  };

  return { assertContinuity, disconnect: () => observer.disconnect() };
}

type DeferredRequest = { wait: Promise<void>; release(): void; started: boolean };
type SaveGate = { put: DeferredRequest; get: DeferredRequest };
type DraftRequests = { begin(): SaveGate; end(): void };

function deferredRequest(): DeferredRequest {
  let release!: () => void;
  const wait = new Promise<void>((resolve) => {
    release = resolve;
  });
  return { wait, release, started: false };
}

export function holdDraftRequests(window: Cypress.AUTWindow): DraftRequests {
  const fetch = window.fetch.bind(window);
  let pending: SaveGate | undefined;
  window.fetch = async (input, init) => {
    const request = new window.Request(input, init);
    if (pending && new URL(request.url).pathname === '/workspace/graph/draft') {
      const gate = pending;
      if (request.method === 'PUT') {
        gate.put.started = true;
        await gate.put.wait;
      } else if (request.method === 'GET' && gate.put.started) {
        gate.get.started = true;
        await gate.get.wait;
      }
    }
    return fetch(input, init);
  };
  return {
    begin() {
      pending = { put: deferredRequest(), get: deferredRequest() };
      return pending;
    },
    end() {
      pending = undefined;
    },
  };
}

export function changeMaterializationDuringSave(
  materialized: string,
  saves: DraftRequests,
  assertContinuity: () => void
): void {
  cy.then(() => {
    const gate = saves.begin();
    const previousWrites = getE2eApiCalls('/workspace/graph/draft', 'PUT').length;
    cy.get('@modelNode').find('[data-slot="graph-node-materialization"]').click();
    cy.get('[role="menuitemradio"]')
      .contains(new RegExp(`^${materialized}$`))
      .click();
    cy.get('[role="menu"]').should('not.exist');
    cy.get('@modelNode')
      .find('[data-slot="graph-node-materialization"]')
      .should('have.text', materialized);
    assertContinuity();
    cy.wrap(null).should(() => expect(gate.put.started, 'save is held').to.equal(true));
    assertContinuity();
    cy.then(() => gate.put.release());
    cy.wrap(null).should(() =>
      expect(gate.get.started, 'acknowledgement read is held').to.equal(true)
    );
    assertContinuity();
    cy.then(() => gate.get.release());
    cy.get('[data-slot="canvas-draft-save-status"]').should('not.exist');
    cy.then(() => {
      saves.end();
      const writes = getE2eApiCalls('/workspace/graph/draft', 'PUT');
      expect(writes).to.have.length(previousWrites + 1);
      const saved = (writes.at(-1)!.body as { draft: WorkspaceGraphAuthoringDraft }).draft;
      const config = saved.nodes.find((node) => node.id === 'transform-customers')?.metadata
        ?.config;
      expect(config).to.include({ materialized });
      if (materialized === 'ephemeral') expect(config).not.to.have.property('resultTarget');
    });
    assertContinuity();
  });
}
