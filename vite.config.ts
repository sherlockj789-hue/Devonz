import { reactRouter } from '@react-router/dev/vite';
import UnoCSS from 'unocss/vite';
import type { PluginOption } from 'vite';
import { defineConfig } from 'vite';
import { nodePolyfills } from 'vite-plugin-node-polyfills';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig((config) => {
  return {
    server: {
      fs: {
        strict: false,
      },
    },

    define: {
      'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV),
    },

    build: {
      target: 'esnext',
      sourcemap: false, // 🔥 FIX: disable source maps
      rollupOptions: {
        external: ['undici', 'util/types', 'node:util/types'],
        output: {
          manualChunks: {
            vendor: ['react', 'react-dom'], // 🔥 FIX: split bundle
          },
        },
      },
    },

    resolve: {
      dedupe: [
        'react',
        'react-dom',
        'react/jsx-runtime',
        'react/jsx-dev-runtime',
        'react-dom/client',
        'react-router',
        '@nanostores/react',
      ],
      alias: {
        'util/types': 'rollup-plugin-node-polyfills/polyfills/empty',
        'node:util/types': 'rollup-plugin-node-polyfills/polyfills/empty',
      },
    },

    ssr: {
      noExternal: [],
      external: [
        'stream',
        'node:stream',
        'util',
        'util/types',
        'node:util',
        'node:util/types',
        'buffer',
        'node:buffer',
        'react-window',
      ],
    },

    plugins: [
      nodePolyfills({
        include: ['buffer', 'process', 'util'],
        globals: {
          Buffer: true,
          process: true,
          global: true,
        },
        protocolImports: true,
        exclude: ['child_process', 'fs', 'path', 'stream'],
      }),

      {
        name: 'buffer-polyfill',
        transform(code: string, id: string) {
          if (id.includes('env.mjs')) {
            return {
              code: `import { Buffer } from 'buffer';\n${code}`,
              map: null,
            };
          }
          return null;
        },
      },

      reactRouter(),
      UnoCSS(),
      tsconfigPaths(),

      // ❌ REMOVED heavy plugins for build stability:
      // sentryVitePlugin
      // visualizer
      // optimizeCssModules
    ].filter(Boolean) as PluginOption[],

    envPrefix: [
      'VITE_',
      'OPENAI_LIKE_API_BASE_URL',
      'OPENAI_LIKE_API_MODELS',
      'OLLAMA_API_BASE_URL',
      'LMSTUDIO_API_BASE_URL',
      'TOGETHER_API_BASE_URL',
      'SENTRY_DSN',
    ],

    css: {
      preprocessorOptions: {
        scss: {
          api: 'modern-compiler',
        },
      },
    },

    // 🔥 FIX: drastically reduce pre-bundling
    optimizeDeps: {
      include: ['react', 'react-dom'],
      exclude: ['undici'],
    },
  };
});
