import { WebSocket } from 'ws'
import { verifyToken, parseTokenFromUrl, JwtPayload } from './middleware.js'
import { createGame, processMove, getGrid, findPiece, ServerGame } from './game.js'
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
}

interface ChatMessage {
  playerId: number
  playerName: string
  text: string
  timestamp: string
}

const rooms = new Map<string, Room>()
const matchQueue: PlayerConnection[] = []

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
    case 'start_game': return handleStartGame(player)
    case 'move': return handleMove(player, msg)
    case 'resign': return handleResign(player)
    case 'chat_message': return handleChat(player, msg.text as string)
    case 'quick_match': return handleQuickMatch(player)
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
    const opponent = getOpponent(room, player.userId)
    const winnerColor = player.color === 'r' ? 'b' : 'r'
    broadcast(room, { type: 'game_over', winner: winnerColor, reason: 'resign' })
    if (opponent) send(opponent.ws, { type: 'player_left', playerId: player.userId })
    room.state = 'finished'
  } else {
    broadcast(room, { type: 'player_left', playerId: player.userId })
  }

  cleanupRoom(room.code)
}

function handleStartGame(player: PlayerConnection) {
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

  room.players[0].color = 'r'
  room.players[1].color = 'b'

  send(room.players[0].ws, {
    type: 'game_started',
    board: room.game.pieces,
    yourColor: 'r',
    currentTurn: 'r',
  })
  send(room.players[1].ws, {
    type: 'game_started',
    board: room.game.pieces,
    yourColor: 'b',
    currentTurn: 'r',
  })
}

function handleMove(player: PlayerConnection, msg: Record<string, unknown>) {
  const room = findRoomByPlayer(player.userId)
  if (!room || room.state !== 'playing' || !room.game) {
    send(player.ws, { type: 'error', message: '对局未开始' })
    return
  }
  if (!player.color) return

  const pieceId = msg.pieceId as number
  const toRow = msg.toRow as number
  const toCol = msg.toCol as number
  const cheatedType = msg.cheatedType as PieceType | undefined

  // VIP cheat validation
  if (cheatedType && !player.isVip) {
    send(player.ws, { type: 'move_rejected', reason: '没有作弊权限' })
    return
  }

  const result = processMove(room.game, pieceId, toRow, toCol, player.color, cheatedType)
  if (!result.ok) {
    send(player.ws, { type: 'move_rejected', reason: result.error })
    return
  }

  const fromPiece = findPiece(room.game, pieceId)
  send(player.ws, {
    type: 'move_accepted',
    pieceId,
    from: fromPiece ? { row: fromPiece.row, col: fromPiece.col } : null,
    to: { row: toRow, col: toCol },
    captured: result.captured,
    revealed: result.revealed,
    board: result.board,
    currentTurn: room.game.currentTurn,
    noCaptureCount: result.noCaptureCount,
  })

  const opponent = getOpponent(room, player.userId)
  if (opponent) {
    send(opponent.ws, {
      type: 'opponent_moved',
      pieceId,
      from: fromPiece ? { row: fromPiece.row, col: fromPiece.col } : null,
      to: { row: toRow, col: toCol },
      captured: result.captured,
      revealed: result.revealed,
      board: result.board,
      currentTurn: room.game.currentTurn,
      noCaptureCount: result.noCaptureCount,
    })
  }

  if (result.gameOver) {
    broadcast(room, { type: 'game_over', winner: result.gameOver.winner, reason: result.gameOver.reason })
    room.state = 'finished'
  }
}

function handleResign(player: PlayerConnection) {
  const room = findRoomByPlayer(player.userId)
  if (!room || room.state !== 'playing') return
  const winnerColor = player.color === 'r' ? 'b' : 'r'
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

  broadcast(room, { type: 'chat_message', ...msg })
}

function handleQuickMatch(player: PlayerConnection) {
  if (findRoomByPlayer(player.userId)) {
    send(player.ws, { type: 'error', message: '你已在一个房间中' })
    return
  }

  if (matchQueue.length > 0) {
    const opponent = matchQueue.shift()!
    const code = generateRoomCode()
    const room: Room = {
      code,
      players: [opponent, player],
      hostId: opponent.userId,
      state: 'waiting',
      game: null,
      disconnectTimer: null,
      chatMessages: [],
    }
    rooms.set(code, room)
    const playerList = [opponent, player].map(p => ({ id: p.userId, username: p.username }))
    send(opponent.ws, { type: 'room_joined', roomCode: code, players: playerList, hostId: opponent.userId })
    send(player.ws, { type: 'room_joined', roomCode: code, players: playerList, hostId: opponent.userId })

    // Auto-start
    room.state = 'playing'
    room.game = createGame()
    opponent.color = 'r'
    player.color = 'b'
    send(opponent.ws, { type: 'game_started', board: room.game.pieces, yourColor: 'r', currentTurn: 'r' })
    send(player.ws, { type: 'game_started', board: room.game.pieces, yourColor: 'b', currentTurn: 'r' })
  } else {
    matchQueue.push(player)
    send(player.ws, { type: 'matching', message: '正在寻找对手...' })
  }
}

function handleSyncRequest(player: PlayerConnection) {
  const room = findRoomByPlayer(player.userId)
  if (!room || !room.game) {
    send(player.ws, { type: 'error', message: '没有进行中的对局' })
    return
  }
  send(player.ws, {
    type: 'game_state',
    pieces: room.game.pieces,
    currentTurn: room.game.currentTurn,
            
    yourColor: player.color,
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

  // Remove from match queue
  const qi = matchQueue.findIndex(p => p.userId === player.userId)
  if (qi !== -1) matchQueue.splice(qi, 1)
}

function handleNewGameRequest(player: PlayerConnection) {
  const room = findRoomByPlayer(player.userId)
  if (!room) return
  const opponent = getOpponent(room, player.userId)
  if (opponent) send(opponent.ws, { type: 'new_game_request' })
}

function handleNewGameAccept(player: PlayerConnection) {
  const room = findRoomByPlayer(player.userId)
  if (!room || room.state !== 'playing') return
  const opponent = getOpponent(room, player.userId)

  room.game = createGame()
  room.players[0]!.color = 'r'
  room.players[1]!.color = 'b'

  send(room.players[0]!.ws, {
    type: 'game_started',
    board: room.game.pieces,
    yourColor: 'r',
    currentTurn: 'r',
  })
  send(room.players[1]!.ws, {
    type: 'game_started',
    board: room.game.pieces,
    yourColor: 'b',
    currentTurn: 'r',
  })
}

function broadcast(room: Room, msg: Record<string, unknown>) {
  for (const p of room.players) {
    if (p) send(p.ws, msg)
  }
}
