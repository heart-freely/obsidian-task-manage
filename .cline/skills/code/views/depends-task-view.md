---
name: 任务依赖视图开发
description: 开发或修改依赖关系视图，展示任务间的阻塞与被阻塞关系
skill-version: 3.1
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
- 解析任务中的 ID 标记（🆔）和依赖标记（⛔），构建依赖图
- 显示阻塞其他任务和被阻塞的任务列表
- 点击跳转源任务

## 实现方式 <!-- @sync -->
- 获取所有任务，解析自定义标记 `task.id` 和 `task.dependsOn`
- 构建 idMap，遍历 dependsOn 建立依赖关系（阻塞者 → 被阻塞者）
- 渲染双向列表：阻塞者列表（当前任务阻塞了谁）、被阻塞者列表（谁阻塞了当前任务）

## 核心函数 (@skill-sig) <!-- @sync -->
- `buildDependencyGraph(tasks: Task[]): { nodes: Map<string, Task>, edges: Map<string, Set<string>> }` - 构建依赖图（edges 表示 A 阻塞 B）
- `detectCycles(nodes: Map, edges: Map): string[]` - 检测循环依赖，返回包含循环的 ID 列表
- `renderBlockerList(taskId: string, graph: Graph, container: HTMLElement): void` - 渲染阻塞当前任务的任务列表
- `renderBlockedList(taskId: string, graph: Graph, container: HTMLElement): void` - 渲染被当前任务阻塞的任务列表

## DOM 结构 (@skill-dom) <!-- @sync -->
```html
<div class="depends-view">
  <div class="task-selector">
    <label>选择任务：</label>
    <select id="task-select"></select>
  </div>
  <div class="dependency-panels">
    <div class="blocked-by-panel">
      <h3>⛔ 阻塞当前任务</h3>
      <ul class="task-list"></ul>
    </div>
    <div class="blocks-panel">
      <h3>🔗 当前任务阻塞</h3>
      <ul class="task-list"></ul>
    </div>
  </div>
  <div class="cycle-warning" style="display:none">⚠️ 检测到循环依赖</div>
</div>

状态模型 (@skill-state) <!-- @sync -->
js

state = {
  allTasks: Task[],
  graph: { nodes, edges },
  selectedTaskId: string | null,
  cycles: string[]
}

事件流 (@skill-flow) <!-- @sync -->

    加载数据 → buildDependencyGraph → detectCycles → 填充下拉选择器

    选择任务 → 渲染阻塞者列表和被阻塞者列表

    点击任务项 → 跳转至源文件

数据流伪代码 <!-- @sync -->
text

tasks = getAllTasks(dv, state)
nodes, edges = buildDependencyGraph(tasks)
cycles = detectCycles(nodes, edges)
填充下拉选项（所有有 id 的任务）
当选中任务：find blockers（edges 中 target 为该任务的源任务）和 blocked（edges 中 source 为该任务的目标）
分别渲染两个列表（使用 createTaskCard 或简化的链接）
若有循环依赖，显示警告栏

关键算法复杂度 (@skill-algorithm) <!-- @sync -->

    图构建：O(n + e)，e 为依赖关系数

    循环检测：DFS O(n + e)

公共调用 (@skill-api) <!-- @sync -->

    readTasks.getAllTasks(dv, state)

    createTaskCard（可选，用于列表渲染）

关键条件 (@skill-condition) <!-- @sync -->

    任务必须有 task.id 才能被引用，否则忽略依赖。

    循环依赖检测后高亮显示相关任务，但不自动修复。

依赖 <!-- @sync -->

    readTasks.getAllTasks

    BaseTaskView

错误处理 <!-- @sync -->

    依赖指向不存在的 ID 时，记录警告并忽略该依赖。

    无依赖关系或任务无 ID 时，显示“无依赖任务”占位符。

测试要点 <!-- @manual -->

    验证循环依赖能正确检测并警告。

    验证依赖链在多次选择任务后正确更新。

修改指南 <!-- @auto-record -->

    2026-05-06: 初始版本（基于 v3.1 格式规范化）