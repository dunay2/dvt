import { toast } from 'sonner';

import type { ShellFeedbackPort } from '../../ports/shellFeedback';

export function createToastShellFeedbackPort(): ShellFeedbackPort {
  return {
    success: (message) => {
      toast.success(message);
    },
    error: (message) => {
      toast.error(message);
    },
  };
}
