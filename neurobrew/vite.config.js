import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: { proxy: { '/api': { target: 'http://127.0.0.1:8787', changeOrigin: false } } },
  preview: { proxy: { '/api': { target: 'http://127.0.0.1:8787', changeOrigin: false } } },
  build: {
    target: 'es2020',
    chunkSizeWarningLimit: 1200,
    rollupOptions: {
      output: { manualChunks: { three: ['three'], r3f: ['@react-three/fiber', '@react-three/drei', '@react-three/postprocessing'] } },
    },
  },
  test: { environment: 'node', include: ['src/**/*.test.js', 'server/**/*.test.js'] },
});
