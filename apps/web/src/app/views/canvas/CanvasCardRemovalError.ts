/**
 * Owned concern: name card-removal admission failures without presentation prose.
 * @baseline ADR-0064: stale or unavailable authoring identity cannot authorize edits.
 * @decision Presentation translates typed reasons; the command never guesses a replacement.
 * @consequence Rejected consent leaves the current graph intact.
 * @version 1.0.0
 */
export const CARD_REMOVAL_REJECTION = {
  unavailable: 'card_unavailable',
  stale: 'card_removal_stale',
  readOnly: 'card_removal_read_only',
} as const;

export type CanvasCardRemovalRejection =
  (typeof CARD_REMOVAL_REJECTION)[keyof typeof CARD_REMOVAL_REJECTION];

export class CanvasCardRemovalError extends Error {
  constructor(readonly code: CanvasCardRemovalRejection) {
    super(code);
    this.name = 'CanvasCardRemovalError';
  }
}
