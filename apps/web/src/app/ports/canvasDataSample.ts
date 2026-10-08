/** Owned concern: define card-owned Canvas data samples and the Transform sample query port. */
import type {
  SourceDataSampleResponse,
  TransformDataSampleRequest,
  TransformDataSampleResponse,
} from '@dvt/contracts';

export type CanvasDataSample = SourceDataSampleResponse | TransformDataSampleResponse;

export class CanvasTransformDataSampleQueryError extends Error {
  public constructor() {
    super('The Canvas Transform data sample could not be read.');
    this.name = 'CanvasTransformDataSampleQueryError';
  }
}

/** Expected admission rejection; the view owns localized copy, never raw API prose. */
export class CanvasTransformDataSampleOutsideOutputPlanError extends CanvasTransformDataSampleQueryError {
  static readonly reason = 'transform_data_sample_relation_outside_output_plan';
  constructor() {
    super();
    this.name = 'CanvasTransformDataSampleOutsideOutputPlanError';
  }
}

export interface ICanvasTransformDataSampleQueryPort {
  previewTransformRows(input: TransformDataSampleRequest): Promise<TransformDataSampleResponse>;
}
