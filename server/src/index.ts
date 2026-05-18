import express from 'express'
import cors from 'cors'
import http from 'http'
import path from 'path'
import { fileURLToPath } from 'url'
import { WebSocketServer } from 'ws'
import { initDb } from './db.js'
import { authRouter } from './auth.js'
import { handleConnection } from './ws.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const PORT = process.env.PORT || 3001

const app = express()
app.use(cors())
app.use(express.json())

app.use('/api/auth', authRouter)

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' })
})

const distPath = path.join(__dirname, '..', '..', 'dist')
app.use(express.static(distPath))

app.get(/^\/(?!api|ws).*/, (_req, res) => {
  res.sendFile(path.join(distPath, 'index.html'))
})

const server = http.createServer(app)

const wss = new WebSocketServer({ server, path: '/ws' })

wss.on('connection', (ws, req) => {
  handleConnection(ws, req.url || '/')
})

server.listen(PORT, () => {
  initDb()
  console.log(`Server running on port ${PORT}`)
})
