# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

**揭棋风云** — 中国象棋揭棋对战游戏（热座模式），Vue 3 + TypeScript + Canvas 2D 单页应用。

## 命令

```bash
npm install              # 安装依赖
npm run dev              # 启动开发服务器
npx vitest run           # 运行所有测试
npx vitest               # 监听模式运行测试
npx vitest run src/path/to/test.ts  # 运行单个测试文件
npx vue-tsc --noEmit     # TypeScript 类型检查
npm run build            # 构建生产版本
```

## 架构

三层架构，渲染与逻辑分离：

```
UI (Vue 组件) → Pinia Stores → Engine (纯函数)
                    ↕
              Canvas 渲染层
```

- **规则引擎** (`src/engine/`) — 纯 TypeScript，无框架依赖，可独立测试
- **状态管理** (`src/stores/`) — boardStore（棋盘数据）+ gameStore（游戏流程）
- **Canvas 渲染** (`src/renderer/`) — 棋盘、棋子、特效分三个 renderer
- **动画系统** (`src/animation/`) — requestAnimationFrame 驱动，回调模式
- **Vue 组件** (`src/components/`) — ChessBoard 是唯一操作 Canvas 的组件

### 核心数据流

1. 用户点击 Canvas → `pixelToBoard()` 算出行列
2. `gameStore.selectPiece()` / `moveTo()` 调用 engine 验证合法性
3. `boardStore.movePiece()` / `revealPiece()` 更新棋盘状态
4. Canvas 渲染循环 (`gameLoop`) 每帧绘制
5. 动画通过 animator 独立运行，`phase === 'animating'` 时禁用输入

### 暗棋 vs 明棋

`piece.faceUp` 决定走法：`false` → 只能向前一格（暗棋规则），`true` → 标准象棋走法。
翻开区域：红方 row 0-4，黑方 row 5-9。

## 项目结构

```
src/
├── main.ts, App.vue, style.css    # 入口
├── types/index.ts                 # Piece, PieceType, Color, Position, BoardGrid
├── engine/                        # 规则引擎（纯函数）
│   ├── constants.ts               # 初始布局、暗区判断
│   ├── moveValidator.ts           # 暗棋 + 7 种标准棋子走法
│   ├── checkDetector.ts           # 将军/将死/困毙
│   └── index.ts
├── stores/
│   ├── boardStore.ts              # 棋盘状态 CRUD
│   └── gameStore.ts               # 回合/选中/胜负/认输
├── renderer/
│   ├── BoardRenderer.ts           # 网格、楚河汉界、九宫
│   ├── PieceRenderer.ts           # 暗棋/红明棋/黑明棋
│   └── EffectRenderer.ts          # 高亮、选中光晕、将军脉冲
├── animation/
│   ├── FlipAnimator.ts            # 翻棋 scaleX
│   ├── MoveAnimator.ts            # 移动 ease-out
│   └── CaptureAnimator.ts         # 吃子缩放消失
├── utils/coordinates.ts           # pixelToBoard / boardToPixel
└── components/
    ├── GameLayout.vue             # 布局容器
    ├── ChessBoard.vue             # Canvas 棋盘（核心）
    ├── SidePanel.vue, TurnIndicator.vue, GameControls.vue, WinDialog.vue
```
