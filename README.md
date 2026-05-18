# 揭棋风云 v0.6.8

中国象棋揭棋对战游戏，Vue 3 + TypeScript + Canvas 2D，支持本地热座和 WebSocket 联机对战。

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
- **将军/绝杀/困毙/超时** — 棋盘中央大字提示，持续 1 秒
- **计时系统** — 双方各 15 分钟局时 + 1 分 30 秒步时，轮流扣减
- **被吃棋子展示** — 棋盘上方显示双方得子，暗子被吃仅吃方可见
- **用户注册/登录** — bcrypt + JWT 认证
- **VIP 作弊模式** — wkrabbit / admin111 自动 VIP，右键暗棋选类型
- **WebSocket 联机** — 服务端中继走子数据，TCP 保证可靠送达，不再受 NAT 限制
- **服务端生成房间号** — 点创建即得 5 位房间号，对手输入加入
- **游戏内聊天** — 经服务器转发，显示用户名，本地回显
- **快速匹配** — 自动配对在线玩家
- **40 回合判和** — 无吃子/翻棋累计 40 回合自动判和
- **无进攻子力判和** — 任一方车马炮兵全灭自动判和
- **Render.com 部署** — 支持一键部署到 Render

### 已知问题
- **断线重连未实现** — 刷新后需重新加入房间
- **棋盘未翻转** — 棋盘固定视角，未根据执棋颜色翻转
- **长将/长捉检测** — 未实现

## 命令

```bash
npm install              # 安装前端依赖
npm run dev              # 启动前端开发服务器
npx vitest run           # 运行所有测试 (49 个)
npx vue-tsc --noEmit     # TypeScript 类型检查
npm run build            # 构建生产版本
npm run dev:server       # 启动后端
```

## 联机流程

1. 双方打开大厅页面
2. 房主输入房间号（如 `1234`）→ 点击「创建房间」
3. 对手输入相同房间号 → 点击「加入房间」
4. 房主点击「开始对局」
5. 红方先行，走子数据通过 P2P 直传

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
│   └── EffectRenderer.ts  # 高亮、光晕、脉冲、大字提示
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
│   ├── CheatMenu.vue      # 右键作弊菜单
│   └── TimerDisplay.vue   # 计时器显示
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

Vue 3 · TypeScript · Pinia · Tailwind CSS v4 · Canvas 2D · Vite · Vue Router · Express · SQLite (better-sqlite3) · WebSocket (ws) · bcryptjs · jsonwebtoken · Vitest

## 版本记录

### v0.6.8
- 修复本地对战暗棋移动时翻棋动画覆盖移动动画（棋子原地翻转不移动）
- 修复计时同步：服务端 tickGame() 未调用导致 timer 始终为满值
- 修复计时同步：switchTurnTimer() 调用顺序错误导致步时未正确重置
- 修复计时同步：game_state 同步响应不含 timers，重连后计时丢失
- 修复计时同步：新游戏局时保留上一局剩余时间，步时重置为 90 秒
- 作弊菜单添加"默认"选项，可取消已设置的作弊（不触发紫色特效）
- 服务端作弊验证：限制同阵营棋子数量不超过标准上限（防止出现 3 个马等）
- 聊天面板默认展开，进入对局可直接输入消息
- 作弊开关白色圆点位置左移

### v0.6.7
- 服务端统一计时，客户端同步 timers（修复双方计时不一致）
- 吃子后正确显示在棋盘上方（服务端 captured 下发）
- 新局自动清除作弊预设
- 聊天输入框+作弊开关 UI 修复

### v0.6.6
- 修复 WS 模式步时未重置
- 新游戏改为双方同意机制（new_game_request/accept）
- 35 回合无吃子显示"还有5回合判和"提示
- 作弊模式验证修复

### v0.6.5
- **架构大修**：从 P2P (PeerJS/WebRTC) 切换为 WebSocket 服务端中继
- 走子数据经服务器转发，TCP 保证可靠送达，根除走子同步 bug
- 移除 peerjs/peer 依赖，bundle 体积大幅缩小
- 服务端生成 5 位房间号，保留自定义房间号加入
- 恢复快速匹配功能
- 40 回合无吃子/翻棋自动判和
- 无进攻子力自动判和

### v0.6.4
- 添加 Google STUN 服务器、消息 ACK 确认、40 回合判和、无进攻子力判和

### v0.6.3
- 修复联机走子后对方棋子消失、回合卡死（增加防御性位置查找）
- 修复联机模式计时器不工作（移除在线模式禁用计时器的旧逻辑）
- 修复刷新页面后切换到本地对局（联机路由断连自动跳回大厅）
- 修复联机新游戏按钮切到本地模式（改为 P2P 同步重启）
- 修复吃子后双方可见性错误（只在吃子方记录，被吃方不可见）
- 修复聊天消息无本地回显、对方显示 Unknown
- 修复房间双方用户名不显示或显示 Guest

### v0.6.2
- 同上（含 ChatMsg 类型修复）

### v0.6.1
- 自定义房间号：房主输入房间号创建，对手输入相同号码加入

### v0.6.0
- Express 5 下 PeerJS 信令路径修复，创建/加入房间恢复正常
- 路由首页改为登录注册页
- 双方各 15 分钟独立局时，轮流扣减不重置
- 超时判负显示"红方获胜"/"黑方获胜"大字提示

### v0.5.0
- 初版：本地热座揭棋对战、随机开局、P2P 联机、VIP 作弊、用户认证
