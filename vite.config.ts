import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Vite configuration for the web client.  We set the project root to the
// `web` directory so that Vite treats `index.html` as the entry point.  The
// build output will be written to `web/dist` when running `vite build`.  A
// plugin is included to enable React with TypeScript.
export default defineConfig({
  root: 'web',
  server: {
    port: 5173
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true
  },
  plugins: [react()]
});