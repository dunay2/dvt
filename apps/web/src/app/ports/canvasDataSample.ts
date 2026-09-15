/** Owned concern: define card-owned Canvas data samples and the Transform sample query port. */
import type {
  SourceDataSampleResponse,
  TransformDataSampleRequest,
  TransformDataSampleResponse,
} from '@dvt/contracts';

export type CanvasDataSample = SourceDataSampleResponse | TransformDataSampleResponse;

export interface ICanvasTransformDataSampleQueryPort {
  previewTransformRows(input: TransformDataSampleRequest): Promise<TransformDataSampleResponse>;
}
