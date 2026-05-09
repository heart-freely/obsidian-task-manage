---
name: 今天任务视图开发
description: 显示所有与今天相关的任务（含循环任务）
skill-version: 4.0
triggers:
    - 修改今天任务视图
    - 调整日期过滤逻辑
---

# 今天任务视图 Skill

## 文件 <!-- @sync -->

`src/panel/views/today-task-view.js`

## 导出 <!-- @sync -->

- `TodayTaskView`
- `VIEW_TYPE_TODAY`

## 关联文件 <!-- @sync -->

- 源码：`src/panel/views/today-task-view.js`
- Skill：`.cline/skills/code/panel/views/today-task-view.md`

## 功能 <!-- @manual -->

- 筛选与今天日期有交集的所有未完成任务（含循环任务）
- 支持多种日期字段和区间包含
- 按状态分组，循环任务单独一组置底
- 组内按计划时间升序、优先级降序

## 实现方式 <!-- @sync -->

- `readTasks.getAllTasks` 获取任务
- `DateUtils` 判断日期
- 分组：非循环任务按状态，循环任务单独一组

## 核心函数 (@skill-sig) <!-- @sync -->

- `fetchTodayTasks(dv: DataView, state: AppState): Task[]`
- `isDateToday(date: string): boolean`
- `isRangeIncludesToday(task: Task, mode: string): boolean`

## DOM 结构 (@skill-dom) <!-- @sync -->

```html
<div class="today-view">
	<div class="task-group" data-status="backlog">
		<h3>1️⃣ 未开始</h3>
		<ul class="task-list"></ul>
	</div>
	<div class="task-group" data-status="planned">
		<h3>2️⃣ 计划中</h3>
		<ul class="task-list"></ul>
	</div>
	<div class="task-group" data-status="inProgress">
		<h3>3️⃣ 进行中</h3>
		<ul class="task-list"></ul>
	</div>
	<div class="task-group recurring-group">
		<h3>9️⃣ 循环任务</h3>
		<ul class="task-list"></ul>
	</div>
</div>
```

## 状态模型 (@skill-state) <!-- @sync -->

无内部状态

## 事件流 (@skill-flow) <!-- @sync -->

加载 → 过滤 → 分组排序 → 渲染

## 数据流伪代码 <!-- @sync -->

同上

## 关键算法复杂度 (@skill-algorithm) <!-- @sync -->

O(n) 过滤，O(n log n) 排序

## 公共调用 (@skill-api) <!-- @sync -->

- `readTasks.getAllTasks` (`.cline/skills/code/tasks/read-tasks.md`)
- `DateUtils.isToday` (`.cline/skills/code/utils/date-utils.md`)
- `createTaskCard` (`.cline/skills/code/panel/components/base-card-view.md`)

## 关键条件 (@skill-condition) <!-- @sync -->

- 循环任务单独分组置底
- 区间包含检查覆盖今天

## 依赖 <!-- @sync -->

- `BaseTaskView` (`.cline/skills/code/panel/views/base-task-view.md`)

## 错误处理 <!-- @sync -->

- 日期解析失败跳过任务并警告
- 无任务显示占位符

## 测试要点 <!-- @manual -->

- 验证单日期字段匹配今天
- 验证区间包含正确匹配
- 验证循环任务分组置底

## 修改指南 <!-- @auto-record -->

- 2026-05-07: 初始版本 (v4.0)
