import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import posthog from 'posthog-js'; // Importar posthog directamente
import { PostHogProvider } from 'posthog-js/react';
import './index.css';
import App from './App.jsx';

// Inicialización manual de PostHog
if (typeof window !== 'undefined') { // Asegurarse de que se ejecuta solo en el navegador
  posthog.init(import.meta.env.VITE_PUBLIC_POSTHOG_KEY, {
    api_host: import.meta.env.VITE_PUBLIC_POSTHOG_HOST,
    // Opcional: puedes añadir otras configuraciones aquí si es necesario
  });
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {/* Pasar el cliente ya inicializado al Provider */}
    <PostHogProvider client={posthog}>
      <HelmetProvider>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </HelmetProvider>
    </PostHogProvider>
  </StrictMode>,
);
