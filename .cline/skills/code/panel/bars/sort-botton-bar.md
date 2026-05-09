# sort-botton-bar.js - 排序控制面板

## 基本信息

- **文件路径**: `src/panel/bars/sort-botton-bar.js`
- **所属模块**: bars（面板按钮栏）
- **功能**: 提供排序控制功能，支持按优先级、截止日期、创建时间、完成时间、状态、字母序等字段排序，并支持升降序切换

## API 接口

### 全局状态

| 状态字段                        | 类型              | 说明                                                                              |
| ------------------------------- | ----------------- | --------------------------------------------------------------------------------- |
| `state.sortField`               | `string`          | 当前排序字段: `priority`\|`due`\|`created`\|`completed`\|`status`\|`alphabetical` |
| `state.sortOrder`               | `"asc"`\|`"desc"` | 排序方向                                                                          |
| `state.filterCache.fingerprint` | `string`          | 筛选缓存指纹，排序切换后清空                                                      |

### 回调函数

| 回调                 | 参数                               | 说明                             |
| -------------------- | ---------------------------------- | -------------------------------- |
| `state.onSortChange` | `field` (string), `order` (string) | 排序变更后触发，传入新字段和方向 |

## 函数说明

### `buildSortPanel(container, dv, state)`

构建排序控制面板，渲染按钮并绑定点击事件。

**参数**:

- `container` (HTMLElement): 父容器
- `dv` (Object): Dataview 实例
- `state` (Object): 全局状态对象（需包含 `sortField`, `sortOrder` 等）

**返回值**: `HTMLElement` - 排序面板 DOM 元素

---

### `buildSortRow(container, dv, state)`

`buildSortPanel` 的别名导出，兼容 `panel.js` 中的导入方式。

**参数**:

- `container` (HTMLElement): 父容器
- `dv` (Object): Dataview 实例
- `state` (Object): 全局状态对象

**返回值**: `HTMLElement` - 排序面板 DOM 元素

## DOM 结构

```
.sort-row (容器 display:flex padding:12px 0 8px 0 gap:8px flex-wrap:wrap)
├── button.sort-btn / .sort-btn-active  🔥 优先级 ↓
├── button.sort-btn / .sort-btn-active  📅 截止日期 ↓
├── button.sort-btn / .sort-btn-active  📝 创建时间
├── button.sort-btn / .sort-btn-active  ✅ 完成时间
├── button.sort-btn / .sort-btn-active  📌 状态
└── button.sort-btn / .sort-btn-active  🔤 字母序
```

## 交互流程

```
buildSortPanel(container, dv, state)
  │
  ├── 初始化排序状态（未设置时默认 priority/desc）
  │
  ├── 定义 sortFields 数组
  │   └── { field, label } 配置
  │
  ├── 遍历创建按钮
  │   └── 当前活跃字段显示 ↑ 或 ↓
  │
  └── 点击按钮事件
      │
      ├── 点击同一字段 → 切换 sortOrder (asc↔desc)
      ├── 点击不同字段 → 设为新字段，sortOrder 重置为 desc
      ├── 更新按钮样式和文本（显示排序方向 ↑/↓）
      ├── 清空 filterCache.fingerprint
      └── 若 state.onSortChange 存在 → 回调(field, order)
```

## 可用排序字段

| 字段           | 标签        | 说明             |
| -------------- | ----------- | ---------------- |
| `priority`     | 🔥 优先级   | 按任务优先级排序 |
| `due`          | 📅 截止日期 | 按截止日期排序   |
| `created`      | 📝 创建时间 | 按创建时间排序   |
| `completed`    | ✅ 完成时间 | 按完成时间排序   |
| `status`       | 📌 状态     | 按任务状态排序   |
| `alphabetical` | 🔤 字母序   | 按字母顺序排序   |

## 条件逻辑

| 条件                     | 行为                                          |
| ------------------------ | --------------------------------------------- |
| 点击同一字段             | 切换 `sortOrder` (asc↔desc)                   |
| 点击不同字段             | 设为新字段，`sortOrder` 重置为 `desc`         |
| `state.sortField` 未设置 | 默认 `priority`/`desc`                        |
| 排序变更后               | 清空 `filterCache.fingerprint` 使筛选缓存失效 |

## 按钮文本指示器

- 当前活跃且升序: `标签 + " ↑"`
- 当前活跃且降序: `标签 + " ↓"`
- 非活跃: 仅显示标签文本
