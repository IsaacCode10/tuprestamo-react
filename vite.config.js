import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // Isaac: Esta sección es la que soluciona el problema en tu máquina local.
  // Redirige las llamadas a /api desde tu localhost hacia el servidor de Vercel.
  // Si tu URL de Vercel cambia, solo necesitas actualizar la línea 'target'.
  server: {
    proxy: {
      '/api': {
        target: 'https://tuprestamo-react.vercel.app',
        changeOrigin: true,
      },
    },
  },
  optimizeDeps: {
    include: ['react-helmet-async'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    // Evita warnings por chunks grandes; los splits ya están con lazy load
    chunkSizeWarningLimit: 1000,
  },
})
