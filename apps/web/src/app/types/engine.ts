import type {
  EngineRunRef as ContractsEngineRunRef,
  EventEnvelope as ContractsRunEvent,
  PlanRef as ContractsPlanRef,
  RunContext as ContractsRunContext,
  RunStatus as ContractsRunStatus,
  RunStatusSnapshot as ContractsRunStatusSnapshot,
} from '@dvt/contracts';

export type PlanRef = ContractsPlanRef;
export type RunContext = ContractsRunContext;
export type RunStatus = ContractsRunStatus;
export type RunStatusSnapshot = ContractsRunStatusSnapshot;
export type RunEvent = ContractsRunEvent;
export type EngineRunRef = ContractsEngineRunRef;

export type RunEventsResponse = {
  events: RunEvent[];
  nextAfterSeq?: number;
};
