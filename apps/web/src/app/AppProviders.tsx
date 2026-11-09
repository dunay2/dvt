import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect, useLayoutEffect, useState, type ReactNode } from 'react';

import {
  createHydrationCompleteBootstrapCommand,
  createServicesReadyBootstrapCommand,
} from './bootstrap/appBootstrapCommands';
import { setBootstrapStepStatus } from './bootstrap/appBootstrapScreen';
import { AppServicesProvider, type AppServicesProviderProps } from './services/AppServicesContext';

function createAppQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        refetchOnWindowFocus: false,
        retry: 1,
      },
    },
  });
}

type AppProvidersProps = Readonly<{
  children: ReactNode;
  overrides?: AppServicesProviderProps['overrides'];
  queryClient?: QueryClient;
}>;

export default function AppProviders({ children, overrides, queryClient }: AppProvidersProps) {
  const [ownedQueryClient] = useState(createAppQueryClient);
  const resolvedQueryClient = queryClient ?? ownedQueryClient;

  // Mounting is a React commit acknowledgement, independent of suspended browser painting.
  useLayoutEffect(() => {
    setBootstrapStepStatus(createHydrationCompleteBootstrapCommand());
  }, []);

  useEffect(() => {
    setBootstrapStepStatus(createServicesReadyBootstrapCommand());
  }, []);

  return (
    <AppServicesProvider overrides={overrides}>
      <QueryClientProvider client={resolvedQueryClient}>{children}</QueryClientProvider>
    </AppServicesProvider>
  );
}
