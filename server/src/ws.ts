import { WebSocket } from 'ws'
import { verifyToken, parseTokenFromUrl, JwtPayload } from './middleware.js'
import { createGame, processMove, getGrid, findPiece, tickGame, getTimers, registerCheatPresets, ServerGame } from './game.js'
import { poolsToJSON } from '../../src/engine/deferredIdentity.js'
import type { PieceType } from '../../src/types/index.js'

interface PlayerConnection {
  ws: WebSocket
  userId: number
  username: string
  isVip: boolean
  color: 'r' | 'b' | null
}

interface Room {
  code: string
  players: [PlayerConnection, PlayerConnection | null]
  hostId: number
  state: 'waiting' | 'playing' | 'finished'
  game: ServerGame | null
  disconnectTimer: ReturnType<typeof setTimeout> | null
  chatMessages: ChatMessage[]
  remainingRedGameTime?: number
  remainingBlackGameTime?: number
}

interface ChatMessage {
  playerId: number
  playerName: string
  text: string
  timestamp: string
}

const rooms = new Map<string, Room>()

let seqCounter = 0
function seq() { return ++seqCounter }

function send(ws: WebSocket, msg: Record<string, unknown>) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ seq: seq(), ...msg }))
  }
}

function generateRoomCode(): string {
  let code: string
  do {
    code = String(Math.floor(10000 + Math.random() * 90000))
  } while (rooms.has(code))
  return code
}

function findRoomByPlayer(userId: number): Room | undefined {
  for (const room of rooms.values()) {
    if (room.players.some(p => p && p.userId === userId)) return room
  }
  return undefined
}

function getOpponent(room: Room, userId: number): PlayerConnection | null {
  if (room.players[0]?.userId === userId) return room.players[1]
  return room.players[0]
}

function cleanupRoom(code: string) {
  const room = rooms.get(code)
  if (!room) return
  if (room.disconnectTimer) clearTimeout(room.disconnectTimer)
  rooms.delete(code)
}

export function handleConnection(ws: WebSocket, reqUrl: string) {
  const token = parseTokenFromUrl(reqUrl)
  if (!token) {
    send(ws, { type: 'error', message: '未提供认证令牌' })
    ws.close()
    return
  }
  const user = verifyToken(token)
  if (!user) {
    send(ws, { type: 'error', message: '令牌无效或已过期' })
    ws.close()
    return
  }

  const player: PlayerConnection = { ws, userId: user.userId, username: user.username, isVip: user.isVip, color: null }
  send(ws, { type: 'connected', userId: user.userId, username: user.username, isVip: user.isVip })

  // Reconnection: if user is already in a room, update WebSocket reference
  const existingRoom = findRoomByPlayer(user.userId)
  if (existingRoom) {
    for (let i = 0; i < 2; i++) {
      const p = existingRoom.players[i]
      if (p && p.userId === user.userId) {
        player.color = p.color
        existingRoom.players[i] = player
        break
      }
    }
    if (existingRoom.disconnectTimer) {
      clearTimeout(existingRoom.disconnectTimer)
      existingRoom.disconnectTimer = null
    }
    // Sync game state if game is in progress
    if (existingRoom.state === 'playing' && existingRoom.game) {
      tickGame(existingRoom.game, Date.now())
      send(player.ws, {
        type: 'game_state',
        pieces: existingRoom.game.pieces,
        currentTurn: existingRoom.game.currentTurn,
        yourColor: player.color,
        timers: getTimers(existingRoom.game),
      })
    }
    // Notify the reconnected player about current room state
    const playerList = existingRoom.players.map(p => p ? { id: p.userId, username: p.username } : null)
    send(player.ws, { type: 'room_joined', roomCode: existingRoom.code, players: playerList, hostId: existingRoom.hostId })
    // Notify opponent
    const opponent = getOpponent(existingRoom, user.userId)
    if (opponent) {
      send(opponent.ws, { type: 'opponent_reconnected', playerId: user.userId })
    }
  }

  ws.on('message', (raw) => {
    try {
      const msg = JSON.parse(raw.toString())
      handleMessage(player, msg)
    } catch {
      send(ws, { type: 'error', message: '无效的消息格式' })
    }
  })

  ws.on('close', () => {
    handleDisconnect(player)
  })
}

function handleMessage(player: PlayerConnection, msg: Record<string, unknown>) {
  switch (msg.type) {
    case 'create_room': return handleCreateRoom(player)
    case 'join_room': return handleJoinRoom(player, msg.roomCode as string)
    case 'leave_room': return handleLeaveRoom(player)
    case 'start_game': return handleStartGame(player, msg.cheatMap as Record<string, string> | undefined)
    case 'move': return handleMove(player, msg)
    case 'resign': return handleResign(player)
    case 'chat_message': return handleChat(player, msg.text as string)
    case 'list_rooms': return handleListRooms(player)
    case 'sync_request': return handleSyncRequest(player)
    case 'new_game_request': return handleNewGameRequest(player)
    case 'new_game_accept': return handleNewGameAccept(player)
    case 'ping': return send(player.ws, { type: 'pong' })
    default:
      send(player.ws, { type: 'error', message: `未知消息类型: ${msg.type}` })
  }
}

function handleCreateRoom(player: PlayerConnection) {
  if (findRoomByPlayer(player.userId)) {
    send(player.ws, { type: 'error', message: '你已在一个房间中' })
    return
  }
  const code = generateRoomCode()
  const room: Room = {
    code,
    players: [player, null],
    hostId: player.userId,
    state: 'waiting',
    game: null,
    disconnectTimer: null,
    chatMessages: [],
  }
  rooms.set(code, room)
  send(player.ws, { type: 'room_created', roomCode: code, hostId: player.userId })
}

function handleJoinRoom(player: PlayerConnection, roomCode: string) {
  if (findRoomByPlayer(player.userId)) {
    send(player.ws, { type: 'error', message: '你已在一个房间中' })
    return
  }
  const room = rooms.get(roomCode)
  if (!room) {
    send(player.ws, { type: 'error', message: '房间不存在' })
    return
  }
  if (room.state !== 'waiting' || room.players[1]) {
    send(player.ws, { type: 'error', message: '房间已满或对局已开始' })
    return
  }
  room.players[1] = player
  const playerList = room.players.map(p => p ? { id: p.userId, username: p.username } : null)
  broadcast(room, { type: 'room_joined', roomCode, players: playerList, hostId: room.hostId })
}

function handleLeaveRoom(player: PlayerConnection) {
  const room = findRoomByPlayer(player.userId)
  if (!room) {
    send(player.ws, { type: 'error', message: '你不在任何房间中' })
    return
  }

  if (room.state === 'playing') {
    // Forfeit
    const roomPlayer = room.players.find(p => p && p.userId === player.userId)
    const winnerColor = roomPlayer?.color === 'r' ? 'b' : 'r'
    broadcast(room, { type: 'game_over', winner: winnerColor, reason: 'resign' })
    room.state = 'finished'
  } else {
    broadcast(room, { type: 'player_left', playerId: player.userId })
  }

  cleanupRoom(room.code)
}

function handleStartGame(player: PlayerConnection, rawCheatMap?: Record<string, string>) {
  const room = findRoomByPlayer(player.userId)
  if (!room || room.hostId !== player.userId) {
    send(player.ws, { type: 'error', message: '只有房主可以开始对局' })
    return
  }
  if (!room.players[1]) {
    send(player.ws, { type: 'error', message: '等待对手加入' })
    return
  }

  room.state = 'playing'
  room.game = createGame()

  let acceptedCheats: Array<{ id: number; type: PieceType }> = []
  if (rawCheatMap && room.players[0]?.isVip && room.game) {
    const presetMap = new Map<number, PieceType>()
    for (const k of Object.keys(rawCheatMap)) {
      const v = rawCheatMap[k] as PieceType
      if (typeof v !== 'string') continue
      const parts = k.split(',')
      if (parts.length !== 2) continue
      const row = Number(parts[0])
      const col = Number(parts[1])
      if (Number.isNaN(row) || Number.isNaN(col)) continue
      const piece = room.game.pieces.find(p => p.row === row && p.col === col)
      if (piece) presetMap.set(piece.id, v)
    }
    if (presetMap.size > 0) {
      acceptedCheats = registerCheatPresets(room.game, presetMap)
    }
  }

  room.players[0].color = 'r'
  room.players[1].color = 'b'

  const timers = getTimers(room.game)
  const poolJson = poolsToJSON(room.game.remainingPool)
  const startPayload = {
    board: room.game.pieces,
    currentTurn: 'r' as const,
    timers,
    remainingPool: poolJson,
    cheats: acceptedCheats,
  }
  send(room.players[0].ws, { type: 'game_started', ...startPayload, yourColor: 'r' })
  send(room.players[1].ws, { type: 'game_started', ...startPayload, yourColor: 'b' })
}

function handleMove(player: PlayerConnection, msg: Record<string, unknown>) {
  const room = findRoomByPlayer(player.userId)
  if (!room || room.state !== 'playing' || !room.game) {
    send(player.ws, { type: 'error', message: '对局未开始' })
    return
  }

  const roomPlayer = room.players.find(p => p && p.userId === player.userId)
  if (!roomPlayer || !roomPlayer.color) {
    send(player.ws, { type: 'move_rejected', reason: '游戏状态异常，请刷新页面重试' })
    return
  }

  const pieceId = msg.pieceId as number
  const toRow = msg.toRow as number
  const toCol = msg.toCol as number
  const cheatedType = msg.cheatedType as PieceType | undefined

  // VIP cheat validation
  if (cheatedType && !roomPlayer.isVip) {
    send(player.ws, { type: 'move_rejected', reason: '没有作弊权限' })
    return
  }

  const movingPiece = findPiece(room.game, pieceId)
  const from = movingPiece ? { row: movingPiece.row, col: movingPiece.col } : null
  tickGame(room.game, Date.now())
  const result = processMove(room.game, pieceId, toRow, toCol, roomPlayer.color, cheatedType)
  if (!result.ok) {
    send(player.ws, { type: 'move_rejected', reason: result.error, timers: result.timers })
    return
  }

  send(player.ws, {
    type: 'move_accepted',
    pieceId,
    from,
    to: { row: toRow, col: toCol },
    captured: result.captured,
    revealed: result.revealed,
    capturedReveal: result.capturedReveal,
    presetRejected: result.presetRejected,
    remainingPool: result.remainingPool ? poolsToJSON(result.remainingPool) : undefined,
    board: result.board,
    currentTurn: room.game.currentTurn,
    noCaptureCount: result.noCaptureCount,
    timers: result.timers,
  })

  const opponent = getOpponent(room, player.userId)
  if (opponent) {
    // 暗子被吃后已翻开，双方都应看到实际类型
    send(opponent.ws, {
      type: 'opponent_moved',
      pieceId,
      from,
      to: { row: toRow, col: toCol },
      captured: result.captured,
      revealed: result.revealed,
      capturedReveal: result.capturedReveal,
      remainingPool: result.remainingPool ? poolsToJSON(result.remainingPool) : undefined,
      board: result.board,
      currentTurn: room.game.currentTurn,
      noCaptureCount: result.noCaptureCount,
      timers: result.timers,
    })
  }

  if (result.gameOver) {
    broadcast(room, { type: 'game_over', winner: result.gameOver.winner, reason: result.gameOver.reason })
    room.state = 'finished'
    room.remainingRedGameTime = room.game.redGameTime
    room.remainingBlackGameTime = room.game.blackGameTime
  }
}

function handleResign(player: PlayerConnection) {
  const room = findRoomByPlayer(player.userId)
  if (!room || room.state !== 'playing') return
  const roomPlayer = room.players.find(p => p && p.userId === player.userId)
  const winnerColor = roomPlayer?.color === 'r' ? 'b' : 'r'
  broadcast(room, { type: 'game_over', winner: winnerColor, reason: 'resign' })
  room.state = 'finished'
}

function handleChat(player: PlayerConnection, text: string) {
  const room = findRoomByPlayer(player.userId)
  if (!room) return
  if (typeof text !== 'string' || text.trim().length === 0 || text.length > 200) return

  const msg: ChatMessage = {
    playerId: player.userId,
    playerName: player.username,
    text: text.trim(),
    timestamp: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
  }
  room.chatMessages.push(msg)
  if (room.chatMessages.length > 100) room.chatMessages.shift()

  // Send to opponent only — sender has local echo
  const opponent = getOpponent(room, player.userId)
  if (opponent) send(opponent.ws, { type: 'chat_message', ...msg })
}

function handleListRooms(player: PlayerConnection) {
  const list: Array<{ code: string; hostUsername: string }> = []
  for (const room of rooms.values()) {
    if (room.state === 'waiting' && room.players[1] === null) {
      list.push({ code: room.code, hostUsername: room.players[0].username })
    }
  }
  send(player.ws, { type: 'room_list', rooms: list })
}

function handleSyncRequest(player: PlayerConnection) {
  const room = findRoomByPlayer(player.userId)
  if (!room || !room.game) {
    send(player.ws, { type: 'error', message: '没有进行中的对局' })
    return
  }
  const roomPlayer = room.players.find(p => p && p.userId === player.userId)
  tickGame(room.game, Date.now())
  send(player.ws, {
    type: 'game_state',
    pieces: room.game.pieces,
    currentTurn: room.game.currentTurn,
    yourColor: roomPlayer?.color ?? player.color,
    timers: getTimers(room.game),
  })
}

function handleDisconnect(player: PlayerConnection) {
  const room = findRoomByPlayer(player.userId)
  if (!room) return

  const opponent = getOpponent(room, player.userId)

  if (room.state === 'playing') {
    // Start 60s reconnection timer
    if (opponent) send(opponent.ws, { type: 'opponent_disconnected', playerId: player.userId })

    room.disconnectTimer = setTimeout(() => {
      // Forfeit after timeout
      if (opponent) {
        const winnerColor = opponent.color === 'r' ? 'r' : 'b'
        send(opponent.ws, { type: 'game_over', winner: winnerColor, reason: 'timeout' })
        send(opponent.ws, { type: 'player_left', playerId: player.userId })
      }
      cleanupRoom(room.code)
    }, 60_000)
    return
  }

  // Not in game — just remove
  if (opponent) send(opponent.ws, { type: 'player_left', playerId: player.userId })
  cleanupRoom(room.code)
}

function handleNewGameRequest(player: PlayerConnection) {
  const room = findRoomByPlayer(player.userId)
  if (!room) return
  const opponent = getOpponent(room, player.userId)
  if (opponent) send(opponent.ws, { type: 'new_game_request' })
}

function handleNewGameAccept(player: PlayerConnection) {
  const room = findRoomByPlayer(player.userId)
  if (!room || (room.state !== 'playing' && room.state !== 'finished')) return
  const opponent = getOpponent(room, player.userId)

  room.game = createGame(undefined, room.remainingRedGameTime, room.remainingBlackGameTime)
  room.state = 'playing'
  room.players[0]!.color = 'r'
  room.players[1]!.color = 'b'

  const timers = getTimers(room.game)
  send(room.players[0]!.ws, {
    type: 'game_started',
    board: room.game.pieces,
    yourColor: 'r',
    currentTurn: 'r',
    timers,
  })
  send(room.players[1]!.ws, {
    type: 'game_started',
    board: room.game.pieces,
    yourColor: 'b',
    currentTurn: 'r',
    timers,
  })
}

function broadcast(room: Room, msg: Record<string, unknown>) {
  for (const p of room.players) {
    if (p) send(p.ws, msg)
  }
}
