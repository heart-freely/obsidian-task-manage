---
name: 甘特图视图开发
description: 左侧任务树 + 右侧时间轴，支持虚拟滚动、依赖箭头
skill-version: 4.0
triggers:
  - 修改甘特图交互逻辑
  - 添加依赖箭头绘制
  - 优化虚拟滚动性能
---

# 甘特图视图 Skill

## 文件 <!-- @sync -->
`src/panel/views/gantt-task-view.js`

## 导出 <!-- @sync -->
- `GanttTaskView`
- `VIEW_TYPE_GANTT`

## 关联文件 <!-- @sync -->
- 源码：`src/panel/views/gantt-task-view.js`
- Skill：`.cline/skills/code/views/gantt-task-view.md`

## 功能 <!-- @manual -->
- 左侧可折叠任务树，右侧 Canvas 时间轴
- 任务条长度对应时间范围
- 依赖箭头
- 虚拟滚动、缩放、拖拽、悬停高亮
- 筛选循环/完成/取消

## 实现方式 <!-- @sync -->
- 纯 Canvas 三层渲染
- 任务树构建：`tree-task-process`
- 任务条使用 Path2D 缓存
- 依赖箭头折线去重

## 核心函数 (@skill-sig) <!-- @sync -->
- `buildTree(tasks): TreeNode`
- `renderLoop(): void`
- `drawBackground(ctx, dateRange): void`
- `drawTasks(ctx, visibleNodes): void`
- `drawDependencies(ctx, visibleNodes): void`
- `getVisibleRange(scrollY, rowHeight): { startIndex, endIndex }`

## DOM 结构 <!-- @sync -->
```html
<div class="gantt-container">
  <div class="gantt-left-tree"></div>
  <div class="gantt-right-canvas"><canvas id="gantt-canvas"></canvas></div>
  <div class="gantt-tooltip"></div>
</div>
```

## 状态模型 <!-- @sync -->

```
{ tasks, tree, scrollX, scrollY, zoom, collapsedNodes, hideRecurring, hideCompleted, hideCancelled, intersectMode }
```

## 事件流 <!-- @sync -->

- 加载 → 建树 → 初始绘制
- 滚动/缩放 → RAF 重绘可视区
- 悬停 → 绘制高亮 + 工具提示
- 折叠/筛选 → 重建树 → 重绘

## 关键算法复杂度 <!-- @sync -->

树构建 O(n)，任务条绘制 O(visibleCount)，箭头绘制 O(d)

## 公共调用 <!-- @sync -->

- `readTasks.getAllTasks`
- `tree-task-process`
- `DateUtils`

## 依赖 <!-- @sync -->

- Canvas API
- `BaseTaskView`

## 错误处理 <!-- @sync -->

- 空任务显示提示

## 测试要点 <!-- @manual -->

- 验证虚拟滚动流畅度
- 验证依赖箭头去重

## 修改指南 <!-- @auto-record -->

- 2026-05-07: v4.0 初始化
