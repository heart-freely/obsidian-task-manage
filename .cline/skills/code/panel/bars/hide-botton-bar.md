# 隐藏按钮栏

## 文件位置

`src/panel/bars/hide-botton-bar.js`

## 功能概述

提供任务视图的显隐控制按钮，用于切换日历视图、图表视图、甘特图、文件夹分组、已过期任务隐藏、未到期任务隐藏等视觉元素的显示状态。

## 依赖

- 无

## 调用方

- `panel.js` - 各视图初始化时调用 `buildHidePanel`

## 导出 API

### `buildHidePanel(container, dv, state)`

- **类型**: `HTMLElement`
- **描述**: 构建显隐控制面板，包含 6 个切换按钮
- **参数**:
    - `container: HTMLElement` - 父容器
    - `dv: Object` - Dataview 实例
    - `state: Object` - 全局状态对象

### `buildHideButtons(container, dv, state)`

- **类型**: `HTMLElement`
- **描述**: `buildHidePanel` 的别名导出

## 状态字段

| 字段                            | 类型    | 说明                              |
| ------------------------------- | ------- | --------------------------------- |
| `state.hideCalendar`            | boolean | 是否隐藏日历视图                  |
| `state.hideChart`               | boolean | 是否隐藏图表视图                  |
| `state.hideGantt`               | boolean | 是否隐藏甘特图视图                |
| `state.hideFileTree`            | boolean | 是否隐藏文件树视图                |
| `state.hideOverdueTasks`        | boolean | 是否隐藏已过期任务                |
| `state.hideNotDueTasks`         | boolean | 是否隐藏未到期任务                |
| `state.filterCache.fingerprint` | string  | 显隐变化后需清空（仅过期/未到期） |

## DOM 结构

```
.hide-row (容器 display:flex gap:12px)
button.quick-btn / button.quick-btn-active
  ├── 📅 隐藏日历 / 📅 显示日历
  ├── 📊 隐藏图表 / 📊 显示图表
  ├── 📈 隐藏甘特图 / 📈 显示甘特图
  ├── 📁 隐藏文件树 / 📁 显示文件树
  ├── ⏰ 隐藏过期 / ⏰ 显示过期
  └── 📆 隐藏未到期 / 📆 显示未到期
```

## 执行流程

```
buildHidePanel(container, dv, state)
创建 hideRow → 创建 6 个按钮，根据 state 初始化文本和激活样式
→ 每个按钮绑定 onclick 切换对应 state 属性
→ 同时切换按钮文本（显示/隐藏）和 active 样式
→ 过期/未到期按钮额外清空 filterCache.fingerprint
```

## 技术条件

| 条件                       | 说明                                                              |
| -------------------------- | ----------------------------------------------------------------- |
| **按钮文本联动**           | `state.hideXxx=true` → "显示Xxx"，`false` → "隐藏Xxx"             |
| **quick-btn-active 类**    | `!state.hideXxx` 时添加（显示状态）                               |
| **缓存清空（筛选相关）**   | 过期和未到期 toggle 影响筛选结果 → 清空 `filterCache.fingerprint` |
| **缓存不清空（显隐相关）** | 日历/图表/甘特图/文件树 toggle 仅影响显隐 → 不清空缓存            |
