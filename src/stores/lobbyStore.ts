import { defineStore } from 'pinia'
import { ref } from 'vue'
import { wsService } from '../services/ws'
import { useAuthStore } from './authStore'
import { useGameStore } from './gameStore'
import { useCheatStore } from './cheatStore'
import { useBoardStore } from './boardStore'
import type { Piece, PieceType } from '../types'
import { poolsFromJSON } from '../engine/deferredIdentity'

interface PlayerInfo {
  id: number
  username: string
}

export const useLobbyStore = defineStore('lobby', () => {
  const roomCode = ref<string | null>(null)
  const players = ref<(PlayerInfo | null)[]>([null, null])
  const status = ref<'idle' | 'creating' | 'in-room' | 'playing'>('idle')
  const error = ref<string | null>(null)
  const isHost = ref(false)
  const roomList = ref<Array<{ code: string; hostUsername: string }>>([])
  const showRoomList = ref(false)

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
      const cheatStore = useCheatStore()
      if (data.remainingPool) {
        cheatStore.syncRemainingPool(poolsFromJSON(data.remainingPool as Record<string, Record<string, number>>))
      }
      if (data.cheats) {
        cheatStore.acceptServerCheats(data.cheats as Array<{ id: number; type: PieceType }>)
      }
    })

    wsService.on('player_left', (data) => {
      const playerId = data.playerId as number
      players.value = players.value.map(p => p && p.id === playerId ? null : p) as (PlayerInfo | null)[]
    })

    wsService.on('room_list', (data) => {
      roomList.value = data.rooms as Array<{ code: string; hostUsername: string }>
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
    const cheatStore = useCheatStore()
    const board = useBoardStore()
    const cheatObj = cheatStore.buildStartGameCheatMap(board.pieces)
    wsService.send('start_game', Object.keys(cheatObj).length > 0 ? { cheatMap: cheatObj } : undefined)
  }

  function leaveRoom() {
    if (wsService.connected) wsService.send('leave_room')
    roomCode.value = null
    players.value = [null, null]
    isHost.value = false
    status.value = 'idle'
  }

  function fetchRoomList() {
    if (!wsService.connected) {
      error.value = '未连接到服务器'
      return
    }
    wsService.send('list_rooms')
  }

  function toggleRoomList() {
    if (showRoomList.value) {
      showRoomList.value = false
    } else {
      showRoomList.value = true
      fetchRoomList()
    }
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
    roomCode, players, status, error, isHost, roomList, showRoomList,
    createRoom, joinRoom, leaveRoom, startGame, fetchRoomList, toggleRoomList, reset,
  }
})
