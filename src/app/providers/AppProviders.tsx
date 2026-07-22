import type { ReactNode } from 'react';
import { Provider } from 'react-redux';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { store } from '../store';
import { theme } from '../theme';

export const AppProviders = ({ children }: { children: ReactNode }) => (
  <Provider store={store}>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      {children}
    </ThemeProvider>
  </Provider>
);
