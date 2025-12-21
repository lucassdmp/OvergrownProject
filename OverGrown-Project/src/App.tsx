import { AppProvider } from './providers';
import { AppRoutes } from './routes';
import './App.css';

function App() {
  return (
    <AppProvider>
      <AppRoutes />
    </AppProvider>
  );
}

export default App;
