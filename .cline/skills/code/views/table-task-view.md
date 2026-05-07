- 

- ---

  ## 17. `table-task-view.md`（所有任务表视图）

  ```markdown
  ---
  name: 所有任务表视图开发
  description: 表格化展示所有任务，支持三级分组和折叠
  skill-version: 4.0
  triggers:
    - 修改任务表视图
    - 添加新列或分组维度
  ---
  
  # 所有任务表视图 Skill
  
  ## 文件 <!-- @sync -->
  `src/panel/views/table-task-view.js`
  
  ## 导出 <!-- @sync -->
  - `TableTaskView`
  - `VIEW_TYPE_TABLE`
  
  ## 关联文件 <!-- @sync -->
  - 源码：`src/panel/views/table-task-view.js`
  - Skill：`.cline/skills/code/views/table-task-view.md`
  
  ## 功能 <!-- @manual -->
  - 展示所有任务，三级分组：状态 → 计划日期 → 优先级
  - 分组可折叠
  
  ## 实现方式 <!-- @sync -->
  - 递归分组，嵌套渲染
  
  ## 核心函数 (@skill-sig) <!-- @sync -->
  - `groupByStatusScheduledPriority(tasks): GroupNode`
  - `renderGroup(group, container, level): void`
  - `toggleGroup(groupId): void`
  
  ## DOM 结构 <!-- @sync -->
  ```html
  <div class="table-view">
    <div class="table-header">...</div>
    <div class="table-body">
      <div class="group-row"><span class="toggle">▶</span>状态: 未开始 <span class="count">3</span></div>
      <div class="group-children collapsed">...</div>
    </div>
  </div>

## 状态模型 <!-- @sync -->

```
{ groupedData, collapsedGroups }
```

## 事件流 <!-- @sync -->

加载 → 分组 → 渲染 → 点击 toggle 折叠

## 关键算法复杂度 <!-- @sync -->

分组 O(n)，渲染 O(n)，折叠 DOM 操作

## 公共调用 <!-- @sync -->

- `readTasks.getAllTasks`

## 依赖 <!-- @sync -->

- `BaseTaskView`

## 错误处理 <!-- @sync -->

- 无任务显示占位符

## 测试要点 <!-- @manual -->

- 验证分组顺序正确

## 修改指南 <!-- @auto-record -->

- 2026-05-07: v4.0 初始化
