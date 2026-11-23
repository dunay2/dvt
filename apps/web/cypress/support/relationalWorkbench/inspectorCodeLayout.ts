/** Verify Inspector geometry at supported viewport sizes using the rendered controls. */
function assertHeaderControls(panel: Element, panelBounds: DOMRect, viewport: Window): void {
  const controls = [
    ...panel.querySelectorAll<HTMLButtonElement>(
      '[data-slot="canvas-node-workbench-header-actions"] button'
    ),
  ];
  expect(controls.map((control) => control.dataset.slot)).to.deep.equal([
    'canvas-open-semantic-editor',
    'canvas-node-workbench-help',
    'canvas-node-workbench-close',
  ]);
  const controlBounds = controls.map((control) => control.getBoundingClientRect());
  controlBounds.forEach((control, index) => {
    expect(control.width, 'compact header target width').to.be.closeTo(28, 0.5);
    expect(control.height, 'compact header target height').to.be.closeTo(28, 0.5);
    expect(control.left).to.be.at.least(Math.max(panelBounds.left, 0));
    expect(control.right).to.be.at.most(Math.min(panelBounds.right, viewport.innerWidth));
    expect(control.top + control.height / 2).to.be.closeTo(
      controlBounds[0]!.top + controlBounds[0]!.height / 2,
      1
    );
    if (index > 0)
      expect(control.left, 'adjacent controls without overlap').to.be.closeTo(
        controlBounds[index - 1]!.right,
        0.5
      );
  });
}

function assertEditorLayout(editor: HTMLElement, width: number): void {
  const panel = editor.closest('[data-slot="canvas-node-workbench-panel"]')!;
  const content = editor.closest('[data-slot="canvas-node-workbench-code-content"]')!;
  const bounds = editor.getBoundingClientRect();
  const panelBounds = panel.getBoundingClientRect();
  const viewport = editor.ownerDocument.defaultView!;
  assertHeaderControls(panel, panelBounds, viewport);
  expect(bounds.height, 'usable code editor height').to.be.greaterThan(0);
  if (width >= 1024) expect(bounds.height).to.be.at.least(160);
  expect(bounds.bottom, 'editor fills remaining Code height').to.be.closeTo(
    content.getBoundingClientRect().bottom,
    2
  );
  expect(bounds.bottom, 'editor stays inside visible Inspector').to.be.at.most(
    Math.min(panelBounds.bottom, viewport.innerHeight)
  );
  expect(bounds.left, 'editor stays inside visible Inspector').to.be.at.least(
    Math.max(panelBounds.left, 0)
  );
  expect(bounds.right, 'editor stays inside Inspector width').to.be.at.most(
    Math.min(panelBounds.right, viewport.innerWidth)
  );
  expect(
    editor.querySelector('.view-lines')?.textContent?.replace(/\s/g, ''),
    'rendered canonical code'
  ).to.contain('schemaVersion');
}

function assertOutputSelectorLayout($output: JQuery<HTMLElement>): void {
  const output = $output[0]!;
  expect(output.scrollWidth, 'output has no horizontal overflow').to.be.at.most(output.clientWidth);
  const select = output.querySelector<HTMLSelectElement>('select')!;
  const label = select.labels?.[0];
  expect(label, 'native accessible output label').to.not.be.undefined;
  const caption = label!.querySelector('span')!.getBoundingClientRect();
  const control = select.getBoundingClientRect();
  expect(label!.textContent).to.contain('Output view');
  expect(caption.top + caption.height / 2, 'one compact selector row').to.be.closeTo(
    control.top + control.height / 2,
    1
  );
  expect(label!.getBoundingClientRect().height, 'no stacked label row').to.be.at.most(
    Math.max(caption.height, control.height) + 2
  );
  expect($output.find('p').text(), 'no technical document caption').not.to.match(
    /Canonical Substrait document|Documento Substrait|SHA-256/
  );
}

export function assertResponsiveCode(): void {
  for (const [width, height] of [
    [1366, 768],
    [1920, 1080],
    [3440, 1440],
    [900, 720],
    [640, 450],
  ] as const) {
    cy.viewport(width, height);
    cy.get('[data-slot="canvas-node-workbench-code-content"] .monaco-editor')
      .should('be.visible')
      .and(($editor) => assertEditorLayout($editor[0]!, width));
    cy.get('[data-slot="dvt-transform-output-view"]').should(assertOutputSelectorLayout);
    cy.get('[data-slot="canvas-node-workbench-panel"]').screenshot(
      `inspector-code-visible-${width}`
    );
  }
}

export function assertInspectorSqlEditorFits(): void {
  cy.get('[data-slot="canvas-node-workbench-code-content"] .monaco-editor').should(($viewer) => {
    const editor = $viewer[0]!;
    const panel = editor.closest('[data-slot="canvas-node-workbench-code-content"]')!;
    const bounds = editor.getBoundingClientRect();
    expect(bounds.height, 'SQL retains a usable editor height').to.be.at.least(160);
    expect(bounds.bottom, 'SQL fills the available height').to.be.closeTo(
      panel.getBoundingClientRect().bottom,
      2
    );
  });
}
