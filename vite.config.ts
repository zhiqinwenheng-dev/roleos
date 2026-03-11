import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';

import { cloudflare } from "@cloudflare/vite-plugin";

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, __dirname, '');
  const apiProxyTarget = env.VITE_ROLEOS_API_PROXY_TARGET || 'http://127.0.0.1:3000';
  return {
    plugins: [react(), tailwindcss(), cloudflare()],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
      proxy: {
        '/auth': {
          target: apiProxyTarget,
          changeOrigin: true,
        },
        '/workspaces': {
          target: apiProxyTarget,
          changeOrigin: true,
        },
        '/plans': {
          target: apiProxyTarget,
          changeOrigin: true,
        },
        '/market/catalog': {
          target: apiProxyTarget,
          changeOrigin: true,
        },
        '/billing': {
          target: apiProxyTarget,
          changeOrigin: true,
        },
        '/admin': {
          target: apiProxyTarget,
          changeOrigin: true,
        },
      },
    },
  };
});