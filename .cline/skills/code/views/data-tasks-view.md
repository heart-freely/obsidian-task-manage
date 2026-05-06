---
name: 统计分析视图开发
description: 任务数据统计分析，左侧任务树与右侧 ECharts 图表联动
triggers:
  - 修改统计图表类型
  - 添加新统计维度
  - 实现下钻统计
---

# 任务数据统计分析视图 Skill

## 文件
`src/panel/views/data-tasks-view.js`

## 功能
- 左侧任务树：展示任务层级结构，每个有子任务的节点显示进度条（各状态比例），支持折叠
- 下钻统计：点击树节点时，图表只统计该节点及其子任务的数据
- 右侧多维度图表：执行状态、优先级、循环周期、日期标记、依赖、标签等
- 图表类型切换：同维度可在饼图和堆叠柱状图之间切换
- 筛选联动：支持全局筛选条件（日期范围、隐藏完成/取消等）影响统计数据

## 实现方式
- 数据获取：`readTasks.getAllTasks` 配合当前筛选条件
- 统计计算：`calcul-chart-process` 提供各类聚合函数
- 图表渲染：ECharts 实例复用，通过 `setOption` 更新配置
- 下钻实现：维护 `currentTreeNode` 状态，点击树节点后重新调用统计函数，只计算节点子树内的任务

## 核心函数
- `getSubtreeTasks(node, allTasks)` → Task[]
- `calculateStats(tasks)` → statsObject
- `updateChart(chartInstance, stats, chartType)`

## DOM 结构
```html
<div class="data-analysis-container">
  <div class="analysis-left">
    <div class="tree-view">...</div>
  </div>
  <div class="analysis-right charts-grid">
    <div class="chart-item" id="chart-status"></div>
    <div class="chart-item" id="chart-priority"></div>
    <!-- 更多图表 -->
  </div>
</div>
```
## 状态模型
```js

state = {
  tasks: [],
  tree: {},
  currentTreeNodeId: null,
  chartInstances: [echart, ...],
  chartTypes: { status: 'pie', priority: 'bar' }
}
```
## 事件流

    树节点点击 → 更新 currentTreeNodeId → 计算子树统计 → 更新所有图表

    图表类型切换按钮 → 重新 setOption 同维度不同图表类型

    全局筛选变化 → 重新获取任务 → 刷新树和图表

## 数据流伪代码

    tasks = getAllTasks(dv, state)

    构建左侧树

    若存在下钻节点 → filtered = getSubtreeTasks(node, tasks)

    否则 filtered = tasks

    stats = calculateStats(filtered)

    遍历图表配置，调用 updateChart 更新

## 关键算法复杂度

    统计计算：O(n)

    子树收集：O(m)，m 为子树节点数

    图表更新：使用 ECharts diff，数据量 < 2000 流畅

## 公共调用

    readTasks.getAllTasks

    calcul-chart-process

    树组件

## 关键条件

    进度条显示各状态比例，颜色固定

    图表切换保留维度

## 依赖

    ECharts

    readTasks

    calcul-chart-process

    tree-view-components

## 修改指南

    增加统计维度：在 calcul-chart-process 中添加聚合函数并添加图表

    调整图表样式：修改 setOption 中的颜色、图例
