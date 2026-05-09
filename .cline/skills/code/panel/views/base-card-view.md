---
name: 通用卡片工厂开发
description: 统一的任务卡片生成基类，包含数据标准化和 DOM 渲染
skill-version: 4.0
triggers:
    - 修改任务卡片样式
    - 调整卡片字段
---

# 通用卡片工厂 Skill

## 文件 <!-- @sync -->

`src/panel/components/base-card-view.js`

> 注意：当前源码文件名为 `task-card.js`，计划重命名为 `base-card-view.js` 以匹配 Skill 名称。若源码尚未重命名，请同步修改。

## 导出 <!-- @sync -->

- `createTaskCard`
- `normalizeTaskCardData`

## 关联文件 <!-- @sync -->

- 源码：`src/panel/components/base-card-view.js`
- Skill：`.cline/skills/code/panel/components/base-card-view.md`

## 功能 <!-- @manual -->

- 将标准化任务数据渲染为 `<li class="task-item">` 卡片
- 支持点击跳转源文件
- 提供数据标准化函数，供各视图统一调用

## 实现方式 <!-- @sync -->

- 接收 `fetchTasks`、标题、颜色等参数
- 内部创建标题栏、排序按钮、分页控件、任务列表
- 调用 `createTaskCard` 渲染

## 核心函数 (@skill-sig) <!-- @sync -->

- `createTaskCard(task: TaskCardData, app: App): HTMLLIElement` - 生成卡片 DOM
- `normalizeTaskCardData(raw: any): TaskCardData` - 将原始任务数据转换为标准格式

## DOM 结构 <!-- @sync -->

```html
<li class="task-item" data-path="..." data-line="...">
	<div class="task-main">
		<span class="task-status-icon">🔲</span>
		<span class="task-desc">任务描述</span>
	</div>
	<div class="task-meta">
		<span class="task-priority">🔺</span>
		<span class="task-recurrence">🔁 every day</span>
		<span class="task-dates">➕2025-01-01 📅2025-02-01</span>
		<span class="task-tags">🏁 keep</span>
		<span class="task-id">🆔 abc123</span>
		<span class="task-file">文件名</span>
	</div>
</li>
```

## 标准化数据格式 (TaskCardData) <!-- @sync -->

js

```
{
  statusIcon: string,   // 状态图标（🔲、❔、⏩、✅、❎）
  description: string,
  priorityEmoji: string,
  recurrenceRule: string,
  dates: string,        // 合并的日期字符串（如 "+2025-01-01 📅2025-02-01"）
  flag: string,
  id: string,
  filePath: string,
  line: number
}
```

## 状态模型 (@skill-state) <!-- @sync -->

由调用方维护：`{ tasks, currentPage, pageSize, sortKey, sortAsc }`

## 事件流 <!-- @sync -->

卡片点击 → 读取 `data-path` 和 `data-line` → 调用 `app.workspace.openLinkText` 跳转

## 数据流伪代码 <!-- @sync -->

fetch → sort → paginate → createTaskCard 渲染

## 关键算法复杂度 (@skill-algorithm) <!-- @sync -->

排序 O(n log n)，分页 O(1)，渲染 O(pageSize)

## 公共调用 (@skill-api) <!-- @sync -->

- `createTaskCard` (`.cline/skills/code/panel/components/base-card-view.md`)

## 关键条件 <!-- @sync -->

- 卡片必须包含 `data-path` 和 `data-line` 属性才能跳转
- 无描述时显示“无标题”

## 依赖 <!-- @sync -->

- Obsidian `App` API

## 错误处理 <!-- @sync -->

- 标准化数据缺失字段时使用默认值（如空字符串）
- 文件跳转失败时显示 notice

## 测试要点 <!-- @manual -->

- 验证卡片所有字段正确显示
- 验证点击跳转到正确的文件行号

## 修改指南 <!-- @auto-record -->

- 2026-05-07: v4.0 重命名并更新为基类组件
