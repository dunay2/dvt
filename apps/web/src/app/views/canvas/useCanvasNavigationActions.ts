import { useCallback } from 'react';
import { useNavigate } from 'react-router';

export function useCanvasNavigationActions() {
  const navigate = useNavigate();

  const handleRunStarted = useCallback(
    (runId: string) => {
      void navigate(`/runs/${runId}`);
    },
    [navigate]
  );

  return {
    handleRunStarted,
  };
}
