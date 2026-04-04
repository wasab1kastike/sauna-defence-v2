import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import pkg from './package.json';

const appVersion = typeof pkg.version === 'string' ? pkg.version : '0.0.0-dev';

export default defineConfig({
  base: '/',
  plugins: [react()],
  define: {
    __APP_VERSION__: JSON.stringify(appVersion)
  }
});
