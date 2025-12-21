import { BrowserRouter } from 'react-router-dom';
import { ReactNode } from 'react';

interface RouteProviderProps {
  children: ReactNode;
}

export const RouteProvider = ({ children }: RouteProviderProps) => {
  return <BrowserRouter>{children}</BrowserRouter>;
};
