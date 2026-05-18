type MessageHandler = (data: Record<string, unknown>) => void

class WsService {
  private ws: WebSocket | null = null
  private handlers = new Map<string, MessageHandler[]>()
  private _connected = false
  private _token = ''
  private _reconnectTimer: ReturnType<typeof setTimeout> | null = null
  private _autoReconnect = false

  get connected() { return this._connected }

  connect(token: string) {
    this._token = token
    this._autoReconnect = true
    this._doConnect()
  }

  private _doConnect() {
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }

    const protocol = location.protocol === 'https:' ? 'wss' : 'ws'
    const url = `${protocol}://${location.host}/ws?token=${encodeURIComponent(this._token)}`

    this.ws = new WebSocket(url)

    this.ws.onopen = () => {
      this._connected = true
      this.emit('_connected', {})
    }

    this.ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data)
        this.emit(msg.type as string, msg)
      } catch { /* ignore */ }
    }

    this.ws.onclose = () => {
      this._connected = false
      this.emit('_disconnected', {})
      if (this._autoReconnect) {
        this._reconnectTimer = setTimeout(() => this._doConnect(), 2000)
      }
    }

    this.ws.onerror = () => {
      // onclose will fire after this
    }
  }

  send(type: string, payload: Record<string, unknown> = {}) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return false
    this.ws.send(JSON.stringify({ type, ...payload }))
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
    this._autoReconnect = false
    this._connected = false
    if (this._reconnectTimer) clearTimeout(this._reconnectTimer)
    this.ws?.close()
    this.ws = null
  }
}

export const wsService = new WsService()
