/** Cost projection attached to one canonical graph node. */
export interface NodeCostData {
  nodeId: string;
  cost: number;
  currency: string;
  breakdown?: Record<string, number>;
}
