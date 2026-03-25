import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import ErrorBoundary from './components/ErrorBoundary.tsx';
import { LanguageProvider } from './data/LanguageContext.tsx';
import { Toaster } from 'sonner';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <LanguageProvider>
        <App />
        <Toaster richColors position="top-center" />
      </LanguageProvider>
    </ErrorBoundary>
  </StrictMode>,
);
