
---

## 3. `.cline/skills/code/views/recurring-task-view.md`

```markdown
---
name: 循环任务视图开发
description: 开发或修改循环任务视图，按优先级、周期、文件名分组展示
skill-version: 3.1
triggers:
  - 修改循环任务视图
  - 调整周期分类规则
---

# 循环任务视图 Skill

## 文件 <!-- @sync -->
`src/panel/views/recurring-task-view.js`

## 导出 <!-- @sync -->
- `RecurringTaskView`
- `VIEW_TYPE_RECURRING`

## 关联文件 <!-- @sync -->
- 源码：`src/panel/views/recurring-task-view.js`
- Skill：`.cline/skills/code/views/recurring-task-view.md`

## 功能 <!-- @manual -->
- 筛选所有循环任务 (`isRecurring === true`)
- 三级分组：优先级 → 循环周期（每天/每周/每月/每年/自定义） → 文件名
- 组内按计划时间升序

## 实现方式 <!-- @sync -->
- 获取全部任务，过滤 `task.isRecurring`
- 周期识别：解析 `task.recurrenceRule` 文本，映射到类别
- 多级分组用 Map 或对象，使用嵌套渲染

## 核心函数 (@skill-sig) <!-- @sync -->
- `classifyRecurrence(rule: string): 'daily'|'weekly'|'monthly'|'yearly'|'custom'` - 解析循环规则文本并归类
- `groupRecurringTasks(tasks: Task[]): GroupedTasks` - 三级分组
- `renderGroupedTasks(container: HTMLElement, grouped: GroupedTasks): void` - 递归渲染分组和任务卡片

## DOM 结构 (@skill-dom) <!-- @sync -->
```html
<div class="recurring-view">
  <div class="priority-group" data-priority="1">
    <h3>最高优先级</h3>
    <div class="recurrence-group" data-recurrence="daily">
      <h4>每天</h4>
      <div class="file-group" data-file="path/to/file.md">
        <h5>文件名</h5>
        <ul class="task-list"></ul>
      </div>
    </div>
  </div>
</div>
状态模型 (@skill-state) <!-- @sync -->
js

state = {
  groupedData: GroupedTasks,
  collapsedGroups: Set<string>  // 记录折叠的分组 ID
}

事件流 (@skill-flow) <!-- @sync -->

    加载数据 → 过滤循环任务 → 三级分组 → 渲染

    点击分组标题（优先级/周期/文件名）→ 更新折叠状态 → 重新渲染或显示/隐藏

数据流伪代码 <!-- @sync -->
text

tasks = getAllTasks(dv, state)
recurring = tasks.filter(t => t.isRecurring)
grouped = groupRecurringTasks(recurring)
// 分组流程：按 priority 数值降序 → 按 classifyRecurrence 结果的映射值 → 按文件名
每组内按 scheduled 升序排序
递归渲染分组（使用卡片组件）
绑定折叠事件

关键算法复杂度 (@skill-algorithm) <!-- @sync -->

    过滤：O(n)

    分组：O(n)

    周期解析：O(m)（m 为循环任务数）

    组内排序：O(k log k)

公共调用 (@skill-api) <!-- @sync -->

    readTasks.getAllTasks(dv, state)

    createTaskCard(normalizeTaskCardData(task))

关键条件 (@skill-condition) <!-- @sync -->

    只有 isRecurring === true 的任务进入视图。

    周期分类：优先匹配常见英文（daily/weekly/monthly/yearly），其他归为 custom。

    无循环规则文本的任务归入 custom 组。

依赖 <!-- @sync -->

    readTasks.getAllTasks

    createTaskCard

    BaseTaskView

错误处理 <!-- @sync -->

    无循环任务时显示“暂无循环任务”占位符。

    周期解析失败时默认归入 custom，并在控制台输出警告。

测试要点 <!-- @manual -->

    验证循环规则解析覆盖常见场景（每天/每周/每月/每年）。

    验证分组层级顺序（优先级高→低，周期按预定义顺序）。

修改指南 <!-- @auto-record -->

    2026-05-06: 初始版本（基于 v3.1 格式规范化）
