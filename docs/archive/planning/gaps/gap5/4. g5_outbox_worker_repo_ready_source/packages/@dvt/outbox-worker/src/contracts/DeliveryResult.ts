export type DeliveryResult =
  | {
      readonly kind: 'DELIVERED';
      readonly receipt?: string;
    }
  | {
      readonly kind: 'IGNORED';
      readonly reasonCode: string;
      readonly detail?: string;
    }
  | {
      readonly kind: 'RETRYABLE_FAILURE';
      readonly reasonCode: string;
      readonly detail?: string;
    }
  | {
      readonly kind: 'TERMINAL_FAILURE';
      readonly reasonCode: string;
      readonly detail?: string;
    };
