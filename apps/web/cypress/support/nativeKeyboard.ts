/** Send complete native keys when Chromium's default action needs more than Cypress supplies. */
export function pressNativeKey(
  key: 'Enter' | 'Escape' | 'Home' | 'End' | 'ArrowUp' | 'ArrowDown',
  modifiers: Readonly<{ alt?: boolean; shift?: boolean }> = {}
): void {
  const keyCode = { Enter: 13, Escape: 27, Home: 36, End: 35, ArrowUp: 38, ArrowDown: 40 }[key];
  // Chromium's protocol mask is Alt=1 and Shift=8; zero also clears stale modifier intent.
  const modifierMask = (modifiers.alt === true ? 1 : 0) | (modifiers.shift === true ? 8 : 0);
  let received: KeyboardEvent | undefined;
  let expectedTarget: Element | null = null;
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
      expectedTarget = document.activeElement;
      document.addEventListener(
        'keydown',
        (event) => {
          received = event;
        },
        { once: true, capture: true }
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
          modifiers: modifierMask,
          ...(key === 'Enter' && type === 'keyDown' ? { text: '\r', unmodifiedText: '\r' } : {}),
        },
      })
    );
  }
  cy.then(() => {
    expect(received?.key, 'the application received the requested native key').to.equal(key);
    expect(received?.code, 'the application received the requested key code').to.equal(key);
    expect(received?.isTrusted, 'the key originated in Chromium').to.equal(true);
    expect(received?.target, 'the focused application control received the key').to.equal(
      expectedTarget
    );
    expect(received?.altKey, 'the requested Alt modifier arrived').to.equal(modifiers.alt === true);
    expect(received?.shiftKey, 'the requested Shift modifier arrived').to.equal(
      modifiers.shift === true
    );
  });
}
