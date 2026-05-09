---
name: 通用列表工厂开发
description: 快速构建带标题、排序、分页的基础任务列表
skill-version: 4.0
triggers:
    - 创建列表视图
    - 修改列表工厂
---

# 通用列表工厂 Skill

## 文件 <!-- @sync -->

`src/panel/views/base-list-view.js`

## 导出 <!-- @sync -->

- `startListBaseView`

## 关联文件 <!-- @sync -->

- 源码：`src/panel/views/base-list-view.js`
- Skill：`.cline/skills/code/panel/views/base-list-view.md`

## 功能 <!-- @manual -->

- 工厂函数，快速构建带排序、分页的任务列表
- 统一处理加载、渲染、空状态

## 实现方式 <!-- @sync -->

- 接收 `fetchTasks`、标题、颜色等参数
- 内部创建标题栏、排序按钮、分页控件、任务列表
- 调用 `createTaskCard` 渲染

## 核心函数 (@skill-sig) <!-- @sync -->

- `startListBaseView(app, container, fetchTasks, title, accentColor, viewState): { cleanup, updateSort }`

## DOM 结构 (@skill-dom) <!-- @sync -->

```html
<div class="base-list-view">
	<div class="view-header">
		<h2>...</h2>
		<div class="sort-controls">...</div>
	</div>
	<ul class="task-list"></ul>
	<div class="pagination">
		<button>上一页</button><span>1/10</span><button>下一页</button>
	</div>
</div>
```

## 状态模型 (@skill-state) <!-- @sync -->

由调用方维护：`{ tasks, currentPage, pageSize, sortKey, sortAsc }`

## 事件流 (@skill-flow) <!-- @sync -->

- 初始化 → 加载 → 渲染第一页
- 排序按钮 → 更新 sort → 重置页码 → 重新渲染
- 分页按钮 → 更新 currentPage → 重新渲染

## 数据流伪代码 <!-- @sync -->

fetch → sort → paginate → createTaskCard 渲染

## 关键算法复杂度 (@skill-algorithm) <!-- @sync -->

排序 O(n log n)，分页 O(1)，渲染 O(pageSize)

## 公共调用 (@skill-api) <!-- @sync -->

- `createTaskCard` (`.cline/skills/code/panel/components/base-card-view.md`)

## 关键条件 <!-- @sync -->

- 无任务显示空状态
- 页码超出自动修正

## 依赖 <!-- @sync -->

- `BaseTaskView` (`.cline/skills/code/panel/views/base-task-view.md`)

## 错误处理 <!-- @sync -->

- fetch 失败显示错误消息

## 测试要点 <!-- @manual -->

- 验证分页和排序功能独立生效

## 修改指南 <!-- @auto-record -->

- 2026-05-07: v4.0 初始化
