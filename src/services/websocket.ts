type MessageHandler = (data: Record<string, unknown>) => void

class WsService {
  private ws: WebSocket | null = null
  private handlers = new Map<string, MessageHandler[]>()
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null
  private reconnectAttempts = 0
  private maxReconnect = 5
  private token = ''
  private _connected = false
  private intentionalClose = false

  get connected() { return this._connected }

  connect(token: string) {
    this.token = token
    this.intentionalClose = false
    this.doConnect()
  }

  private doConnect() {
    const protocol = location.protocol === 'https:' ? 'wss' : 'ws'
    const url = `${protocol}://${location.host}/ws?token=${encodeURIComponent(this.token)}`

    try {
      this.ws = new WebSocket(url)
    } catch {
      this.scheduleReconnect()
      return
    }

    this.ws.onopen = () => {
      this._connected = true
      this.reconnectAttempts = 0
      this.emit('_connected', {})
    }

    this.ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data)
        this.emit(msg.type as string, msg)
      } catch { /* ignore malformed */ }
    }

    this.ws.onclose = () => {
      this._connected = false
      this.ws = null
      if (!this.intentionalClose) this.scheduleReconnect()
    }

    this.ws.onerror = () => {
      // onclose will fire after this
    }
  }

  private scheduleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnect) {
      this.emit('_reconnect_failed', {})
      return
    }
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 16000)
    this.reconnectAttempts++
    this.reconnectTimer = setTimeout(() => this.doConnect(), delay)
  }

  disconnect() {
    this.intentionalClose = true
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer)
    this.reconnectTimer = null
    this.reconnectAttempts = 0
    this.ws?.close()
    this.ws = null
    this._connected = false
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
}

export const wsService = new WsService()
