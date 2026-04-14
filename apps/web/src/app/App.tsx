import { useState } from 'react';
import { RouterProvider } from 'react-router';

import AppProviders from './AppProviders';
import { Toaster } from './components/ui/sonner';
import { createAppRouter } from './routes';

export default function App() {
  const [router] = useState(createAppRouter);

  return (
    <AppProviders>
      <RouterProvider router={router} />
      <Toaster position="top-right" />
    </AppProviders>
  );
}
