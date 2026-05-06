
---

## 2. `.cline/skills/code/views/base-task-view.md`（基类）

```markdown
---
name: BaseTaskView 基类开发
description: 开发或修改视图基类、任务卡片生成逻辑与数据标准化
skill-version: 3.1
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
- Skill：`.cline/skills/code/views/base-task-view.md`

## 功能 <!-- @manual -->
- 提供所有视图的基类 `BaseTaskView`，封装 `ItemView` 生命周期、Dataview 代理创建
- 提供通用任务卡片生成函数 `createTaskCard`，接受标准化数据，输出 `<li class="task-item">`
- 提供数据标准化函数 `normalizeTaskCardData`，将 Tasks API 或 Dataview 结果转换为统一格式

## 实现方式 <!-- @sync -->
- `BaseTaskView` 继承 `ItemView`，在 `onOpen` 中初始化 `dv` 并调用 `_startCore`
- `createTaskCard` 构建两行 DOM：第一行状态图标 + 描述，第二行元信息（优先级、循环、日期、标签、ID、文件）
- `normalizeTaskCardData` 提取并重命名字段，确保后续处理一致

## 核心函数 (@skill-sig) <!-- @sync -->
- `createTaskCard(task: TaskCardData, app: App): HTMLLIElement` - 生成完整任务卡片 DOM
- `normalizeTaskCardData(raw: any): TaskCardData` - 标准化任务数据格式

## DOM 结构 (@skill-dom) <!-- @sync -->
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

状态模型 (@skill-state) <!-- @sync -->

无内部状态（纯工具函数与基类）
事件流 (@skill-flow) <!-- @sync -->

    createTaskCard 绑定点击跳转：使用 data-path 和 data-line 属性，通过事件委托或直接 addEventListener 触发 app.workspace.openLinkText

数据流伪代码 <!-- @sync -->
text

rawTask → normalizeTaskCardData → 统一结构 { symbol, desc, priority, ... }
调用 createTaskCard(normalized, app) → 构建 DOM 元素
为元素绑定点击事件（或通过父容器委托）

关键算法复杂度 (@skill-algorithm) <!-- @sync -->

    标准化：O(1) 字段映射

    卡片生成：O(1) DOM 操作

公共调用 (@skill-api) <!-- @sync -->

    被所有视图调用

    依赖 Obsidian API (ItemView, MarkdownView)

关键条件 (@skill-condition) <!-- @sync -->

    卡片必须使用 data-path 和 data-line 属性以支持跳转。

    若无任务描述，显示“无标题”。

依赖 <!-- @sync -->

    Obsidian API (ItemView, MarkdownView, App)

    CONFIG（图标映射）

错误处理 <!-- @sync -->

    标准化失败时返回默认空对象，控制台警告。

    点击跳转时若文件不存在，显示提示。

测试要点 <!-- @manual -->

    验证卡片包含所有元信息，且跳转正确。

    验证无字段时的降级显示。

修改指南 <!-- @auto-record -->

    2026-05-06: 初始版本（基于 v3.1 格式规范化）
    
    