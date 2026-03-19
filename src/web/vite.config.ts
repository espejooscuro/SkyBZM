import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    // Optimizaciones para build más rápido
    target: 'es2015',
    minify: 'esbuild', // esbuild es más rápido que terser
    sourcemap: false, // No generar sourcemaps en producción
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks: {
          // Separar vendors grandes en chunks
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'radix-vendor': [
            '@radix-ui/react-dialog',
            '@radix-ui/react-dropdown-menu',
            '@radix-ui/react-select',
            '@radix-ui/react-tabs',
            '@radix-ui/react-tooltip',
          ],
          'chart-vendor': ['recharts'],
        },
      },
    },
  },
  optimizeDeps: {
    // Incluir dependencias que deben ser pre-optimizadas
    include: [
      'react',
      'react-dom',
      'react-router-dom',
    ],
    // Excluir dependencias problemáticas
    exclude: ['lovable-tagger'],
  },
}));

