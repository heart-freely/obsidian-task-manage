---
name: 标签聚合视图开发
description: 开发或修改按标签（🏁）聚合任务列表的视图
skill-version: 3.1
triggers:
  - 修改标签视图
  - 调整标签过滤
---

# 标签聚合视图 Skill

## 文件 <!-- @sync -->
`src/panel/views/tag-task-view.js`

## 导出 <!-- @sync -->
- `TagTaskView`
- `VIEW_TYPE_TAG`

## 关联文件 <!-- @sync -->
- 源码：`src/panel/views/tag-task-view.js`
- Skill：`.cline/skills/code/views/tag-task-view.md`

## 功能 <!-- @manual -->
- 提取所有任务的旗帜标记（🏁）作为标签，按标签分组展示任务
- 支持多选标签过滤（AND/OR），点击任务跳转原文

## 实现方式 <!-- @sync -->
- API 获取任务，利用 `read-tasks.js` 解析标签字段 `task.flag`
- 构建标签到任务数组的映射
- 渲染标签列表和对应任务卡片（卡片复用 `createTaskCard`）

## 核心函数 (@skill-sig) <!-- @sync -->
- `groupByFlag(tasks: Task[]): Map<string, Task[]>` - 按标签值分组
- `filterTasksBySelectedTags(tasks: Task[], selectedTags: string[], mode: 'AND'|'OR'): Task[]` - 根据多选标签过滤任务
- `renderTagSidebar(tags: Map<string, Task[]>): void` - 渲染侧边栏标签列表
- `renderTaskList(tasks: Task[]): void` - 渲染当前过滤后的任务列表

## DOM 结构 (@skill-dom) <!-- @sync -->
```html
<div class="tag-view layout-sidebar">
  <div class="tag-sidebar">
    <div class="tag-filter-mode">
      <label><input type="radio" name="mode" value="AND"> AND</label>
      <label><input type="radio" name="mode" value="OR"> OR</label>
    </div>
    <ul class="tag-list">
      <li data-tag="tag1"><span>🏁 tag1</span><span class="count">3</span></li>
    </ul>
  </div>
  <div class="task-list-container">
    <ul class="task-list"></ul>
  </div>
</div>
状态模型 (@skill-state) <!-- @sync -->
js

state = {
  allTasks: Task[],
  tagMap: Map<string, Task[]>,
  selectedTags: Set<string>,
  filterMode: 'AND' | 'OR'
}

事件流 (@skill-flow) <!-- @sync -->

    加载数据 → groupByFlag → 渲染侧边栏 + 默认显示所有任务

    点击标签 → 更新 selectedTags → 重新过滤任务 → 刷新右侧任务列表

    切换 AND/OR → 更新 filterMode → 重新过滤 → 刷新任务列表

    点击任务卡片 → 跳转至源文件

数据流伪代码 <!-- @sync -->
text

tasks = getAllTasks(dv, state)
tagMap = groupByFlag(tasks)
渲染标签侧边栏
监听标签点击和模式切换
根据 selectedTags 和 filterMode 过滤任务（若 selectedTags 为空则显示全部）
渲染过滤后任务列表（使用 createTaskCard）

关键算法复杂度 (@skill-algorithm) <!-- @sync -->

    分组：O(n)

    过滤：O(n * |selectedTags|)（AND/OR 模式）

    渲染：O(m)（m 为过滤后任务数）

公共调用 (@skill-api) <!-- @sync -->

    readTasks.getAllTasks(dv, state)

    createTaskCard(normalizeTaskCardData(task))

关键条件 (@skill-condition) <!-- @sync -->

    任务若无 tag（flag 字段为空），不显示在任一组中，也不在侧边栏展示。

    AND 模式：任务需包含所有选中标签；OR 模式：包含任一标签即可。

依赖 <!-- @sync -->

    readTasks.getAllTasks

    createTaskCard

    BaseTaskView

错误处理 <!-- @sync -->

    无标签任务时显示“暂无标签任务”占位符。

    过滤后无任务时显示“没有符合标签条件的结果”。

测试要点 <!-- @manual -->

    验证多选标签 AND/OR 模式过滤结果正确。

    验证任务跳转链接正确。

修改指南 <!-- @auto-record -->

    2026-05-06: 初始版本（基于 v3.1 格式规范化）
