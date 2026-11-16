import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'MOCKUP_');
  return {
    plugins: [react()],
    server: {
      host: '127.0.0.1',
      port: 5174,
      strictPort: true,
      proxy: {
        '/api': {
          target: env.MOCKUP_BACKEND_URL || 'http://127.0.0.1:4000',
          rewrite: (path) => path.replace(/^\/api/, ''),
        },
      },
    },
  };
});
