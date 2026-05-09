# quick-botton-bar.js - 快速日期筛选面板

## 基本信息

- **文件路径**: `src/panel/bars/quick-botton-bar.js`
- **所属模块**: bars（面板按钮栏）
- **功能**: 提供常用日期范围的快速筛选按钮（今天、昨天、本周、本月等），以及上周/下周、上月/下月的快捷切换。支持从缓存状态恢复按钮高亮

## API 接口

### 外部依赖

| 依赖模块            | 具体内容                    | 用途               |
| ------------------- | --------------------------- | ------------------ |
| `common-process.js` | `DateUtils.getDayRange()`   | 获取某天的日期范围 |
| `common-process.js` | `DateUtils.getWeekRange()`  | 获取某周的日期范围 |
| `common-process.js` | `DateUtils.getMonthRange()` | 获取某月的日期范围 |

### 全局状态

| 状态字段                        | 类型            | 说明                                 |
| ------------------------------- | --------------- | ------------------------------------ |
| `state.quickBtns`               | `HTMLElement[]` | 当前面板所有快速按钮的引用数组       |
| `state.activeQuickBtn`          | `string\|null`  | 当前高亮的按钮文本（如 "今天"）      |
| `state.dateState.selections`    | `Object`        | 日期选择器状态（年/季/月/周/周日）   |
| `state.dateFilterState`         | `Object`        | 日期筛选条件 `{ isAll, start, end }` |
| `state.filterCache.fingerprint` | `string`        | 筛选缓存指纹，切换后清空             |

### 回调函数

| 回调                | 参数 | 说明                     |
| ------------------- | ---- | ------------------------ |
| `callbacks.onQuery` | 无   | 点击"执行查询"按钮时调用 |

## 函数说明

### `clearQuickHighlights(state)`

清除所有快速日期按钮的高亮样式。

**参数**:

- `state` (Object): 全局状态对象（需包含 `quickBtns` 数组）

**返回值**: void

---

### `resetQuickDateUI(state)`

重置快速日期 UI（清除高亮状态）。

**参数**:

- `state` (Object): 全局状态对象

**返回值**: void

---

### `restoreQuickButton(state, label)`

从缓存状态恢复某个快速按钮的高亮样式。

**参数**:

- `state` (Object): 全局状态对象（需包含 `quickBtns` 数组）
- `label` (string): 要恢复高亮的按钮文本（如 "今天"、"本周"）

**返回值**: void

---

### `buildQuickDatePanel(container, dv, state, callbacks)`

构建快速日期筛选面板，渲染按钮并绑定事件。

**参数**:

- `container` (HTMLElement): 父容器
- `dv` (Object): Dataview 实例
- `state` (Object): 全局状态对象
- `callbacks` (Object, optional): 可选的回调函数集合，包含 `onQuery`
- `callbacks.onQuery` (Function, optional): 执行查询回调

**返回值**: void（直接修改 container 内容）

## DOM 结构

```
.quick-bar (容器 display:flex flex-wrap:wrap gap:8px)
├── button.quick-btn          今天
├── button.quick-btn          昨天
├── button.quick-btn          明天
├── button.quick-btn          本周
├── button.quick-btn          上周
├── button.quick-btn          下周
├── button.quick-btn          本月
├── button.quick-btn          上月
├── button.quick-btn          下月
├── button.quick-btn          所有任务
└── button.quick-btn          执行查询 🔍 (margin-left:auto)
```

## 交互流程

```
buildQuickDatePanel(container, dv, state, callbacks)
  │
  ├── 定义 quickDefs 按钮配置数组
  │   └── { label: "今天", range: getDayRange(new Date()) }
  │
  ├── 遍历创建按钮
  │   └── 本周/本月附近附加邻近按钮（上周/下周/上月/下月）
  │
  ├── 追加"执行查询"按钮
  │
  └── 若 state.activeQuickBtn 非空 → restoreQuickButton
```

### 点击按钮事件流

```
用户点击按钮
  │
  ├── clearQuickHighlights(state) → 所有按钮移除 active 类
  ├── 当前按钮添加 quick-btn-active 类
  ├── state.activeQuickBtn = def.label
  ├── 重置 dateState.selections 对象
  ├── 设置 dateFilterState 范围
  │   ├── label="所有任务" → isAll=true, start/end=null
  │   └── 其他 → isAll=false, 计算日期范围
  └── 清空 filterCache.fingerprint
```

## 条件逻辑

| 条件                        | 行为                                           |
| --------------------------- | ---------------------------------------------- |
| 按钮 label="所有任务"       | `dateFilterState.isAll=true`, `start/end=null` |
| 点击上周/下周               | 当前日期 ±7 天后再计算周范围                   |
| 点击上月/下月               | 当前月份 ±1 个月后再计算月范围                 |
| `state.activeQuickBtn` 残留 | 面板重建后自动恢复该按钮高亮                   |
