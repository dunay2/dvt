import { RouterProvider } from 'react-router';

import AppProviders from './AppProviders';
import { Toaster } from './components/ui/sonner';
import { router } from './routes';

export default function App() {
  return (
    <AppProviders>
      <RouterProvider router={router} />
      <Toaster position="top-right" />
    </AppProviders>
  );
}
