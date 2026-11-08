/** Send complete native keys when Chromium's default action needs more than Cypress supplies. */
export function pressNativeKey(
  key: 'Enter' | 'Escape' | 'Home' | 'End' | 'ArrowUp' | 'ArrowDown'
): void {
  const keyCode = { Enter: 13, Escape: 27, Home: 36, End: 35, ArrowUp: 38, ArrowDown: 40 }[key];
  let received: KeyboardEvent | undefined;
  // A DOM-focused control alone does not prove Chromium is targeting the AUT frame.
  cy.window().then((window) => {
    window.focus();
  });
  cy.document()
    .should((document) => {
      expect(document.hasFocus(), 'the application document owns native keyboard focus').to.equal(
        true
      );
      expect(document.activeElement, 'a control owns native keyboard focus').not.to.equal(
        document.body
      );
    })
    .then((document) => {
      document.addEventListener(
        'keydown',
        (event) => {
          received = event;
        },
        { once: true }
      );
    });
  for (const type of ['keyDown', 'keyUp']) {
    cy.then(() =>
      Cypress.automation('remote:debugger:protocol', {
        command: 'Input.dispatchKeyEvent',
        params: {
          type,
          key,
          code: key,
          windowsVirtualKeyCode: keyCode,
          nativeVirtualKeyCode: keyCode,
          ...(key === 'Enter' && type === 'keyDown' ? { text: '\r', unmodifiedText: '\r' } : {}),
        },
      })
    );
  }
  cy.then(() => {
    expect(received?.key, 'the application received the requested native key').to.equal(key);
    expect(received?.isTrusted, 'the key originated in Chromium').to.equal(true);
  });
}
