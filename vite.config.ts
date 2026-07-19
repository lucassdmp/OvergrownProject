import fs from 'fs'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'

const PDF_SOURCE = path.resolve(__dirname, 'Livro', 'Overgrown Project.pdf')
const PDF_URL_PATH = '/overgrown-project.pdf'
const TALENT_TREE_SOURCE = path.resolve(__dirname, 'src', 'data', 'defaultTalentTree.json')
const TALENT_TREE_SAVE_PATH = '/__overgrown/talent-tree'
const MAX_TALENT_TREE_BYTES = 8 * 1024 * 1024

function isValidTalentTree(value: unknown): value is {
  id: string
  name: string
  nodes: { id: string; x: number; y: number; data: { type: string } }[]
  edges: { id: string; from: string; to: string }[]
} {
  if (!value || typeof value !== 'object') return false
  const tree = value as Record<string, unknown>
  if (typeof tree.id !== 'string' || typeof tree.name !== 'string') return false
  if (!Array.isArray(tree.nodes) || !Array.isArray(tree.edges)) return false

  const nodeIds = new Set<string>()
  for (const nodeValue of tree.nodes) {
    if (!nodeValue || typeof nodeValue !== 'object') return false
    const node = nodeValue as Record<string, unknown>
    if (
      typeof node.id !== 'string' ||
      typeof node.x !== 'number' ||
      typeof node.y !== 'number' ||
      !Number.isFinite(node.x) ||
      !Number.isFinite(node.y) ||
      !node.data ||
      typeof node.data !== 'object' ||
      typeof (node.data as Record<string, unknown>).type !== 'string' ||
      nodeIds.has(node.id)
    )
      return false
    nodeIds.add(node.id)
  }

  const edgeIds = new Set<string>()
  for (const edgeValue of tree.edges) {
    if (!edgeValue || typeof edgeValue !== 'object') return false
    const edge = edgeValue as Record<string, unknown>
    if (
      typeof edge.id !== 'string' ||
      typeof edge.from !== 'string' ||
      typeof edge.to !== 'string' ||
      edgeIds.has(edge.id) ||
      !nodeIds.has(edge.from) ||
      !nodeIds.has(edge.to)
    )
      return false
    edgeIds.add(edge.id)
  }
  return true
}

function treeContentWithoutVersion(tree: Record<string, unknown>): string {
  const comparable = { ...tree }
  delete comparable.version
  return JSON.stringify(comparable)
}

/** Writes the authorial tree directly into the project while Vite is running locally. */
function localTalentTreeWriterPlugin(): Plugin {
  return {
    name: 'overgrown-local-talent-tree-writer',
    apply: 'serve',
    configureServer(server) {
      // Saving the JSON must not trigger a full HMR reload while the user is editing it.
      void server.watcher.unwatch(TALENT_TREE_SOURCE)
      server.middlewares.use((req, res, next) => {
        const requestPath = req.url?.split('?')[0]
        if (requestPath !== TALENT_TREE_SAVE_PATH) return next()
        if (req.method !== 'POST') {
          res.statusCode = 405
          res.setHeader('Allow', 'POST')
          res.end('Method Not Allowed')
          return
        }

        const chunks: Buffer[] = []
        let receivedBytes = 0
        let tooLarge = false
        req.on('data', (chunk: Buffer) => {
          receivedBytes += chunk.length
          if (receivedBytes > MAX_TALENT_TREE_BYTES) {
            tooLarge = true
            return
          }
          chunks.push(chunk)
        })
        req.on('end', async () => {
          res.setHeader('Content-Type', 'application/json; charset=utf-8')
          if (tooLarge) {
            res.statusCode = 413
            res.end(JSON.stringify({ ok: false, error: 'Árvore excede o limite de 8 MB.' }))
            return
          }
          try {
            let parsed: unknown
            try {
              parsed = JSON.parse(
                Buffer.concat(chunks)
                  .toString('utf8')
                  .replace(/^\uFEFF/, ''),
              )
            } catch {
              res.statusCode = 400
              res.end(JSON.stringify({ ok: false, error: 'JSON da árvore inválido.' }))
              return
            }
            if (!isValidTalentTree(parsed)) {
              res.statusCode = 400
              res.end(JSON.stringify({ ok: false, error: 'Estrutura da árvore inválida.' }))
              return
            }
            const nextTree = parsed as unknown as Record<string, unknown>
            const requestedVersion =
              typeof nextTree.version === 'number' && Number.isFinite(nextTree.version)
                ? nextTree.version
                : 0
            let nextVersion = requestedVersion
            try {
              const currentTree = JSON.parse(
                await fs.promises.readFile(TALENT_TREE_SOURCE, 'utf8'),
              ) as Record<string, unknown>
              const currentVersion =
                typeof currentTree.version === 'number' && Number.isFinite(currentTree.version)
                  ? currentTree.version
                  : 0
              nextVersion =
                treeContentWithoutVersion(currentTree) === treeContentWithoutVersion(nextTree)
                  ? currentVersion
                  : Math.max(currentVersion, requestedVersion) + 1
            } catch {
              nextVersion = Math.max(1, requestedVersion)
            }
            nextTree.version = nextVersion
            const serialized = `${JSON.stringify(nextTree, null, 2)}\n`
            await fs.promises.writeFile(TALENT_TREE_SOURCE, serialized, 'utf8')
            res.statusCode = 200
            res.end(
              JSON.stringify({
                ok: true,
                bytes: Buffer.byteLength(serialized),
                savedAt: new Date().toISOString(),
                version: nextVersion,
              }),
            )
          } catch (error) {
            res.statusCode = 500
            res.end(
              JSON.stringify({
                ok: false,
                error: error instanceof Error ? error.message : 'Falha ao salvar a árvore.',
              }),
            )
          }
        })
      })
    },
  }
}

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
  plugins: [react(), tailwindcss(), pdfAssetPlugin(), localTalentTreeWriterPlugin()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
