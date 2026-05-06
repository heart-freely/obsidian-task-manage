---
name: 甘特图视图开发
description: 任务甘特图，左侧树状任务列表 + 右侧时间轴，展示持续时间和依赖
triggers:
  - 修改甘特图交互逻辑
  - 添加依赖箭头绘制
  - 优化虚拟滚动性能
---

# 甘特图视图 Skill

## 文件
`src/panel/views/gantt-task-view.js`

## 功能
- 左侧任务树：基于文件层级构建可折叠的任务列表，支持排序
- 右侧时间轴：绘制任务条，长度对应时间范围，依赖关系用箭头表示
- 虚拟滚动：仅绘制可视区域内的任务行和任务条
- 交互：Alt+滚轮缩放、拖拽平移、悬停高亮、点击跳转源文件
- 筛选开关：循环/已完成/已取消、交集模式切换、隐藏文件夹

## 实现方式
- 纯 Canvas，分为三层：背景层（网格、日期）、主内容层（任务条、文字）、高亮层（悬停）
- 任务数据由 `readTasks.getAllTasks` 获取，并按树状关系组装（`tree-task-process`）
- 任务条绘制：使用 Path2D 预缓存圆角矩形路径，通过 `translate` + `scale` 复用
- 依赖箭头：从 🆔 任务的结束时间指向 ⛔ 任务的开始时间，折线带圆角，相同坐标去重
- 虚拟滚动：计算滚动偏移，只渲染 `startIndex` 到 `endIndex` 的任务行
- 状态持久化：筛选、折叠、缩放、滚动位置保存于 `ganttState`，刷新后恢复

## 核心函数
- `buildTree(tasks)` → treeNode
- `renderLoop()` → 绘制控制循环
- `drawBackground()` / `drawTasks()` / `drawDependencies()` / `drawHighlight()`
- `getVisibleRange()` → { startIndex, endIndex }

## DOM 结构
```html
<div class="gantt-container">
  <canvas id="gantt-canvas"></canvas>
  <div class="gantt-tooltip"></div>
</div>
```

## 状态模型

```js

ganttState = {
  tasks: [],
  tree: {},
  scrollX: 0,
  scrollY: 0,
  zoom: 1,
  collapsedNodes: Set,
  hideRecurring: true,
  hideCompleted: true,
  hideCancelled: true,
  intersectMode: 'plan-due'
}
```
## 事件流

    加载数据 → 构建树 → 计算时间轴 → 初始绘制

    滚动/缩放 → 更新 scroll/zoom → requestAnimationFrame → 重绘可视区域

    悬停 → 计算悬停任务 ID → 绘制高亮层

    折叠/展开 → 更新 collapsedNodes → 重绘树和任务条

    筛选开关 → 过滤任务 → 重构建树 → 重绘

## 数据流伪代码

    tasks = getAllTasks(dv, state)

    tree = buildTree(tasks)

    应用筛选器：隐藏循环/完成/取消，日期范围过滤

    计算时间轴边界

    获取可视行 [startIndex, endIndex]

    绘制背景网格

    绘制可视行内的任务条（对应树节点）

    绘制依赖箭头

    事件循环监听交互

## 关键算法复杂度

    树构建：O(n)

    筛选：O(n)

    可视行计算：O(1) 根据偏移/行高

    任务条绘制：O(visibleCount)，约 <100 条

    箭头绘制：O(d) 依赖关系数

    使用 requestAnimationFrame 节流重绘

## 公共调用

    readTasks.getAllTasks

    tree-task-process

    DateUtils

## 关键条件

    无日期任务不绘制任务条

    依赖箭头只绘制在可视区域内且不重复

## 依赖

    Canvas API

    readTasks

    tree-task-process

    DateUtils

## 修改指南

    调整任务条外观：修改 drawTasks 中的填充颜色、高度、圆角

    添加新交互：对应的事件监听器，注意节流


