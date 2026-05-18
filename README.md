# 揭棋风云 v0.7.6

中国象棋揭棋对战游戏。支持本地热座双人对战和 WebSocket 联机对战，内置 VIP 作弊模式、计时系统、游戏内聊天。

Vue 3 + TypeScript + Canvas 2D 前端，Express + WebSocket + SQLite 后端。

## 快速开始

```bash
# 前端
npm install
npm run dev              # http://localhost:5173

# 联机模式还需要启动后端
cd server && npm install
npm run dev:server       # http://localhost:3001
```

## 命令

```bash
npm run dev              # 启动前端开发服务器
npm run dev:server       # 启动后端（联机需要）
npm run build            # 类型检查 + 构建生产版本
npm run test             # 运行所有测试 (49 个)
npx vitest               # 监听模式运行测试
npx vitest run src/path/to/test.ts  # 运行单个测试
npx vue-tsc --noEmit     # TypeScript 类型检查
```

## 功能

### 对战模式

- **本地热座** — 双人同屏轮流操作，无需登录
- **联机对战** — WebSocket 服务端中继，TCP 可靠送达
  - 创建房间（自动生成 5 位房间号）或输入房间号加入
  - 快速匹配自动配对在线玩家
  - 游戏内聊天，经服务器转发

### 揭棋规则

- 棋子初始背面朝上，走子后翻开显示真实身份
- Fisher-Yates 随机洗牌，每局棋子分布不同
- 暗棋走法按位置对应棋子类型（如"车位"按车走），翻开后按真实身份走
- 7 种棋子各有独立走法，含蹩马脚、塞象眼
- 明子士象可过河（揭棋特有规则）

### 游戏机制

- **计时系统** — 双方各 15 分钟局时 + 1 分 30 秒步时，服务端权威同步
- **将军/绝杀/困毙/超时** — 棋盘中央大字提示
- **被吃棋子展示** — 棋盘上方显示双方得子，暗子被吃仅吃方可见实际类型
- **判和规则** — 40 回合无吃子/翻棋自动判和；任一方车马炮兵全灭自动判和
- **认输 / 新游戏** — 认输后显示胜利弹窗，支持双方同意再来一局

### 用户系统

- bcrypt + JWT 注册登录
- VIP 用户（wkrabbit / admin111）自动获得作弊权限
- 未登录可本地对战，联机功能需登录

### VIP 作弊模式

- 联机模式下右键暗棋可自定义棋子类型
- 移动后翻开显示定义的棋子，走法仍按原始暗子规则
- 支持"默认"选项取消作弊（不触发紫色特效）
- 服务端验证棋子数量上限，防止出现 3 个同阵营车/马等

### 网络稳定性

- WebSocket 心跳机制（30 秒 ping/pong），防止空闲断连
- 断线自动重连（2 秒间隔）
- 服务端权威计时，客户端同步 timers
- 新游戏局时保留上一局剩余时间
- 断线 60 秒内自动恢复房间状态和对局同步，超时判负

## 架构

```
前端 Vue SPA                          后端 Express + WS
┌─────────────────────┐              ┌──────────────────────┐
│ Vue 组件 → Pinia     │   WebSocket  │ ws.ts 房间管理/消息路由 │
│          ↕           │◄────────────►│ game.ts 服务端游戏逻辑  │
│ Engine (纯函数, 共享)  │              │ auth.ts JWT 认证       │
│          ↕           │              │ db.ts SQLite           │
│ Canvas 渲染 + 动画    │              └──────────────────────┘
└─────────────────────┘                     ↕
                                       src/engine/ (共享)
```

- **规则引擎** (`src/engine/`) — 纯 TypeScript，前后端共享，可独立测试
- **状态管理** (`src/stores/`) — boardStore + gameStore + authStore + lobbyStore + cheatStore
- **Canvas 渲染** (`src/renderer/`) — BoardRenderer / PieceRenderer / EffectRenderer
- **动画系统** (`src/animation/`) — FlipAnimator / MoveAnimator / CaptureAnimator，rAF 驱动
- **服务端** (`server/src/`) — 走法验证、计时管理、房间管理、作弊校验均为服务端权威

### 核心数据流（联机）

1. 用户点击 Canvas → `findPieceAt()` 碰撞检测 → `selectPiece()` 计算合法走法
2. 点击目标位置 → 动画启动 → `moveTo()` 发送 `{ pieceId, toRow, toCol, cheatedType }` 到服务端
3. 服务端 `processMove()` 验证走法 → 应用作弊 → 更新权威状态 → 广播结果
4. 客户端 `handleMoveAccepted()` 用服务端 board 替换本地状态
5. 动画用存储的起始位置渲染，防止 board 替换后视觉跳变

## 项目结构

```
src/
├── engine/                # 规则引擎（前后端共享）
│   ├── constants.ts       # 随机布局、位置类型映射、暗区判断
│   ├── moveValidator.ts   # 暗棋/明棋走法（7 种棋子，含蹩马脚、塞象眼）
│   └── checkDetector.ts   # 将军/将死/困毙检测
├── stores/                # Pinia 状态管理
│   ├── boardStore.ts      # 棋盘数据 CRUD，grid 由 pieces 重建
│   ├── gameStore.ts       # 游戏流程、计时、WS 事件处理、胜负判定、断线等待
│   ├── authStore.ts       # JWT 认证状态
│   ├── lobbyStore.ts      # 房间管理、快速匹配
│   └── cheatStore.ts      # VIP 作弊预设（pendingCheats Map）
├── renderer/              # Canvas 2D 渲染
│   ├── BoardRenderer.ts   # 棋盘网格、楚河汉界、九宫斜线
│   ├── PieceRenderer.ts   # 暗棋/明棋圆棋子，支持动画偏移 + 紫色光晕
│   └── EffectRenderer.ts  # 高亮、选中光晕、将军脉冲、大字提示
├── animation/             # rAF 驱动动画
│   ├── FlipAnimator.ts    # 翻棋 scaleX 动画（含 midPoint 回调）
│   ├── MoveAnimator.ts    # 移动 ease-out 动画（存储起始行列）
│   └── CaptureAnimator.ts # 吃子缩放消失动画
├── services/
│   ├── ws.ts              # WebSocket 客户端单例，心跳 + 自动重连
│   └── api.ts             # REST API 客户端（auth）
├── components/
│   ├── ChessBoard.vue     # Canvas 棋盘（核心交互 + 渲染循环 + 动画管理）
│   ├── GameLayout.vue     # 布局容器 + 被吃棋子展示 + WinDialog
│   ├── WinDialog.vue      # 胜利弹窗（Teleport to body）
│   ├── SidePanel.vue      # 回合指示、计时、作弊开关、聊天
│   ├── ChatPanel.vue      # 游戏内聊天（默认展开）
│   ├── CheatMenu.vue      # 右键作弊菜单（含"默认"选项）
│   ├── LobbyView.vue      # 游戏大厅（创建/加入房间、快速匹配）
│   ├── AuthModal.vue      # 登录/注册
│   └── TimerDisplay.vue   # 计时器显示
├── router/index.ts        # Vue Router（/login → /lobby → /game/:code）
├── utils/coordinates.ts   # pixelToBoard / boardToPixel / calcBoardDimensions
└── types/index.ts         # Piece, PieceType, Color, Position, BoardGrid

server/                    # 后端
├── src/
│   ├── index.ts           # Express + WebSocket 服务器入口
│   ├── ws.ts              # 房间管理、消息路由、心跳响应、快速匹配、断线重连恢复
│   ├── game.ts            # 服务端权威游戏逻辑（验证走法、计时、作弊校验）
│   ├── auth.ts            # POST /api/auth/register + login
│   ├── middleware.ts      # JWT 验证 + URL token 解析
│   └── db.ts              # SQLite (better-sqlite3)，users + games 表
└── data/                  # SQLite 数据库文件
```

## 路由

| 路径 | 组件 | 说明 |
|------|------|------|
| `/login` | AuthModal | 登录/注册（默认首页） |
| `/lobby` | LobbyView | 游戏大厅 |
| `/game/local` | GameLayout | 本地热座 |
| `/game/room/:code` | GameLayout | 联机对战 |

## 技术栈

**前端：** Vue 3 · TypeScript · Pinia · Tailwind CSS v4 · Canvas 2D · Vite · Vue Router

**后端：** Express · WebSocket (ws) · SQLite (better-sqlite3) · bcryptjs · jsonwebtoken

**测试：** Vitest · happy-dom · vue-tsc

## 版本记录

### v0.7.6
- 断线重连恢复：重连后自动恢复房间状态，同步游戏棋盘和计时器，清除超时计时器
- handleMove 静默失败修复：玩家颜色异常时返回明确错误而非卡死
- 客户端对手断线不再立即判负，等待 60 秒重连窗口
- GameLayout 顶栏新增断线闪烁提示

### v0.7.5
- awaitingServer 锁防止等待服务端响应期间的重复操作
- WebSocket 发送失败时自动回滚棋盘快照
- 被吃暗棋类型保护：对手侧显示为 unknown，吃方可见实际类型
- authStore token 持久化改进

### v0.7.4
- 联机吃子去重：乐观更新和 handleMoveAccepted 不再重复记录
- 作弊暗棋走法使用作弊类型验证（客户端 + 服务端）
- 胜利弹窗 + 按钮状态修复
- 聊天消息去重：服务端仅发送给对手

### v0.7.3
- 作弊清除时机从发送时改为服务端确认后（clearCheat 移到 handleMoveAccepted）
- WebSocket 持久连接：从 LobbyView onMounted 提升到 App.vue watch(auth.token)
- 对手离开通知 + 离开房间时检查连接状态

### v0.7.2
- 修复作弊上限检查误拒：canCheatType 排除被作弊棋子自身，初始洗牌满额不再阻止作弊

### v0.7.1
- 修复作弊棋子不移动只翻开：服务端验证走法用 piece 原始类型（与客户端一致），验证通过后再应用作弊
- 修复联机模式 flip 动画中点污染本地 board 状态（翻开的明子变回暗子）

### v0.7.0
- 作弊功能重做：走法始终按原始暗子规则，移动后翻开才显示作弊类型
- 修复动画系统：MoveAnimator 存储起始位置，防止 board 替换后棋子反向滑动
- 服务端作弊验证：用临时 piece 验证走法，验证通过后再应用 mutation，失败不污染 piece type
- move_rejected 回滚：清除动画、恢复游戏状态

### v0.6.9
- WebSocket 心跳机制（30 秒 ping/pong），防止空闲断连
- 被吃棋子显示：暗子被吃区分吃方/被吃方可见性
- 认输后显示胜利弹窗，支持再来一局
- 未登录时加入房间按钮禁用

### v0.6.8
- 计时同步全面修复：服务端 tickGame、switchTurnTimer 顺序、game_state timers
- 新游戏局时保留上一局剩余时间
- 本地对战动画修复：翻棋+移动动画合并
- 作弊菜单添加"默认"选项，棋子数量上限校验
- 聊天面板默认展开

### v0.6.7
- 服务端统一计时，客户端同步 timers
- 吃子后正确显示在棋盘上方

### v0.6.5
- 架构从 P2P (PeerJS/WebRTC) 切换为 WebSocket 服务端中继
- 服务端生成房间号、快速匹配、判和规则

### v0.5.0
- 初版：本地热座、随机开局、P2P 联机、VIP 作弊、用户认证
