export type DeliveryCommand =
  | {
      readonly kind: 'ACK_DELIVERED';
      readonly receipt?: string;
    }
  | {
      readonly kind: 'ACK_IGNORED';
      readonly reasonCode: string;
      readonly detail?: string;
    }
  | {
      readonly kind: 'SCHEDULE_RETRY';
      readonly reasonCode: string;
      readonly detail?: string;
    }
  | {
      readonly kind: 'MOVE_TO_DLQ';
      readonly source: 'TERMINAL_FAILURE' | 'RETRY_EXHAUSTED';
      readonly reasonCode: string;
      readonly detail?: string;
    };
