---
name: 任务依赖视图开发
description: 展示任务间的阻塞与被阻塞关系，支持循环依赖检测
skill-version: 4.0
triggers:
  - 修改依赖视图
  - 调整依赖解析规则
---

# 任务依赖视图 Skill

## 文件 <!-- @sync -->
`src/panel/views/depends-task-view.js`

## 导出 <!-- @sync -->
- `DependsTaskView`
- `VIEW_TYPE_DEPENDS`

## 关联文件 <!-- @sync -->
- 源码：`src/panel/views/depends-task-view.js`
- Skill：`.cline/skills/code/views/depends-task-view.md`

## 功能 <!-- @manual -->
- 解析任务 ID 和依赖标记，构建依赖图
- 显示阻塞当前任务和被当前任务阻塞的任务列表
- 点击跳转源任务
- 检测循环依赖并警告

## 实现方式 <!-- @sync -->
- 提取 `task.id` 和 `task.dependsOn`
- 构建 `Map<id, Task>` 和 `Map<id, Set<id>>`（A 阻塞 B）
- 双向渲染

## 核心函数 (@skill-sig) <!-- @sync -->
- `buildDependencyGraph(tasks): { nodes, edges }`
- `detectCycles(nodes, edges): string[]`
- `renderBlockerList(taskId, graph, container): void`
- `renderBlockedList(taskId, graph, container): void`

## DOM 结构 <!-- @sync -->
```html
<div class="depends-view">
  <div class="task-selector"><select id="task-select"></select></div>
  <div class="dependency-panels">
    <div class="blocked-by-panel"><h3>⛔ 阻塞当前任务</h3><ul class="task-list"></ul></div>
    <div class="blocks-panel"><h3>🔗 当前任务阻塞</h3><ul class="task-list"></ul></div>
  </div>
  <div class="cycle-warning"></div>
</div>
```

## 状态模型 <!-- @sync -->

```
{ allTasks, graph, selectedTaskId, cycles }
```

## 事件流 <!-- @sync -->

- 加载 → 构建图 → 检测循环 → 填充下拉
- 选择任务 → 渲染阻塞/被阻塞列表

## 关键算法复杂度 <!-- @sync -->

图构建 O(n+e)，循环检测 DFS O(n+e)

## 公共调用 <!-- @sync -->

- `readTasks.getAllTasks` (`.cline/skills/code/tasks/read-tasks.md`)

## 关键条件 <!-- @sync -->

- 任务必须有 id 才能被引用
- 循环依赖高亮警告

## 依赖 <!-- @sync -->

- `BaseTaskView` (`.cline/skills/code/views/base-task-view.md`)

## 错误处理 <!-- @sync -->

- 依赖指向不存在的 ID 时忽略并警告

## 测试要点 <!-- @manual -->

- 验证循环依赖检测正确

## 修改指南 <!-- @auto-record -->

- 2026-05-07: v4.0 初始化
