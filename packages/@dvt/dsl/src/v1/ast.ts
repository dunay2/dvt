export type DslV1Operator = '=';

export interface DslV1Expression {
  readonly dslVersion: '1.0';
  readonly left: string;
  readonly operator: DslV1Operator;
  readonly right: string | number | boolean;
}
