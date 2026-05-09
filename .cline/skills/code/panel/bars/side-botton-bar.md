# side-botton-bar.js - 侧边视图切换面板

## 基本信息

- **文件路径**: `src/panel/bars/side-botton-bar.js`
- **所属模块**: bars（面板按钮栏）
- **功能**: 提供侧边视图切换功能，支持列表/卡片/表格/树形/时间线五种视图模式切换

## API 接口

### 全局状态

| 状态字段             | 类型       | 说明                                                          |
| -------------------- | ---------- | ------------------------------------------------------------- |
| `state.sideViewType` | `string`   | 当前侧边视图类型：`list`\|`grid`\|`table`\|`tree`\|`timeline` |
| `state.onViewChange` | `Function` | 视图变更回调函数                                              |

### 回调函数

| 回调                 | 参数            | 说明                           |
| -------------------- | --------------- | ------------------------------ |
| `state.onViewChange` | `type` (string) | 视图切换后触发，传入新视图类型 |

## 函数说明

### `buildSideButtonBar(container, dv, state)`

构建侧边视图切换面板，渲染视图切换按钮并绑定事件。

**参数**:

- `container` (HTMLElement): 父容器
- `dv` (Object): Dataview 实例
- `state` (Object): 全局状态对象（需包含 `sideViewType` 和可选的 `onViewChange`）

**返回值**: `HTMLElement` - 创建的侧边按钮栏容器元素

---

### `buildViewSwitcher(container, dv, state)`

`buildSideButtonBar` 的别名导出，提供更具语义化的函数名。

**参数**:

- `container` (HTMLElement): 父容器
- `dv` (Object): Dataview 实例
- `state` (Object): 全局状态对象

**返回值**: `HTMLElement` - 创建的侧边按钮栏容器元素

## DOM 结构

```
.side-row (容器 display:flex padding:12px 0 8px 0 gap:8px flex-wrap:wrap)
├── button.side-btn  📋 列表
├── button.side-btn  🔲 卡片
├── button.side-btn  📊 表格
├── button.side-btn  🌳 树形
└── button.side-btn  📅 时间线
```

## 交互流程

```
buildSideButtonBar(container, dv, state)
  │
  ├── 创建 sideRow 容器 (div)
  │
  ├── 定义 views 数组
  │   └── { type, label, title } 配置
  │
  ├── 遍历创建按钮
  │   └── 当前 view === state.sideViewType → 加 side-btn-active 类
  │
  ├── 点击按钮事件
  │   ├── state.sideViewType = view.type
  │   ├── 所有 .side-btn 移除 side-btn-active
  │   ├── 当前按钮添加 side-btn-active
  │   └── 若 state.onViewChange 存在 → 回调(view.type)
  │
  └── 将 sideRow 追加到 container
```

## 可用视图类型

| 类型       | 标签      | 说明       |
| ---------- | --------- | ---------- |
| `list`     | 📋 列表   | 列表视图   |
| `grid`     | 🔲 卡片   | 卡片视图   |
| `table`    | 📊 表格   | 表格视图   |
| `tree`     | 🌳 树形   | 树形视图   |
| `timeline` | 📅 时间线 | 时间线视图 |

## 条件逻辑

| 条件                               | 行为                                        |
| ---------------------------------- | ------------------------------------------- |
| `state.sideViewType === view.type` | 该按钮添加 `side-btn-active` 类（默认高亮） |
| 点击切换后                         | 清除所有其他按钮的 `side-btn-active` 类     |
| `state.onViewChange` 存在          | 切换后触发回调，传入新 `view.type`          |
