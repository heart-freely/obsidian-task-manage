---
name: 任务树视图开发
description: 多级任务树，支持折叠/展开、导出大纲
skill-version: 4.0
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
- 基于 YAML 父任务和 Wiki 链接构建树
- 折叠/展开、导出大纲
- 排除已完成/已放弃任务

## 实现方式 <!-- @sync -->
- 双源解析父子关系
- `tree-task-process` 构建树
- 懒加载渲染

## 核心函数 (@skill-sig) <!-- @sync -->
- `buildTree(tasks): TreeNode`
- `renderTree(container, tree, options): void`
- `toggleNode(nodeId): void`
- `exportOutline(): string`

## DOM 结构 <!-- @sync -->
```html
<div class="tree-view">
  <ul class="tree-root">
    <li class="tree-node"><div class="tree-node-header"><span class="toggle">▶</span><div class="task-card"></div></div><ul class="tree-children"></ul></li>
  </ul>
</div>
```

## 状态模型 <!-- @sync -->

```
{ tree, collapsedNodes, hideCompleted, hideCancelled }
```

## 事件流 <!-- @sync -->

- 加载 → 建树 → 渲染根节点
- 点击 toggle → 切换折叠 → 重新渲染子树

## 关键算法复杂度 <!-- @sync -->

树构建 O(n)，渲染 O(visibleNodes)

## 公共调用 <!-- @sync -->

- `readTasks.getAllTasks`
- `tree-task-process`

## 依赖 <!-- @sync -->

- `BaseTaskView`

## 错误处理 <!-- @sync -->

- 循环引用忽略并警告

## 测试要点 <!-- @manual -->

- 验证混合父子关系构建正确

## 修改指南 <!-- @auto-record -->

- 2026-05-07: v4.0 初始化
