import { defineConfig, Plugin } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { createServer } from "./server";
import { TanStackRouterVite } from "@tanstack/router-plugin/vite";

// https://vitejs.dev/config/
export default defineConfig(() => ({
  server: {
    host: "::",
    port: 8080,
    fs: {
      allow: [".", "./client", "./shared"],
      deny: [".env", ".env.*", "*.{crt,pem}", "**/.git/**", "server/**"],
    },
  },
  // Base path for deployment - can be set via PUBLIC_BASE_PATH env variable
  // Defaults to / for root deployment
  base: process.env.PUBLIC_BASE_PATH || "/",
  build: {
    outDir: "dist/spa",
    sourcemap: process.env.NODE_ENV === "production" ? "hidden" : true,
    minify: "esbuild",
    cssMinify: true,
    reportCompressedSize: true,
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
          'router-vendor': ['@tanstack/react-router'],
          'ui-vendor': ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu', '@radix-ui/react-select'],
          'query-vendor': ['@tanstack/react-query'],
          'mui-vendor': ['@mui/material', '@mui/system', '@mui/x-data-grid'],
        },
        assetFileNames: (assetInfo) => {
          const info = assetInfo.name?.split('.') || [];
          const ext = info[info.length - 1];
          if (/png|jpe?g|svg|gif|tiff|bmp|ico/i.test(ext || '')) {
            return `assets/images/[name]-[hash][extname]`;
          }
          if (/woff2?|eot|ttf|otf/i.test(ext || '')) {
            return `assets/fonts/[name]-[hash][extname]`;
          }
          return `assets/[name]-[hash][extname]`;
        },
        chunkFileNames: 'assets/js/[name]-[hash].js',
        entryFileNames: 'assets/js/[name]-[hash].js',
      },
    },
    target: "es2015",
  },
  plugins: [
    react(),
    TanStackRouterVite({
      routesDirectory: "./routes",
      generatedRouteTree: "./routes/routeTree.gen.ts",
      routeFileIgnorePattern: "components|routeTree.gen",
    }),
    expressPlugin(),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./client"),
      "@shared": path.resolve(__dirname, "./shared"),
      "src": path.resolve(__dirname, "."),
      "next/navigation": path.resolve(__dirname, "./empty-module.js"),
    },
    extensions: [".mjs", ".js", ".mts", ".ts", ".jsx", ".tsx", ".json"],
  },
  optimizeDeps: {
    exclude: ["next/navigation"],
    include: [
      "react",
      "react-dom",
      "react/jsx-runtime",
      "@tanstack/react-router-devtools",
    ],
    esbuildOptions: {
      jsx: 'automatic',
      jsxImportSource: 'react',
    },
  },
  ssr: {
    external: ["next/navigation"],
    noExternal: [],
  },
}));

function expressPlugin(): Plugin {
  return {
    name: "express-plugin",
    apply: "serve", // Only apply during development (serve mode)
    configureServer(server) {
      const app = createServer();

      // Add Express app as middleware to Vite dev server
      server.middlewares.use(app);
    },
  };
}
