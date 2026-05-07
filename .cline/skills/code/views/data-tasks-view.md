---
name: 任务统计分析视图开发
description: 左侧任务树与右侧 ECharts 图表联动，支持下钻、多维度统计
skill-version: 4.0
triggers:
- 修改统计图表类型
- 添加新统计维度
- 实现下钻统计
---

  # 任务统计分析视图 Skill

  ## 文件 <!-- @sync -->
  `src/panel/views/data-tasks-view.js`

  ## 导出 <!-- @sync -->
  - `DataTasksView`
  - `VIEW_TYPE_DATA`

  ## 关联文件 <!-- @sync -->
  - 源码：`src/panel/views/data-tasks-view.js`
  - Skill：`.cline/skills/code/views/data-tasks-view.md`

  ## 功能 <!-- @manual -->
  - 左侧任务树，节点显示进度条
  - 下钻统计：点击树节点只统计子树任务
  - 右侧多维度图表（状态、优先级、周期、日期、依赖、标签）
  - 图表类型切换（饼图/堆叠柱状图）
  - 全局筛选联动

  ## 实现方式 <!-- @sync -->
  - `readTasks.getAllTasks` + 筛选
  - 统计函数 `calcul-chart-process`
  - ECharts 实例复用，`setOption` 更新
  - 子树收集递归

  ## 核心函数 (@skill-sig) <!-- @sync -->
  - `getSubtreeTasks(node, allTasks): Task[]`
  - `calculateStats(tasks): StatsObject`
  - `updateChart(instance, stats, type): void`
  - `buildTree(tasks): TreeNode`
  - `refreshCharts(nodeId): void`

  ## DOM 结构 <!-- @sync -->
  ```html
  <div class="data-analysis-container">
    <div class="analysis-left"><div class="tree-view"></div></div>
    <div class="analysis-right charts-grid">
      <div class="chart-item" id="chart-status"></div>
      <!-- 更多图表 -->
    </div>
  </div>

## 状态模型 <!-- @sync -->

  ```
{ allTasks, tree, currentTreeNodeId, chartInstances, chartTypes, filters }
```

## 事件流 <!-- @sync -->

- 加载 → 建树 → 渲染 → 全局统计 → 渲染图表
- 点击树节点 → 下钻 → 重新统计 → 更新图表
- 图表类型切换 → 更新 chartTypes → setOption

## 关键算法复杂度 <!-- @sync -->

统计 O(n)，子树收集 O(m)，图表更新使用 ECharts diff

## 公共调用 <!-- @sync -->

- `readTasks.getAllTasks` (`.cline/skills/code/tasks/read-tasks.md`)
- `calcul-chart-process` (`.cline/skills/code/tasks/calcul-chart-process.md`)

## 关键条件 <!-- @sync -->

- 进度条颜色固定（未开始、计划中、进行中、已完成、已取消）
- 无数据图表显示“暂无数据”

## 依赖 <!-- @sync -->

- ECharts
- `tree-view-components` (`.cline/skills/code/panel/components/tree-view.md`)

## 错误处理 <!-- @sync -->

- 图表渲染失败降级提示

## 测试要点 <!-- @manual -->

- 验证下钻后数据仅显示子树
- 验证饼图/柱状图切换

## 修改指南 <!-- @auto-record -->

- 2026-05-07: v4.0 初始化
