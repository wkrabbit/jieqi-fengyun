type MessageHandler = (data: Record<string, unknown>) => void

const HEARTBEAT_INTERVAL = 30_000
const HEARTBEAT_TIMEOUT = 10_000

class WsService {
  private ws: WebSocket | null = null
  private handlers = new Map<string, MessageHandler[]>()
  private _connected = false
  private _token = ''
  private _reconnectTimer: ReturnType<typeof setTimeout> | null = null
  private _autoReconnect = false
  private _heartbeatTimer: ReturnType<typeof setInterval> | null = null
  private _heartbeatTimeout: ReturnType<typeof setTimeout> | null = null
  private _missedPongs = 0

  get connected() { return this._connected }
  get isConnected() { return this._connected }

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
      this._missedPongs = 0
      this.emit('_connected', {})
      this._startHeartbeat()
    }

    this.ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data)
        if (msg.type === 'pong') {
          this._missedPongs = 0
          if (this._heartbeatTimeout) {
            clearTimeout(this._heartbeatTimeout)
            this._heartbeatTimeout = null
          }
        }
        this.emit(msg.type as string, msg)
      } catch { /* ignore */ }
    }

    this.ws.onclose = () => {
      this._connected = false
      this._stopHeartbeat()
      this.emit('_disconnected', {})
      if (this._autoReconnect) {
        this._reconnectTimer = setTimeout(() => this._doConnect(), 2000)
      }
    }

    this.ws.onerror = () => {
      // onclose will fire after this
    }
  }

  private _startHeartbeat() {
    this._stopHeartbeat()
    this._heartbeatTimer = setInterval(() => {
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return
      this._missedPongs++
      if (this._missedPongs > 2) {
        // Connection is dead, force reconnect
        this.ws.close()
        return
      }
      this.send('ping')
      this._heartbeatTimeout = setTimeout(() => {
        // No pong received, will be counted on next tick
      }, HEARTBEAT_TIMEOUT)
    }, HEARTBEAT_INTERVAL)
  }

  private _stopHeartbeat() {
    if (this._heartbeatTimer) {
      clearInterval(this._heartbeatTimer)
      this._heartbeatTimer = null
    }
    if (this._heartbeatTimeout) {
      clearTimeout(this._heartbeatTimeout)
      this._heartbeatTimeout = null
    }
    this._missedPongs = 0
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
    this._stopHeartbeat()
    if (this._reconnectTimer) clearTimeout(this._reconnectTimer)
    this.ws?.close()
    this.ws = null
  }
}

export const wsService = new WsService()
