import { Peer } from 'peerjs'

type MessageHandler = (data: Record<string, unknown>) => void

interface P2PConnection {
  send(data: string): void
  close(): void
  on(event: 'open' | 'close' | 'error' | 'data', cb: (...args: any[]) => void): void
}

class P2PService {
  private peer: Peer | null = null
  private conn: P2PConnection | null = null
  private handlers = new Map<string, MessageHandler[]>()
  private _peerId: string | null = null
  private _connected = false
  private _host = false

  get peerId() { return this._peerId }
  get connected() { return this._connected }
  get isHost() { return this._host }

  private peerOptions() {
    return {
      host: location.hostname,
      port: location.protocol === 'https:' ? 443 : 3001,
      path: '/peerjs',
      secure: location.protocol === 'https:',
    }
  }

  create(): Promise<string> {
    return new Promise((resolve, reject) => {
      this._host = true
      this.peer = new Peer(this.peerOptions())

      this.peer.on('open', (id) => {
        this._peerId = id
        resolve(id)
      })

      this.peer.on('connection', (conn) => {
        this.setupConnection(conn)
      })

      this.peer.on('error', (err) => {
        reject(err)
      })
    })
  }

  join(hostId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this._host = false
      this.peer = new Peer(this.peerOptions())

      this.peer.on('open', () => {
        this._peerId = this.peer!.id
        const conn = this.peer!.connect(hostId, { reliable: true })
        this.setupConnection(conn)
        conn.on('open', () => resolve())
      })

      this.peer.on('error', (err) => {
        reject(err)
      })
    })
  }

  private setupConnection(conn: P2PConnection) {
    this.conn = conn

    conn.on('open', () => {
      this._connected = true
      this.emit('_connected', {})
    })

    conn.on('data', (raw) => {
      try {
        const msg = JSON.parse(raw as string)
        this.emit(msg.type as string, msg)
      } catch { /* ignore */ }
    })

    conn.on('close', () => {
      this._connected = false
      this.emit('_disconnected', {})
    })

    conn.on('error', () => {
      this._connected = false
    })
  }

  send(type: string, payload: Record<string, unknown> = {}) {
    if (!this.conn || !this._connected) return false
    this.conn.send(JSON.stringify({ type, ...payload }))
    return true
  }

  on(type: string, handler: MessageHandler) {
    if (!this.handlers.has(type)) this.handlers.set(type, [])
    this.handlers.get(type)!.push(handler)
  }

  off(type: string, handler: MessageHandler) {
    const list = this.handlers.get(type)
    if (!list) return
    const idx = list.indexOf(handler)
    if (idx !== -1) list.splice(idx, 1)
  }

  private emit(type: string, data: Record<string, unknown>) {
    const list = this.handlers.get(type)
    if (list) for (const h of list) h(data)
  }

  disconnect() {
    this._connected = false
    this._host = false
    this.conn?.close()
    this.peer?.destroy()
    this.conn = null
    this.peer = null
    this._peerId = null
  }
}

export const p2pService = new P2PService()
