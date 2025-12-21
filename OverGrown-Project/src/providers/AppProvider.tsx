import { ReactNode } from 'react';
import { AuthProvider } from './AuthProvider';
import { ThemeProvider } from './ThemeProvider';
import { RouteProvider } from './RouteProvider';

interface AppProviderProps {
  children: ReactNode;
}

export const AppProvider = ({ children }: AppProviderProps) => {
  return (
    <ThemeProvider>
      <AuthProvider>
        <RouteProvider>{children}</RouteProvider>
      </AuthProvider>
    </ThemeProvider>
  );
};
