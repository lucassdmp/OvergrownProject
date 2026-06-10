import fs from 'fs'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'

const PDF_SOURCE = path.resolve(__dirname, 'Livro', 'Overgrown Project.pdf')
const PDF_URL_PATH = '/overgrown-project.pdf'

/** Serves Livro/Overgrown Project.pdf at /overgrown-project.pdf without duplicating it into public/. */
function pdfAssetPlugin(): Plugin {
  let outDir = 'dist'

  return {
    name: 'overgrown-pdf-asset',
    configResolved(config) {
      outDir = config.build.outDir
    },
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url === PDF_URL_PATH) {
          res.setHeader('Content-Type', 'application/pdf')
          fs.createReadStream(PDF_SOURCE).pipe(res)
          return
        }
        next()
      })
    },
    closeBundle() {
      fs.copyFileSync(PDF_SOURCE, path.resolve(__dirname, outDir, 'overgrown-project.pdf'))
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), pdfAssetPlugin()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
