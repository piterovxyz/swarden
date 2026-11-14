import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/metrics': 'http://127.0.0.1:6701',
      '/api': 'http://127.0.0.1:6701',
    },
  },
});
