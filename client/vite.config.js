import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// En desarrollo, las peticiones a /api se reenvían al servidor (puerto 4000)
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: { '/api': process.env.VITE_PROXY_TARGET || 'http://localhost:4000' },
  },
});
