# 待修复 Bug 列表

## Bug 1: 暗子吃子后双方信息不对称

**位置**: `server/src/ws.ts` handleMove 函数，对手消息中的 captured 处理

**现象**: 红方吃了黑方暗子后，红方能看到翻开后是什么棋子，但黑方看不到（显示为 unknown）

**根因**: handleMove 中对 `opponent_moved` 消息做了 captured 类型隐藏：
```typescript
const opponentCaptured = result.captured
  ? { ...result.captured, type: result.captured.capturedDark ? 'unknown' : result.captured.type }
  : undefined
```
暗子被吃时已经翻开（`faceUp = true`），但发送给对手时仍然把 type 替换为 'unknown'。

**预期行为**: 暗子被吃后双方都应该能看到翻开的类型。只有在暗子还没被吃/翻开时，对手才不需要知道类型。

**修复方向**: 移除 `capturedDark ? 'unknown' : result.captured.type` 的判断，直接发送实际类型。或者改为：被吃的暗子已经翻开，type 应该发送给双方。

## Bug 2: 联机胜利窗口残留到本地对局（已修复）

**位置**: `src/components/WinDialog.vue` backToLobby、`src/stores/gameStore.ts` newGame

**现象**: 联机对战胜利后点返回大厅，再进本地对局，胜利窗口仍在。点再来一局无反应。本地对局无法进行。

**根因**: `backToLobby()` 只重置了 `game.phase = 'playing'`，未清除 `winner`、`gameoverReason`、`yourColor` 等状态。`newGame()` 在线模式下只发送请求不重置本地状态。

**修复**:
1. `backToLobby()` 中完全重置游戏状态（phase, winner, gameoverReason, mode, yourColor）
2. `newGame()` 在线模式下也重置本地状态（phase, winner, gameoverReason, selectedPiece, legalMoves），让胜利窗口关闭，服务端 game_started 会重新初始化
