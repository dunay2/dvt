/**
 * Owned concern: apply and restore desktop viewport and accessibility media emulation.
 * @baseline GH-3920: Extract unchanged proof from the existing Shell composition spec.
 * @consequence Scenario order, fixtures and browser obligations remain owned by the spec.
 */
export function clearBrowserEmulation(): void {
  // Touch emulation owns a separate spec target; resetting it here changes desktop input.
  cy.then(() =>
    Cypress.automation('remote:debugger:protocol', {
      command: 'Emulation.clearDeviceMetricsOverride',
    })
  );
  cy.then(() =>
    Cypress.automation('remote:debugger:protocol', {
      command: 'Emulation.setEmulatedMedia',
      params: { media: '', features: [] },
    })
  );
}

export function emulateBrowserZoom(
  zoom: 2 | 4,
  physicalViewport: Readonly<{ width: number; height: number }>
): void {
  const cssViewport = {
    width: Math.floor(physicalViewport.width / zoom),
    height: Math.floor(physicalViewport.height / zoom),
  };
  cy.viewport(cssViewport.width, cssViewport.height);
  cy.then(() =>
    Cypress.automation('remote:debugger:protocol', {
      command: 'Emulation.setDeviceMetricsOverride',
      params: {
        width: cssViewport.width,
        height: cssViewport.height,
        deviceScaleFactor: zoom,
        mobile: false,
        screenWidth: physicalViewport.width,
        screenHeight: physicalViewport.height,
      },
    })
  );
  cy.window().should((window) => {
    expect(window.innerWidth).to.equal(cssViewport.width);
    expect(window.innerHeight).to.equal(cssViewport.height);
    expect(window.devicePixelRatio).to.equal(zoom);
  });
}

export function emulateAccessibilityMedia(): void {
  cy.then(() =>
    Cypress.automation('remote:debugger:protocol', {
      command: 'Emulation.setEmulatedMedia',
      params: {
        media: '',
        features: [
          { name: 'prefers-reduced-motion', value: 'reduce' },
          { name: 'forced-colors', value: 'active' },
        ],
      },
    })
  );
  cy.window().should((window) => {
    expect(window.matchMedia('(prefers-reduced-motion: reduce)').matches).to.equal(true);
    expect(window.matchMedia('(forced-colors: active)').matches).to.equal(true);
  });
}
