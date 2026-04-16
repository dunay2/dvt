import type {
  CanonicalRunStatus as ContractsCanonicalRunStatus,
  EngineRunRef as ContractsEngineRunRef,
  EventEnvelope as ContractsRunEvent,
  PlanRef as ContractsPlanRef,
  RunContext as ContractsRunContext,
  RunStatus as ContractsRunStatus,
} from '@dvt/contracts';

export type PlanRef = ContractsPlanRef;
export type RunContext = ContractsRunContext;
export type RunStatus = ContractsRunStatus;
export type CanonicalRunStatus = ContractsCanonicalRunStatus;
export type RunEvent = ContractsRunEvent;
export type EngineRunRef = ContractsEngineRunRef;

export type RunEventsResponse = {
  events: RunEvent[];
  nextAfterSeq?: number;
};
