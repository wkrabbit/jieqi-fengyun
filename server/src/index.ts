import express from 'express'
import cors from 'cors'
import http from 'http'
import { ExpressPeerServer } from 'peer'
import { initDb } from './db.js'
import { authRouter } from './auth.js'

const PORT = 3001

const app = express()
app.use(cors())
app.use(express.json())

app.use('/api/auth', authRouter)

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' })
})

const server = http.createServer(app)

// PeerJS signaling server — handles SDP/ICE exchange only, no game data
const peerServer = ExpressPeerServer(server, {
  path: '/peerjs',
  allow_discovery: true,
})

app.use('/peerjs', peerServer)

server.listen(PORT, () => {
  initDb()
  console.log(`Server running on http://localhost:${PORT}`)
  console.log(`PeerJS signaling on ws://localhost:${PORT}/peerjs`)
})
