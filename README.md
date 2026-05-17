# 揭棋风云 v0.5

中国象棋揭棋对战游戏，Vue 3 + TypeScript + Canvas 2D，支持本地热座和 P2P 联机对战。

## 快速开始

```bash
npm install
npm run dev              # http://localhost:5173

# 联机模式还需要启动后端
cd server && npm install
npx tsx src/index.ts     # http://localhost:3001
```

## 功能

### 已实现
- **本地热座对战** — 双人同屏轮流操作
- **暗棋规则** — 棋子初始背面朝上，走子后翻开显示真实身份
- **随机开局** — Fisher-Yates 洗牌，每局棋子分布不同
- **暗棋走法** — 按位置对应棋子类型走子（如"车位"按车走），翻开后按真实身份走
- **完整棋子规则** — 7 种棋子各有独立走法，含蹩马脚、塞象眼
- **明子士象可过河** — 揭棋特有规则
- **将军/绝杀/困毙** — 棋盘中央大字提示
- **计时系统** — 局时 15 分钟，步时 1 分 30 秒
- **被吃棋子展示** — 棋盘上方显示双方得子
- **用户注册/登录** — bcrypt + JWT 认证
- **VIP 作弊模式** — wkrabbit / admin111 自动获得 VIP，在线对局可开启作弊
- **右键暗棋改类型** — VIP 右键暗棋选择类型，移动时生效
- **P2P 联机架构** — PeerJS (WebRTC) 直连，游戏数据不经服务器
- **房间创建/加入** — PeerJS ID 作为房间号
- **游戏内聊天** — P2P 直传文字消息

### 已知问题
- **创建房间偶尔失败** — PeerJS 信令连接不稳定，需刷新重试
- **联机功能未完全稳定** — P2P 受网络环境影响，部分 NAT 类型无法直连
- **快速匹配不可用** — 纯 P2P 架构暂不支持自动匹配
- **断线重连未实现**
- **长将/长捉检测** — 未实现
- **40 回合无吃子判和** — 未实现
- **无进攻子力判和** — 未实现

## 命令

```bash
npm install              # 安装前端依赖
npm run dev              # 启动前端开发服务器
npx vitest run           # 运行所有测试 (49 个)
npx vue-tsc --noEmit     # TypeScript 类型检查
npm run build            # 构建生产版本
npm run dev:server       # 启动后端
```

## 项目结构

```
src/
├── engine/                # 规则引擎（纯函数，可独立测试）
│   ├── constants.ts       # 随机布局、位置类型映射、暗区判断
│   ├── moveValidator.ts   # 暗棋/明棋走法（7 种棋子类型）
│   └── checkDetector.ts   # 将军/将死/困毙检测
├── stores/                # Pinia 状态管理
│   ├── boardStore.ts      # 棋盘数据 CRUD
│   ├── gameStore.ts       # 游戏流程、计时、P2P 同步
│   ├── authStore.ts       # 认证状态
│   ├── lobbyStore.ts      # P2P 房间管理
│   └── cheatStore.ts      # VIP 作弊预设
├── renderer/              # Canvas 2D 渲染层
│   ├── BoardRenderer.ts   # 棋盘网格、楚河汉界、九宫斜线
│   ├── PieceRenderer.ts   # 暗棋/明棋圆棋子
│   └── EffectRenderer.ts  # 高亮、光晕、将军脉冲、大字提示
├── animation/             # requestAnimationFrame 动画
│   ├── FlipAnimator.ts    # 翻棋动画
│   ├── MoveAnimator.ts    # 移动动画
│   └── CaptureAnimator.ts # 吃子动画
├── services/              # 网络通信
│   ├── api.ts             # REST API 客户端
│   └── p2p.ts             # PeerJS P2P 封装
├── components/            # Vue 组件
│   ├── ChessBoard.vue     # Canvas 棋盘（核心交互）
│   ├── GameLayout.vue     # 布局容器 + 被吃棋子
│   ├── SidePanel.vue      # 侧面板（回合、计时、作弊开关、聊天）
│   ├── AuthModal.vue      # 登录/注册
│   ├── LobbyView.vue      # 游戏大厅
│   ├── ChatPanel.vue      # 游戏内聊天
│   └── CheatMenu.vue      # 右键作弊菜单
├── router/index.ts        # Vue Router
└── utils/coordinates.ts   # 坐标转换

server/                    # 后端（联机需要）
├── src/
│   ├── index.ts           # Express + PeerJS 信令服务器
│   ├── auth.ts            # 注册/登录 API
│   └── db.ts              # SQLite 数据库
└── data/                  # 数据库文件
```

## 架构

```
Vue 组件 → Pinia Stores → Engine (纯函数)
                ↕
         Canvas 渲染层 + P2P DataChannel
```

- Engine 纯 TypeScript，零框架依赖，可单独测试
- Renderer 接收状态每帧绘制 Canvas
- P2P 走子数据通过 PeerJS (WebRTC) 直传，不经服务器
- 信令服务器仅用于建立 WebRTC 连接

## 技术栈

Vue 3 · TypeScript · Pinia · Tailwind CSS v4 · Canvas 2D · Vite · Vue Router · PeerJS (WebRTC) · Express · SQLite · Vitest
