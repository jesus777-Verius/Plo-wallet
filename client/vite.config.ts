import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('react-dom')) {
              return 'vendor';
            }
            if (id.includes('ethers')) {
              return 'ethers';
            }
            if (id.includes('crypto-js')) {
              return 'crypto';
            }
          }
        }
      }
    },
    sourcemap: false, // No generar sourcemaps en producción
    reportCompressedSize: false
  },
  server: {
    port: 5173,
    host: '127.0.0.1', // Solo localhost por seguridad
    strictPort: true,
    headers: {
      // Headers de seguridad
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
      'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https://polygon-rpc.com https://rpc-mainnet.matic.network https://matic-mainnet.chainstacklabs.com https://rpc-mainnet.maticvigil.com https://polygon-bor-rpc.publicnode.com https://api.ipify.org; font-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self';"
    }
  },
  preview: {
    port: 4173,
    host: '127.0.0.1',
    strictPort: true,
    headers: {
      // Mismos headers de seguridad para preview
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
      'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https://polygon-rpc.com https://rpc-mainnet.matic.network https://matic-mainnet.chainstacklabs.com https://rpc-mainnet.maticvigil.com https://polygon-bor-rpc.publicnode.com https://api.ipify.org; font-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self';"
    }
  },
  define: {
    // Variables de entorno seguras
    __DEV__: JSON.stringify(process.env.NODE_ENV === 'development'),
    __PROD__: JSON.stringify(process.env.NODE_ENV === 'production')
  }
})
