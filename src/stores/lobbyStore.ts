import { defineStore } from 'pinia'
import { ref } from 'vue'
import { p2pService } from '../services/p2p'
import { useAuthStore } from './authStore'
import { useGameStore } from './gameStore'
import { generateRandomLayout } from '../engine'
import type { Piece } from '../types'

interface PlayerInfo {
  id: string
  username: string
}

export const useLobbyStore = defineStore('lobby', () => {
  const roomCode = ref<string | null>(null)
  const players = ref<(PlayerInfo | null)[]>([null, null])
  const status = ref<'idle' | 'creating' | 'in-room' | 'playing'>('idle')
  const error = ref<string | null>(null)
  const isHost = ref(false)

  function setupHandlers() {
    p2pService.on('_connected', () => {
      status.value = 'in-room'
      const auth = useAuthStore()
      const name = auth.user?.username || 'Guest'

      if (isHost.value) {
        players.value[0] = { id: p2pService.peerId || 'host', username: name }
      } else {
        players.value[1] = { id: p2pService.peerId || 'guest', username: name }
        p2pService.send('join_info', { username: name })
      }
    })

    p2pService.on('join_info', (data) => {
      const auth = useAuthStore()
      if (isHost.value) {
        players.value[1] = { id: 'guest', username: data.username as string }
        // Send own info back to guest
        p2pService.send('host_info', { username: auth.user?.username || 'Guest' })
      } else {
        // Shouldn't receive join_info as guest, but handle gracefully
      }
    })

    p2pService.on('host_info', (data) => {
      players.value[0] = { id: 'host', username: data.username as string }
    })

    p2pService.on('start_game', (data) => {
      const board = data.board as Piece[]
      const color = data.yourColor as 'r' | 'b'
      status.value = 'playing'
      const game = useGameStore()
      game.startOnlineGame(board, color, 'r')
    })

    p2pService.on('move', (data) => {
      const game = useGameStore()
      game.handleOpponentMoved(data)
    })

    p2pService.on('resign', () => {
      const game = useGameStore()
      game.handleServerGameOver({
        winner: game.yourColor === 'r' ? 'b' : 'r',
        reason: 'resign',
      })
    })

    p2pService.on('chat_message', (_data) => {
    })

    p2pService.on('_disconnected', () => {
      error.value = '对方已断开连接'
    })
  }

  async function createRoom(code: string) {
    error.value = null
    status.value = 'creating'
    try {
      await p2pService.create(code)
      roomCode.value = code
      isHost.value = true
      const auth = useAuthStore()
      players.value[0] = { id: code, username: auth.user?.username || '' }
      players.value[1] = null
      status.value = 'in-room'
    } catch (e: any) {
      console.error('创建房间失败:', e)
      error.value = '创建房间失败: ' + (e?.message || e?.toString?.() || '未知错误')
      status.value = 'idle'
    }
  }

  async function joinRoom(code: string) {
    error.value = null
    status.value = 'creating'
    try {
      await p2pService.join(code)
      roomCode.value = code
      isHost.value = false
      status.value = 'in-room'
    } catch (e: any) {
      console.error('加入房间失败:', e)
      error.value = '加入房间失败: ' + (e?.message || e?.toString?.() || '请检查房间号')
      status.value = 'idle'
    }
  }

  function startGame() {
    if (!isHost.value) return
    const board = generateRandomLayout()
    const game = useGameStore()
    game.startOnlineGame(board, 'r', 'r')
    p2pService.send('start_game', {
      board,
      yourColor: 'b',
      currentTurn: 'r',
    })
    status.value = 'playing'
  }

  function leaveRoom() {
    if (status.value === 'playing') {
      p2pService.send('resign')
    }
    p2pService.disconnect()
    roomCode.value = null
    players.value = [null, null]
    isHost.value = false
    status.value = 'idle'
  }

  function reset() {
    p2pService.disconnect()
    roomCode.value = null
    players.value = [null, null]
    isHost.value = false
    status.value = 'idle'
    error.value = null
  }

  setupHandlers()

  return {
    roomCode, players, status, error, isHost,
    createRoom, joinRoom, leaveRoom, startGame, reset,
  }
})
