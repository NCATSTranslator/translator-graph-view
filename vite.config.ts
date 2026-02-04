import { defineConfig, type CSSOptions } from 'vite';
import react from '@vitejs/plugin-react';
import dts from 'vite-plugin-dts';
import { resolve } from 'path';

const cssConfig: CSSOptions = {
  preprocessorOptions: {
    scss: {
      api: 'modern-compiler',
    } as Record<string, unknown>,
  },
};

export default defineConfig(({ mode }) => {
  if (mode === 'development') {
    return {
      css: cssConfig,
      plugins: [react()],
      root: '.',
      publicDir: false,
      resolve: {
        alias: {
          '@': resolve(__dirname, 'src'),
        },
      },
    };
  }

  return {
    css: cssConfig,
    plugins: [
      react(),
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
        external: ['react', 'react-dom', 'react/jsx-runtime'],
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
  };
});
