import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// La configuracion de PWA se completa en la entrega 3 (service worker y cache).
// Por ahora solo queda registrado el manifiesto para poder instalar la app.
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Portal Universitario UTSC',
        short_name: 'Portal UTSC',
        description: 'Portal estudiantil de la Universidad Tecnologica de Santa Catarina',
        start_url: '/',
        display: 'standalone',
        background_color: '#1B2233',
        theme_color: '#1B2233',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' }
        ]
      }
    })
  ]
})
