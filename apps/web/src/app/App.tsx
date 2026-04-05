import { RouterProvider } from 'react-router';

import { Toaster } from './components/ui/sonner';
import { router } from './routes';
import { AppServicesProvider } from './services/AppServicesContext';

export default function App() {
  return (
    <>
      <AppServicesProvider>
        <RouterProvider router={router} />
      </AppServicesProvider>
      <Toaster position="top-right" />
    </>
  );
}
