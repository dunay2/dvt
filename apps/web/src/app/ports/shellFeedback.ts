export interface ShellFeedbackPort {
  success(message: string): void;
  error(message: string): void;
}
