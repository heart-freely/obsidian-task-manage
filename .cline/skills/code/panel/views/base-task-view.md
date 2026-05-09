---

## 示例 3：`base-task-view.md`

```markdown
---
name: BaseTaskView 基类开发
description: 视图基类、任务卡片生成、数据标准化
skill-version: 4.0
triggers:
  - 修改任务卡片样式
  - 调整数据标准化
  - 修改视图基类
---

# BaseTaskView 基类 Skill

## 文件 <!-- @sync -->
`src/panel/views/base-task-view.js`

## 导出 <!-- @sync -->
- `BaseTaskView`
- `createTaskCard`
- `normalizeTaskCardData`

## 关联文件 <!-- @sync -->
- 源码：`src/panel/views/base-task-view.js`
- Skill：`.cline/skills/code/panel/views/base-task-view.md`

## 功能 <!-- @manual -->
- 视图基类封装生命周期和 Dataview 代理
- 通用任务卡片生成，支持跳转
- 任务数据标准化

## 实现方式 <!-- @sync -->
- `BaseTaskView extends ItemView`
- `createTaskCard` 构建两行 DOM
- `normalizeTaskCardData` 字段映射

## 核心函数 (@skill-sig) <!-- @sync -->
- `createTaskCard(task: TaskCardData, app: App): HTMLLIElement`
- `normalizeTaskCardData(raw: any): TaskCardData`

## DOM 结构 (@skill-dom) <!-- @sync -->
```html
<li class="task-item" data-path="..." data-line="...">
  <div class="task-main"><span class="task-status-icon"></span><span class="task-desc"></span></div>
  <div class="task-meta">...</div>
</li>
```

## 状态模型 (@skill-state) <!-- @sync -->

无内部状态

## 事件流 (@skill-flow) <!-- @sync -->

卡片点击 → `app.workspace.openLinkText` 跳转

## 数据流伪代码 <!-- @sync -->

raw → normalize → 构建 DOM → 绑定事件

## 关键算法复杂度 (@skill-algorithm) <!-- @sync -->

O(1) 标准化，O(1) 卡片生成

## 公共调用 <!-- @sync -->

被所有视图调用

## 关键条件 (@skill-condition) <!-- @sync -->

卡片必须包含 `data-path` 和 `data-line`

## 依赖 <!-- @sync -->

无外部 Skill 依赖（仅 Obsidian API）

## 错误处理 <!-- @sync -->

标准化失败返回默认空对象；文件跳转失败显示提示

## 测试要点 <!-- @manual -->

验证卡片元信息完整；跳转正确

## 修改指南 <!-- @auto-record -->

- 2026-05-07: 初始版本 (v4.0)
