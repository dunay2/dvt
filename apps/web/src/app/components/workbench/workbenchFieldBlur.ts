/**
 * Owned concern: admit field blur acceptance independently from workbench navigation.
 * @baseline ADR-0069: navigation and field acceptance are separate presentation intents.
 * @decision Retain local input when focus enters a declared navigation control or its surface hides.
 * @consequence Switching retained views cannot publish a pending field value.
 * @version 1.0.0
 */
export function canAcceptWorkbenchFieldBlur(field: HTMLElement, next: EventTarget | null): boolean {
  return (
    field.closest('[hidden], [inert], [aria-hidden="true"]') == null &&
    !(next instanceof Element && next.closest('[data-workbench-navigation]') != null)
  );
}
