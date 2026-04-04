import { PlannerError, PlannerErrorCode } from '../domain/errors.js';

export type StepKindResourceTypeMapper = (stepKind: string) => string;

export const mapDbtStepKindToResourceType: StepKindResourceTypeMapper = (
  stepKind: string
): string => {
  if (stepKind === 'DBT_MODEL') return 'model';
  if (stepKind === 'DBT_TEST') return 'test';
  if (stepKind === 'DBT_SNAPSHOT') return 'snapshot';
  throw new PlannerError(
    PlannerErrorCode.INVALID_INPUT,
    `Unsupported stepKind in GenericGraphSourceV1 for this planner wave: ${stepKind}.`
  );
};
