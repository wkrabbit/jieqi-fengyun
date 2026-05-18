import express from 'express'
import cors from 'cors'
import http from 'http'
import path from 'path'
import { fileURLToPath } from 'url'
import { ExpressPeerServer } from 'peer'
import { initDb } from './db.js'
import { authRouter } from './auth.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const PORT = process.env.PORT || 3001

const app = express()
app.use(cors())
app.use(express.json())

app.use('/api/auth', authRouter)

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' })
})

// Serve frontend static files in production
const distPath = path.join(__dirname, '..', '..', 'dist')
app.use(express.static(distPath))

// SPA fallback — all non-API routes serve index.html
app.get(/^\/(?!api|peerjs).*/, (_req, res) => {
  res.sendFile(path.join(distPath, 'index.html'))
})

const server = http.createServer(app)

const peerServer = ExpressPeerServer(server, {
  allow_discovery: true,
})

app.use('/peerjs', peerServer)

server.listen(PORT, () => {
  initDb()
  console.log(`Server running on port ${PORT}`)
})
