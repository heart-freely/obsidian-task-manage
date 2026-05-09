---

## 7. `future-task-all-view.md`（全部未来任务视图）

```markdown
---

name: 全部未来任务视图开发
description: 显示今天之后所有未完成、非循环任务
skill-version: 4.0
triggers:

- 修改全部未来任务视图

---

# 全部未来任务视图 Skill

## 文件 <!-- @sync -->

`src/panel/views/future-task-all-view.js`

## 导出 <!-- @sync -->

- `FutureTaskAllView`
- `VIEW_TYPE_FUTURE_ALL`

## 关联文件 <!-- @sync -->

- 源码：`src/panel/views/future-task-all-view.js`
- Skill：`.cline/skills/code/panel/views/future-task-all-view.md`

## 功能 <!-- @manual -->

- 显示今天之后所有未完成任务（不含今天）
- 按状态分组，组内按计划时间升序、优先级降序

## 实现方式 <!-- @sync -->

- 过滤 `!isRecurring && status == TODO && (日期 >= tomorrow 或区间结束 >= tomorrow)`
- 分组排序渲染

## 核心函数 (@skill-sig) <!-- @sync -->

- `fetchFutureTasks(tasks, startDate): Task[]`
- `isTaskInFuture(task, startDate): bool`

## DOM 结构 <!-- @sync -->

同标准分组视图

## 状态模型 <!-- @sync -->

无内部状态

## 事件流 <!-- @sync -->

加载 → 过滤 → 分组 → 排序 → 渲染

## 数据流伪代码 <!-- @sync -->

同上

## 关键算法复杂度 <!-- @sync -->

O(n) 过滤，O(n log n) 排序

## 公共调用 <!-- @sync -->

- `readTasks.getAllTasks` (`.cline/skills/code/tasks/read-tasks.md`)
- `DateUtils` (`.cline/skills/code/utils/date-utils.md`)
- `createTaskCard` (`.cline/skills/code/panel/components/base-card-view.md`)

## 依赖 <!-- @sync -->

- `BaseTaskView` (`.cline/skills/code/panel/views/base-task-view.md`)

## 错误处理 <!-- @sync -->

- 无任务显示占位符

## 测试要点 <!-- @manual -->

- 验证明天及之后的任务被显示

## 修改指南 <!-- @auto-record -->

- 2026-05-07: v4.0 初始化
