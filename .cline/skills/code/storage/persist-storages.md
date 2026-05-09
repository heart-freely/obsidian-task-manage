# persist-storage.js - 持久化管理与状态创建

## 基本信息

- **文件路径**: `src/storages/persist-storage.js`（实际路径，vault 中以 `storages` 命名）
- **所属模块**: storage（存储）
- **功能**: 提供插件初始状态创建、过滤指纹生成、日期范围获取以及 PersistenceManager 类，负责将插件状态持久化到 Obsidian 存储

## 核心架构

```
createInitialState() → 返回完整的 state 对象
getFilterFingerprint(state) → 拼接指纹字符串
getEffectiveDateRange(state) → 返回日期范围或 null
PersistenceManager
  ├── save(state, collapsedNodes) → 序列化并存储
  └── load(state, collapsedNodes, defaultDateRangeFn?, noticeFn?) → 反序列化并合并
```

## 函数说明

### `createInitialState()`

创建插件的初始状态对象，包含所有面板、过滤、排序、图表等功能的默认值。每次插件初始化或状态重置时调用。

**返回值**: `Object` - 完整的初始状态对象

**初始状态结构**:

```
{
  cachedAllTasks: null,                    // 缓存的所有任务
  filterCache: { fingerprint: "", tasks: null },  // 过滤缓存
  dateTaskMapCache: null,                  // 日期任务映射缓存
  dateFilterState: {                       // 日期过滤状态
    start: null,
    end: null,
    isAll: false,
  },
  markFilterState: {                       // 标记过滤状态
    statuses: [...CONFIG.ALLOWED_STATUSES],  // 默认所有允许的状态
    includeMarks: [],                        // 包含标记
    excludeMarks: [],                        // 排除标记
  },
  hideRepeatTasks: true,                   // 隐藏重复任务
  hideCompletedTasks: true,                // 隐藏已完成任务
  hideCancelledTasks: true,                // 隐藏已取消任务
  hideFolders: true,                       // 隐藏文件夹/树
  showFilters: false,                      // 显示过滤区
  showTree: false,                         // 显示树面板
  leftSort: { type: "status", order: "asc" },  // 左侧排序
  quickBtns: [],                           // 快捷按钮列表
  activeQuickBtn: null,                    // 当前活跃快捷按钮
  dateState: {                             // 级联日期选择状态
    selections: { years: {}, quarters: {}, months: {}, weeks: {}, weekdays: {} },
  },
  yearBtns: [], quarterBtns: [], monthBtns: [], weekBtns: [], weekdayBtns: [],
  collapsedNodes: {},                      // 树折叠节点
  filterRootPath: null,                    // 树根路径过滤
  chartInstances: [],                      // 图表实例列表（必须为数组）
  chartScale: 1,                           // 图表缩放
  leftPanelWidth: 300,                     // 左侧面板宽度
  intervalMode: "scheduled-due",           // 时间间隔模式
  dataViewStatuses: null,                  // 数据视图状态
  taskIdMap: {},                           // 任务 ID 映射
}
```

---

### `getFilterFingerprint(state)`

从当前过滤状态生成唯一指纹字符串，用于判断过滤条件是否发生变化，从而决定是否需要重新执行过滤逻辑。

**参数**:

- `state` (Object): 全局状态对象

**返回值**: `string` - 指纹字符串，由以下字段拼接而成：

- `dateFilterState.start.getTime()` 或 `null`
- `dateFilterState.end.getTime()` 或 `null`
- `dateFilterState.isAll`
- `markFilterState.statuses.join(",")`
- `markFilterState.includeMarks.join(",")`
- `markFilterState.excludeMarks.join(",")`
- `hideRepeatTasks`
- `hideCompletedTasks`
- `hideCancelledTasks`
- `filterRootPath` 或 `""`

---

### `getEffectiveDateRange(state)`

获取生效的日期过滤范围。如果 `isAll` 为 `true` 或起始/结束日期不完整，则返回 `null`。

**参数**:

- `state` (Object): 全局状态对象

**返回值**: `{ start: Date, end: Date } | null` - 日期范围对象或 null

---

### `PersistenceManager` 类

持久化管理器，负责将插件的过滤状态、视图偏好等设置持久化到 Obsidian 存储中，并在插件加载时恢复这些设置。

#### `constructor(storage, scope)`

**参数**:

- `storage` (Object): Obsidian 的 DataAdapter 或 storage 接口（提供 `getItem`/`setItem`）
- `scope` (string): 存储作用域键名，用于区分不同面板或插件的存储数据

#### `async save(state, collapsedNodes)`

持久化当前状态到存储。仅保存用户可配置的视图偏好，不保存运行时临时数据。

**保存的字段**:

- `showFilters`, `showTree` (面板显示开关)
- `hideRepeatTasks`, `hideCompletedTasks`, `hideCancelledTasks`, `hideFolders` (过滤开关)
- `leftSort` (排序偏好)
- `markFilterState` (标记过滤状态)
- `collapsedNodes` (树面板折叠状态)
- `chartScale`, `leftPanelWidth`, `intervalMode` (布局/图表设置)
- `dataViewStatuses` (数据视图状态列表)

**参数**:

- `state` (Object): 全局状态对象
- `collapsedNodes` (Object): 树面板折叠节点映射表

**返回值**: `Promise<void>`

#### `async load(state, collapsedNodes, defaultDateRangeFn?, noticeFn?)`

从存储中恢复之前持久化的状态，合并到当前 state 对象和 collapsedNodes 映射中。

**参数**:

- `state` (Object): 全局状态对象（会被修改，合并已保存的值）
- `collapsedNodes` (Object): 折叠节点映射表（会被修改）
- `defaultDateRangeFn` (Function, optional): 默认日期范围回调（保留参数，暂未使用）
- `noticeFn` (Function, optional): 通知回调，加载失败时调用

**返回值**: `Promise<void>`

## 数据流

```
┌─────────────────────┐
│  createInitialState │  → 返回干净的 state 对象
└──────┬──────────────┘
       │
       ▼
┌─────────────────────┐
│  PersistenceManager │  → load() 从存储恢复用户偏好
│       .load()       │     合并到 state
└──────┬──────────────┘
       │
       ▼
┌─────────────────────┐
│   getFilterFingerprint │  → 生成过滤指纹
└──────┬──────────────┘
       │
       ▼
┌─────────────────────┐
│   getEffectiveDateRange │  → 获取日期范围
└──────┬──────────────┘
       │
       ▼
┌─────────────────────┐
│  PersistenceManager │  → save() 保存用户偏好
│       .save()       │
└─────────────────────┘
```

## 条件逻辑

| 条件                                  | 行为                                  |
| ------------------------------------- | ------------------------------------- |
| `state.dateFilterState.isAll` 为 true | 日期范围无效，返回 `null`             |
| 起始/结束日期不完整                   | 日期范围无效，返回 `null`             |
| 存储中没有数据                        | `load()` 直接返回，不修改 state       |
| JSON 解析失败                         | `load()` 调用 `noticeFn` 提示错误信息 |
| `chartInstances` 不是数组             | 重置为空数组 `[]`                     |

## 关联模块

- **调用方**: `src/panel/panel.js`（使用 `PersistenceManager`、`createInitialState`、`getFilterFingerprint`、`getEffectiveDateRange`）
- **所有 view 模块**: 使用 `state` 对象
- **配置依赖**: `src/configs/plugin-configs`（`CONFIG.ALLOWED_STATUSES`）

## 持久化策略

- **作用域**: 通过 `scope` 参数区分不同面板或功能模块的存储数据
- **格式**: JSON 序列化/反序列化
- **接口**: Obsidian DataAdapter 的 `getItem`/`setItem`
- **保存触发**: 状态变化时自动保存（通过 `refreshCurrentView` 流程）
- **加载触发**: 插件启动时调用 `load()`
- **注意**: 文件实际路径为 `src/storages/persist-storage.js`（vault 中以 `storages` 命名）
