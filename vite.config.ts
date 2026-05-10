import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import electron from 'vite-plugin-electron'
import renderer from 'vite-plugin-electron-renderer'
import { join } from 'path'

export default defineConfig({
  plugins: [
    react(),
    electron([
      {
        entry: 'app/main/main.ts',
      },
      {
        entry: 'app/preload/index.ts',
        onstart(options) {
          options.reload()
        },
        vite: {
          build: {
            rollupOptions: {
              output: {
                format: 'cjs',
                entryFileNames: 'preload.cjs'
              }
            }
          }
        }
      },
    ]),
    renderer(),
  ],
  resolve: {
    alias: {
      '@': join(__dirname, 'app/renderer'),
    },
  },
})
