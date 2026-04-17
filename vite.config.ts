/// <reference types="vitest" />
import { defineConfig, type CSSOptions } from 'vite';
import react from '@vitejs/plugin-react';
import svgr from 'vite-plugin-svgr';
import dts from 'vite-plugin-dts';
import { resolve } from 'path';

const cssConfig: CSSOptions = {
  preprocessorOptions: {
    scss: {
      api: 'modern-compiler',
    } as Record<string, unknown>,
  },
};

const testConfig = {
  globals: true,
  environment: 'jsdom',
  setupFiles: ['./src/test/setup.ts'],
  css: true,
  exclude: ['node_modules', 'dist', 'e2e'],
} as const;

export default defineConfig(({ mode }) => {
  if (mode === 'development') {
    return {
      css: cssConfig,
      plugins: [react(), svgr()],
      root: '.',
      publicDir: false,
      resolve: {
        alias: {
          '@': resolve(__dirname, 'src'),
        },
      },
      test: testConfig,
    };
  }

  return {
    css: cssConfig,
    plugins: [
      react(),
      svgr(),
      dts({
        include: ['src'],
        outDir: 'dist',
        rollupTypes: true,
      }),
    ],
    resolve: {
      alias: {
        '@': resolve(__dirname, 'src'),
      },
    },
    build: {
      lib: {
        entry: resolve(__dirname, 'src/index.ts'),
        name: 'TranslatorGraphView',
        formats: ['es', 'cjs'],
        fileName: (format) => `index.${format === 'es' ? 'js' : 'cjs'}`,
      },
      rollupOptions: {
        external: ['react', 'react-dom', 'react/jsx-runtime', /^elkjs/],
        output: {
          globals: {
            react: 'React',
            'react-dom': 'ReactDOM',
            'react/jsx-runtime': 'jsxRuntime',
          },
          assetFileNames: (assetInfo) => {
            if (assetInfo.name === 'style.css') return 'styles.css';
            return assetInfo.name || 'asset';
          },
        },
      },
      cssCodeSplit: false,
    },
    test: testConfig,
  };
});
