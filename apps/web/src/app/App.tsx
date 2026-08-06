import { RouterProvider } from 'react-router';

import AppProviders from './AppProviders';
import { Toaster } from './components/ui/sonner';
import { createAppRouter } from './routes';
import { flushRouterUpdate } from './routerFlushSync';

export default function App() {
  const router = createAppRouter();

  return (
    <AppProviders>
      <RouterProvider router={router} flushSync={flushRouterUpdate} />
      <Toaster position="top-right" />
    </AppProviders>
  );
}
