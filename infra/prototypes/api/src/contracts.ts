export type NodeStatus = 'PENDING' | 'RUNNING' | 'SUCCESS' | 'FAILED';

export interface NodeStatusPayloadV1 {
  nodeId: string;
  status: NodeStatus;
  attempt: number;
  errorMessage?: string;
}

export interface NodeStatusEventV1 {
  eventId: string;
  runId: string;
  seq: number;
  type: 'node.status';
  ts: string;
  payload: NodeStatusPayloadV1;
}
