/** Fail-closed boundary shared by authorized Transform SQL preparation consumers. */
export type CanvasTransformProjectionFailureReason =
  | 'selection_unavailable'
  | 'canvas_changed'
  | 'relation_outside_output_plan'
  | 'file_access_denied'
  | 'projection_unsupported';

export class CanvasTransformProjectionUnavailableError extends Error {
  public constructor(readonly reason: CanvasTransformProjectionFailureReason) {
    super(`Canvas Transform projection is unavailable: ${reason}`);
    this.name = 'CanvasTransformProjectionUnavailableError';
  }
}
