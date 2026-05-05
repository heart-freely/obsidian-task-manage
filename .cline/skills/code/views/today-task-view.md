---
name: 今天任务视图开发
description: 开发或修改今天任务视图，显示所有与今天相关的任务
triggers:
  - 修改今天任务视图
  - 调整日期过滤逻辑
---

# 今天任务视图 Skill

## 文件
`src/panel/views/today-task-view.js`

## 功能
- 筛选与今天日期有交集的所有未完成任务（含循环任务）
- 支持多种日期字段：创建、计划、开始、截止、完成、取消任一等于今天，或计划-截止/开始-完成区间包含今天
- 按状态分组，循环任务单独一组置底
- 组内先按计划时间升序，再按优先级降序

## 实现方式
- 调用 `readTasks.getAllTasks` 获取全量任务
- JS 中日期过滤：获取今天日期字符串，遍历任务检查日期字段或区间
- 分组：非循环任务按状态分组，循环任务一组
- 渲染卡片列表

## 核心函数
- `fetchTodayTasks(dv, state)` → Task[]
- `isDateToday(date)` / `isRangeIncludesToday(task, mode)` → boolean

## DOM 结构
```html
<div class="today-view">
  <div class="task-group" data-status="backlog">
    <h3>1️⃣ 未开始</h3>
    <ul class="task-list"></ul>
  </div>
  <!-- 其他状态组 -->
  <div class="task-group recurring-group">
    <h3>9️⃣ 循环任务</h3>
    <ul class="task-list"></ul>
  </div>
</div>
```
## 状态模型

无（纯展示，循环任务标记是否重复）
## 事件流

    加载 → 获取任务 → 过滤 → 分组 → 排序 → 渲染

## 数据流伪代码

    tasks = getAllTasks(dv, state)

    过滤：任意日期字段 == today 或 区间包含 today

    非循环任务按状态分组，循环任务单独分组

    组内排序：scheduled 升序，priority 降序

    渲染各组

## 关键算法复杂度

    过滤：O(n)

    分组排序：O(n log n)

## 公共调用

    readTasks.getAllTasks

    DateUtils

    createTaskCard

## 关键条件

    循环任务不参与状态分组

## 依赖

    readTasks, DateUtils, BaseTaskView

## 修改指南

    调整日期范围：修改 isRangeIncludesToday 的条件

## AI 命令
生成或修改此视图时：
- 数据源：使用 `readTasks.getAllTasks` 获取所有任务。
- 日期过滤：必须同时支持单日期相等与区间包含，使用 `DateUtils` 进行日期比较。
- 分组：按状态固定顺序（未开始→计划中→进行中→...），循环任务用 `task.isRecurring` 分离到最后。
- 渲染：卡片组件复用 `createTaskCard`，列表容器为 `task-list`。
- 严禁使用硬编码的 Tasks 查询字符串，所有逻辑在 JS 中。