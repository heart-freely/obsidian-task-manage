
---

## 2. `.cline/skills/code/views/tree-task-view.md`

```markdown
---
name: 任务树视图开发
description: 开发父子任务树视图，展示层级关系
skill-version: 3.1
triggers:
  - 修改任务树视图
  - 调整父子关系构建
---

# 任务树视图 Skill

## 文件 <!-- @sync -->
`src/panel/views/tree-task-view.js`

## 导出 <!-- @sync -->
- `TreeTaskView`
- `VIEW_TYPE_TREE`

## 关联文件 <!-- @sync -->
- 源码：`src/panel/views/tree-task-view.js`
- Skill：`.cline/skills/code/views/tree-task-view.md`

## 功能 <!-- @manual -->
- 基于文件 YAML 父任务字段和 Wiki 链接构建多级任务树
- 支持折叠/展开、导出大纲
- 排除已完成/已放弃任务的开关

## 实现方式 <!-- @sync -->
- 双源解析父任务：YAML 父任务字段与 Wiki 链接
- 使用 `tree-task-process` 构建树
- 懒加载渲染，性能优化（仅渲染展开节点）

## 核心函数 (@skill-sig) <!-- @sync -->
- `buildTree(tasks: Task[]): TreeNode` - 构建多级任务树
- `renderTree(container: HTMLElement, tree: TreeNode, options: RenderOptions): void` - 递归渲染树节点
- `toggleNode(nodeId: string): void` - 展开/折叠节点
- `exportOutline(): string` - 导出大纲为文本

## DOM 结构 (@skill-dom) <!-- @sync -->
```html
<div class="tree-view">
  <ul class="tree-root">
    <li class="tree-node" data-id="...">
      <div class="tree-node-header">
        <span class="toggle">▶</span>
        <div class="task-card">...</div>
      </div>
      <ul class="tree-children"></ul>
    </li>
  </ul>
</div>

状态模型 (@skill-state) <!-- @sync -->
js

state = {
  tree: TreeNode,
  collapsedNodes: Set<string>,
  hideCompleted: boolean,
  hideCancelled: boolean
}

事件流 (@skill-flow) <!-- @sync -->

    加载数据 → buildTree → 渲染根节点

    点击 toggle → toggleNode → 切换 collapsedNodes → 重新渲染子树

    筛选开关 → 更新 hideCompleted/hideCancelled → 过滤任务 → 重新构建树 → 全量渲染

数据流伪代码 <!-- @sync -->
text

tasks = getAllTasks(dv, state)
过滤 tasks（排除已完成/放弃）
解析父子关系（YAML parent / wiki 链接）
构建树结构（递归）
渐进渲染（使用 DocumentFragment）
绑定折叠事件

关键算法复杂度 (@skill-algorithm) <!-- @sync -->

    树构建：O(n)

    渲染：O(visibleNodes)

    折叠/展开：O(k)（k 为子树大小）

公共调用 (@skill-api) <!-- @sync -->

    readTasks.getAllTasks(dv, state)

    treeTaskProcess.buildTree(tasks)

关键条件 (@skill-condition) <!-- @sync -->

    孤立节点（无父任务）自动成为根节点

    循环引用检测：父任务不能是自身的后代，否则忽略

依赖 <!-- @sync -->

    readTasks.getAllTasks

    tree-task-process

错误处理 <!-- @sync -->

    循环引用时跳过该父子关系并记录警告。

    导出大纲时若任务无标题，使用无标题占位符。

测试要点 <!-- @manual -->

    验证 YAML 父任务和 Wiki 链接混合使用时树结构正确。

    验证折叠/展开状态在刷新后恢复。

修改指南 <!-- @auto-record -->

    2026-05-06: 初始版本（基于 v3.1 格式规范化）