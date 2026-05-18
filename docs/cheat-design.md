# 作弊系统设计文档

## 概述

揭棋风云的 VIP 作弊系统允许 VIP 用户在开局前预设暗棋的实际类型。系统通过**补偿式替换算法**保证作弊后总体棋子计数与初始池一致，防止出现类型超额或缺失。

## 架构原则

- **服务端权威**：所有作弊意图由客户端提交，服务端验证并施行，客户端仅展示服务端认可的作弊结果
- **补偿保证**：作弊不会导致某种类型棋子超过理论上限（车×2、马×2、象×2、仕×2、炮×2、兵×5）
- **同色隔离**：红色作弊的补偿仅在红色棋子内完成，不影响黑色棋子分布
- **将/帅保护**：将和帅永不受作弊影响

## 核心算法

### 流程

```
客户端提交 cheatMap (pieceId → PieceType)
        ↓
服务端 generateRandomLayout() 生成基线布局
        ↓
applyCheatsToLayout() 应用作弊 + 补偿
        ↓
  成功 → 返回修改后的 pieces → 双方收到 game_started
  失败 → 返回 null → 回退到未作弊基线布局
```

### 补偿算法 (applyCheatsToLayout)

1. **深拷贝**：操作在副本上进行，失败时原数组不受影响
2. **模拟计数**：计算作弊后的目标分布（targetCounts）
3. **计算差值**：targetCounts 与池期望值（desiredCounts）的差值
4. **贪心补偿**：对每个超出池容量的类型（excess type），将未作弊的该类型棋子逐一重新分配为不足的类型
5. **失败处理**：若无足够未作弊棋子可供补偿，返回 null，整个作弊集被拒绝

### 示例

假设红色池有 2 个车，用户作弊 2 个兵→车：
- 目标状态：车 4 个（+2），兵 3 个（-2）
- 差值：车 +2，兵 -2
- 补偿：将未作弊的 2 个车重新分配为兵
- 结果：车 2 个（作弊的 2 个），兵 5 个（补偿的 2 个 + 原未作弊的 3 个）

## 数据结构

### ServerGame.allocatedCounts

```typescript
allocatedCounts: Record<Color, Record<PieceType, number>>
```

按颜色维护每种类型已分配的总数，在以下时机更新：

| 时机 | 操作 |
|------|------|
| `createGame()` | 根据 `generateRandomLayoutWithCheats()` 结果初始化 |
| `processMove()` 作弊应用 | 旧类型 -1，新类型 +1 |
| `processMove()` 吃子 | 被吃棋子类型 -1 |

### canCheatType() 校验

优先使用 `allocatedCounts` 进行 O(1) 查询，fallback 到遍历 pieces（向后兼容）。校验逻辑：排除被修改棋子自身后，同类已分配数量 < 类型上限。

## 消息协议

### 开局带作弊

```
C→S: { type: 'start_game', cheatMap: { [pieceId]: PieceType } }
S→C: { type: 'game_started', ..., cheats: [{ id, type }] }
```

- `cheatMap` 仅当房主为 VIP 时生效
- `cheats` 返回服务端实际接受的作弊列表（仅包含成功应用的条目）

### 走子时动态申请

```
C→S: { type: 'move', ..., cheatedType: PieceType }
S→C: { type: 'move_accepted', ... } 或 { type: 'move_rejected', reason: '该类型棋子已达到上限' }
```

- `canCheatType()` 在走法验证前执行，失败则快速拒绝

## 客户端状态

### cheatStore

| 字段 | 用途 | 生命周期 |
|------|------|---------|
| `pendingCheats` | 开局前用户预设的作弊意图 | 清空于 `acceptServerCheats()` |
| `approvedPieceIds` | 服务端确认的作弊棋子 ID | 填充于 `game_started` 处理器 |

### 渲染

`PieceRenderer` 对 `pendingCheats ∪ approvedPieceIds` 中的暗棋绘制紫色光环，用于视觉区分。

## 限制与边界

- 每色每种类型最多按其池中数量（车/马/象/仕/炮各 2，兵 5）
- 补偿要求存在足够数量的未作弊棋子可被重新分配，否则整个作弊集被拒绝
- 快速匹配不支持开局作弊（仅走子时动态申请）
- 作弊不影响翻棋规则——作弊后的类型决定了翻棋后使用的走法规则

## 回滚方法

若需禁用开局作弊功能：
1. 在 `ws.ts` 的 `handleStartGame` 中移除 `rawCheatMap` 参数和解析逻辑
2. 在 `lobbyStore.ts` 的 `startGame()` 中移除 `cheatObj` 构建
3. `generateRandomLayoutWithCheats` 可在无 cheatMap 时正常工作
