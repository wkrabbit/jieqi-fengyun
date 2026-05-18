import { defineStore } from 'pinia'
import { ref } from 'vue'
import { wsService } from '../services/ws'
import { useAuthStore } from './authStore'
import { useGameStore } from './gameStore'
import type { Piece } from '../types'

interface PlayerInfo {
  id: number
  username: string
}

export const useLobbyStore = defineStore('lobby', () => {
  const roomCode = ref<string | null>(null)
  const players = ref<(PlayerInfo | null)[]>([null, null])
  const status = ref<'idle' | 'creating' | 'in-room' | 'playing' | 'matching'>('idle')
  const error = ref<string | null>(null)
  const isHost = ref(false)

  function setupHandlers() {
    wsService.on('connected', (_data) => {
      // Authenticated and connected
    })

    wsService.on('room_created', (data) => {
      roomCode.value = data.roomCode as string
      isHost.value = true
      const auth = useAuthStore()
      players.value = [{ id: auth.user?.id || 0, username: auth.user?.username || '' }, null]
      status.value = 'in-room'
    })

    wsService.on('room_joined', (data) => {
      roomCode.value = data.roomCode as string
      const list = data.players as (PlayerInfo | null)[]
      players.value = list
      isHost.value = (data.hostId as number) === (useAuthStore().user?.id || 0)
      status.value = 'in-room'
    })

    wsService.on('game_started', (data) => {
      const board = data.board as Piece[]
      const color = data.yourColor as 'r' | 'b'
      status.value = 'playing'
      const game = useGameStore()
      const timers = data.timers as { redGame: number; blackGame: number; redMove: number; blackMove: number } | undefined
      game.startOnlineGame(board, color, data.currentTurn as 'r' | 'b', timers)
    })

    wsService.on('player_left', (data) => {
      const playerId = data.playerId as number
      players.value = players.value.map(p => p && p.id === playerId ? null : p) as (PlayerInfo | null)[]
    })

    wsService.on('matching', (_data) => {
      status.value = 'matching'
    })

    wsService.on('_disconnected', () => {
      // Reconnection handled by ws service
    })

    wsService.on('error', (data) => {
      error.value = data.message as string
      status.value = 'idle'
    })
  }

  async function createRoom() {
    error.value = null
    status.value = 'creating'
    if (!wsService.connected) {
      error.value = '未连接到服务器，请重新登录'
      status.value = 'idle'
      return
    }
    wsService.send('create_room')
  }

  async function joinRoom(code: string) {
    error.value = null
    status.value = 'creating'
    if (!wsService.connected) {
      error.value = '未连接到服务器，请重新登录'
      status.value = 'idle'
      return
    }
    wsService.send('join_room', { roomCode: code })
  }

  function startGame() {
    wsService.send('start_game')
  }

  function leaveRoom() {
    wsService.send('leave_room')
    roomCode.value = null
    players.value = [null, null]
    isHost.value = false
    status.value = 'idle'
  }

  function quickMatch() {
    error.value = null
    if (!wsService.connected) {
      error.value = '未连接到服务器'
      return
    }
    status.value = 'matching'
    wsService.send('quick_match')
  }

  function reset() {
    wsService.disconnect()
    roomCode.value = null
    players.value = [null, null]
    isHost.value = false
    status.value = 'idle'
    error.value = null
  }

  setupHandlers()

  return {
    roomCode, players, status, error, isHost,
    createRoom, joinRoom, leaveRoom, startGame, quickMatch, reset,
  }
})
