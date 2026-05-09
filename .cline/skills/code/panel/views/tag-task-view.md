---
name: 标签聚合视图开发
description: 按旗帜标记聚合任务，支持多选 AND/OR 过滤
skill-version: 4.0
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
- Skill：`.cline/skills/code/panel/views/tag-task-view.md`

## 功能 <!-- @manual -->
- 提取 `task.flag` 作为标签，按标签分组
- 支持多选标签 AND/OR 过滤

## 实现方式 <!-- @sync -->
- `groupByFlag` 构建映射
- 过滤根据选中标签和模式

## 核心函数 (@skill-sig) <!-- @sync -->
- `groupByFlag(tasks): Map<string, Task[]>`
- `filterTasksBySelectedTags(tasks, selectedTags, mode): Task[]`
- `renderTagSidebar(tagMap): void`
- `renderTaskList(tasks): void`

## DOM 结构 <!-- @sync -->
```html
<div class="tag-view layout-sidebar">
<div class="tag-sidebar">
  <div class="tag-filter-mode"><label>AND</label><label>OR</label></div>
  <ul class="tag-list"><li data-tag="tag1"><span>🏁 tag1</span><span class="count">3</span></li></ul>
</div>
<div class="task-list-container"><ul class="task-list"></ul></div>
</div>
```
## 状态模型 <!-- @sync -->

```
{ allTasks, tagMap, selectedTags, filterMode }
```

## 事件流 <!-- @sync -->

- 加载 → 分组 → 渲染侧边栏
- 点击标签/切换模式 → 过滤 → 刷新任务列表

## 关键算法复杂度 <!-- @sync -->

分组 O(n)，过滤 O(n * |selectedTags|)

## 公共调用 <!-- @sync -->

- `readTasks.getAllTasks`
- `createTaskCard`

## 依赖 <!-- @sync -->

- `BaseTaskView`

## 错误处理 <!-- @sync -->

- 无标签任务显示占位符

## 测试要点 <!-- @manual -->

- 验证 AND/OR 模式正确

## 修改指南 <!-- @auto-record -->

- 2026-05-07: v4.0 初始化
