# 控制按钮栏

## 文件位置

`src/panel/bars/control-botton-bar.js`

## 功能概述

提供任务视图的全局控制按钮，包括刷新、间隔模式切换、循环/已完成/已取消任务的显隐控制、文件夹显隐控制、以及重置清除操作。

## 依赖

- `CONFIG` (`plugin-configs.js`) - 间隔模式常量

## 调用方

- `panel.js` - 各视图初始化时调用 `buildControlPanel`

## 导出 API

### `buildControlPanel(container, dv, state, callbacks)`

- **类型**: `HTMLElement`
- **描述**: 构建控制按钮栏 DOM 元素
- **参数**:
    - `container: HTMLElement` - 父容器
    - `dv: Object` - Dataview 实例
    - `state: Object` - 全局状态对象
    - `callbacks: Object` - 回调函数集合
        - `callbacks.onRenderAll: Function` - 重新渲染所有任务
        - `callbacks.onToggleFolders: Function` - 切换文件夹显隐
        - `callbacks.onResetAndClear: Function` - 重置并清除

## 状态字段

| 字段                            | 类型    | 说明                                   |
| ------------------------------- | ------- | -------------------------------------- |
| `state.intervalMode`            | string  | 日期交集模式（计划-截止 / 开始-完成）  |
| `state.hideRepeatTasks`         | boolean | 是否隐藏循环任务                       |
| `state.hideCompletedTasks`      | boolean | 是否隐藏已完成任务                     |
| `state.hideCancelledTasks`      | boolean | 是否隐藏已取消任务                     |
| `state.hideFolders`             | boolean | 是否隐藏文件夹分组                     |
| `state.filterCache.fingerprint` | string  | 筛选缓存指纹，按钮操作后清空触发重渲染 |

## DOM 结构

```
.quick-bar > button.quick-btn / button.quick-btn-active
  ├── 刷新按钮 "🔄 刷新"
  ├── 间隔模式按钮 "⏱️ 计划-截止" | "⏱️ 开始-完成"
  ├── 隐藏循环/已完成/已取消按钮
  ├── 文件夹显隐按钮
  └── 重置清除按钮 "🗑️ 重置并清除"
```

## 执行流程

```
buildControlPanel(container, dv, state, callbacks)
初始渲染 → 根据 state 显示各按钮初始文本和 active 类
点击按钮 → 切换对应 state 字段 → 更新按钮文本/类 → state.filterCache.fingerprint="" → 调对应回调
重置清除 → callbacks.onResetAndClear()
```

## 技术条件

| 条件                    | 说明                                                                   |
| ----------------------- | ---------------------------------------------------------------------- |
| **按钮文本动态切换**    | 按钮显示当前功能（如"隐藏循环"），点击后变为反状态文本（如"显示循环"） |
| **quick-btn-active 类** | 标识当前激活/显示状态                                                  |
| **筛选缓存清空**        | 所有筛选类按钮点击后立即清空 `filterCache.fingerprint` 强制重渲染      |
