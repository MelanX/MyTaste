import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      // The SW has custom Workbox routing logic, so inject the precache
      // manifest into our own source file rather than generating one.
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      // 'prompt' (not 'autoUpdate'): with autoUpdate the plugin injects
      // skipWaiting()+clientsClaim() and hard-reloads mid-session. We want the
      // deferred flow instead — registerSW's onNeedRefresh (src/index.tsx) holds
      // the new SW and only posts SKIP_WAITING on the next navigation, so an
      // in-progress session is never disrupted.
      registerType: 'prompt',
      injectRegister: false,
      includeAssets: ['favicon.ico', 'robots.txt', 'placeholder.webp', 'logo*.png'],
      injectManifest: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webp,woff,woff2}'],
      },
      manifest: {
        short_name: 'MyTaste',
        name: 'MyTaste - Recipe Book',
        description: 'Digital Recipe Book',
        icons: [
          { src: 'favicon.ico', sizes: '64x64 32x32 24x24 16x16', type: 'image/x-icon' },
          { src: 'logo48.png', type: 'image/png', sizes: '48x48' },
          { src: 'logo72.png', type: 'image/png', sizes: '72x72' },
          { src: 'logo96.png', type: 'image/png', sizes: '96x96' },
          { src: 'logo144.png', type: 'image/png', sizes: '144x144' },
          { src: 'logo192.png', type: 'image/png', sizes: '192x192' },
          { src: 'logo512.png', type: 'image/png', sizes: '512x512', purpose: 'any maskable' },
        ],
        start_url: '/',
        scope: '/',
        display: 'standalone',
        theme_color: '#e6b17e',
        background_color: '#f8f4e9',
      },
      devOptions: {
        enabled: false,
      },
    }),
  ],
  server: {
    proxy: {
      '/api': 'http://localhost:5000',
    },
  },
});
