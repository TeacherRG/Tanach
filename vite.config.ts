/// <reference types="vitest" />
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [react(), tailwindcss()],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks: (id) => {
            if (id.includes('node_modules/firebase/') && id.includes('/firestore')) return 'firebase-firestore';
            if (id.includes('node_modules/firebase/') && id.includes('/auth')) return 'firebase-auth';
            if (id.includes('node_modules/firebase')) return 'firebase';
            if (id.includes('node_modules/motion') || id.includes('node_modules/framer-motion')) return 'motion';
            if (id.includes('node_modules/@google/genai')) return 'google-ai';
            if (id.includes('node_modules/lucide-react')) return 'lucide';
            const reactVendorPkgs = ['react-dom', 'react-markdown', 'remark', 'rehype', 'unified', 'vfile', 'hast', 'mdast'];
            if (reactVendorPkgs.some((p) => id.includes(`node_modules/${p}`))) return 'react-vendor';
            if (id.includes('node_modules/react')) return 'react-core';
            if (id.includes('node_modules/@hebcal')) return 'hebcal';
          },
        },
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
    },
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: './src/test/setup.ts',
    },
  };
});
