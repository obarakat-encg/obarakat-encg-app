// vite.config.js

import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Load environment variables based on the current mode
  const env = loadEnv(mode, process.cwd(), 'VITE_');

  return {
    plugins: [react()],
    // Crucial step: Use the define option to force injection
    define: {
      'import.meta.env.VITE_API_KEY': JSON.stringify(env.VITE_API_KEY),
      'import.meta.env.VITE_AUTH_DOMAIN': JSON.stringify(env.VITE_AUTH_DOMAIN),
      'import.meta.env.VITE_DB_URL': JSON.stringify(env.VITE_DB_URL),
      'import.meta.env.VITE_PROJECT_ID': JSON.stringify(env.VITE_PROJECT_ID),
      'import.meta.env.VITE_STORAGE_BUCKET': JSON.stringify(env.VITE_STORAGE_BUCKET),
      'import.meta.env.VITE_MSG_SENDER_ID': JSON.stringify(env.VITE_MSG_SENDER_ID),
      'import.meta.env.VITE_APP_ID': JSON.stringify(env.VITE_APP_ID),
      'import.meta.env.VITE_MEASUREMENT_ID': JSON.stringify(env.VITE_MEASUREMENT_ID),

      
    },
  };
});