# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

**揭棋风云** — 中国象棋揭棋对战游戏，Vue 3 + TypeScript + Canvas 2D，支持本地热座和 WebSocket 联机对战。

## 命令

```bash
# 前端
npm install              # 安装前端依赖
npm run dev              # 启动前端开发服务器 (http://localhost:5173)
npm run build            # vue-tsc 类型检查 + vite 构建生产版本
npm run test             # vitest run（等价 npx vitest run）
npx vitest               # 监听模式运行测试
npx vitest run src/path/to/test.ts  # 运行单个测试文件
npx vue-tsc --noEmit     # TypeScript 类型检查（不构建）

# 后端（联机模式需要）
npm run dev:server       # cd server && npx tsx src/index.ts (http://localhost:3001)
```

## 架构

前后端分离，前端为 Vue SPA，后端为 Express + WebSocket 服务。**关键：后端直接复用前端的 `src/engine/` 规则引擎**（`server/src/game.ts` 通过相对路径 `../../src/engine/index.js` 导入）。

### 前端架构

```
Vue 组件 → Pinia Stores → Engine (纯函数)
                ↕
         Canvas 渲染层
         WebSocket (wsService)
```

- **规则引擎** (`src/engine/`) — 纯 TypeScript，零框架依赖，前后端共享
- **状态管理** (`src/stores/`) — boardStore（棋盘数据）+ gameStore（游戏流程 + 计时 + WS 同步）+ authStore + lobbyStore + cheatStore
- **Canvas 渲染** (`src/renderer/`) — BoardRenderer / PieceRenderer / EffectRenderer，每帧在 ChessBoard.vue 的 `gameLoop` 中调用
- **动画系统** (`src/animation/`) — FlipAnimator / MoveAnimator / CaptureAnimator，基于 requestAnimationFrame，回调模式
- **WebSocket 客户端** (`src/services/ws.ts`) — `wsService` 单例，事件驱动（`on`/`send`/`emit`），自动重连

### 后端架构

```
Express HTTP (auth API)
       ↓
http.createServer → WebSocketServer (path: /ws)
       ↓
ws.ts (房间管理 + 消息路由) → game.ts (服务端游戏逻辑，复用 src/engine)
       ↓
db.ts (better-sqlite3, WAL mode)
```

- **server/src/index.ts** — Express 入口，挂载 auth 路由 + WebSocket 服务器 + 静态文件服务
- **server/src/ws.ts** — 房间管理、消息分发、60s 断线超时判负、快速匹配队列
- **server/src/game.ts** — 服务端权威游戏状态，验证走法合法性，管理计时器
- **server/src/auth.ts** — bcrypt + JWT 注册登录，VIP 用户白名单
- **server/src/db.ts** — SQLite (better-sqlite3)，users + games 表

### 路由

`/` → `/login` (AuthModal) → `/lobby` (LobbyView) → `/game/local` 或 `/game/room/:code` (GameLayout)

### 核心数据流（本地模式）

1. 用户点击 Canvas → `findPieceAt()` 通过圆形碰撞检测算出棋子
2. `gameStore.selectPiece()` 调用 `getLegalMoves()` + `isInCheck()` 过滤合法走法
3. `gameStore.moveTo()` → `boardStore.movePiece()` / `revealPiece()` 更新棋盘
4. `gameLoop`（requestAnimationFrame）每帧绘制：board → pieces（带动画偏移） → effects
5. 动画运行中 `phase === 'animating'` 禁用用户输入

### 核心数据流（联机模式）

1. 客户端 `wsService.send('move', { pieceId, toRow, toCol })` 发送到服务端
2. 服务端 `processMove()` 验证合法性 → 更新权威状态 → 广播 `move_accepted` / `opponent_moved`
3. 客户端 `handleMoveAccepted()` / `handleOpponentMoved()` 用服务端返回的 `board` 重建本地状态
4. 计时由服务端 `tickGame()` 统一管理，客户端通过 `timers` 字段同步

### 暗棋 vs 明棋

`piece.faceUp` 决定走法：`false` → 按位置对应棋子走法（暗棋规则），`true` → 标准象棋走法。
翻开区域：红方 row 0-4（不含 king），黑方 row 5-9（不含 king）。
`getPositionType(row, col)` 返回该位置在传统布局中对应的棋子类型。

## 项目结构

```
src/
├── main.ts, App.vue, style.css
├── types/index.ts                 # Piece, PieceType, Color, Position, BoardGrid
├── engine/                        # 规则引擎（纯函数，前后端共享）
│   ├── constants.ts               # Fisher-Yates 随机布局、POSITION_TYPE_MAP、isDarkZone
│   ├── moveValidator.ts           # 暗棋 + 7 种标准棋子走法（含蹩马脚、塞象眼）
│   ├── checkDetector.ts           # 将军/将死/困毙检测
│   └── index.ts
├── stores/
│   ├── boardStore.ts              # 棋盘数据 CRUD，grid 由 pieces 重建
│   ├── gameStore.ts               # 游戏流程、计时、WS 事件处理、胜负判定
│   ├── authStore.ts               # JWT 认证状态
│   ├── lobbyStore.ts              # 房间管理
│   └── cheatStore.ts              # VIP 作弊预设（暗棋指定类型）
├── renderer/
│   ├── BoardRenderer.ts           # 棋盘网格、楚河汉界、九宫斜线
│   ├── PieceRenderer.ts           # 暗棋/明棋圆棋子，支持动画偏移
│   └── EffectRenderer.ts          # 高亮、选中光晕、将军脉冲、大字提示
├── animation/
│   ├── FlipAnimator.ts            # 翻棋 scaleX 动画
│   ├── MoveAnimator.ts            # 移动 ease-out 动画
│   └── CaptureAnimator.ts         # 吃子缩放消失动画
├── services/
│   ├── ws.ts                      # WebSocket 客户端单例，事件驱动 + 自动重连
│   ├── api.ts                     # REST API 客户端（auth）
│   └── p2p.ts                     # PeerJS P2P（已弃用，保留兼容）
├── components/
│   ├── ChessBoard.vue             # Canvas 棋盘（核心交互 + 渲染循环）
│   ├── GameLayout.vue             # 布局容器 + 被吃棋子展示
│   ├── SidePanel.vue              # 回合、计时、作弊开关、聊天
│   ├── AuthModal.vue, LobbyView.vue, ChatPanel.vue, CheatMenu.vue, TimerDisplay.vue
├── router/index.ts
└── utils/coordinates.ts           # pixelToBoard / boardToPixel / calcBoardDimensions

server/                            # 后端
├── src/
│   ├── index.ts                   # Express + WebSocket 服务器入口
│   ├── ws.ts                      # 房间管理 + 消息路由（create_room/join_room/move/chat 等）
│   ├── game.ts                    # 服务端游戏逻辑（复用 src/engine，权威状态）
│   ├── auth.ts                    # POST /api/auth/register + login
│   ├── middleware.ts              # JWT 验证 + URL token 解析
│   └── db.ts                      # SQLite (better-sqlite3)，users + games 表
└── data/                          # SQLite 数据库文件
```

## 技术栈

Vue 3 · TypeScript · Pinia · Tailwind CSS v4 · Canvas 2D · Vite · Vue Router · Express · SQLite (better-sqlite3) · WebSocket (ws) · bcryptjs · jsonwebtoken · Vitest (happy-dom)
