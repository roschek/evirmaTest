import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { AppProviders } from '@/app';
import { HomePage } from '@/pages/home';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppProviders>
      <HomePage />
    </AppProviders>
  </StrictMode>,
);
