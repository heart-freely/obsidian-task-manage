---
name: BaseTaskView 基类开发
description: 开发或修改视图基类、任务卡片生成逻辑与数据标准化
triggers:
  - 修改任务卡片样式
  - 调整数据标准化
  - 修改视图基类
---

# BaseTaskView 基类 Skill

## 文件
`src/panel/views/base-task-view.js`

## 功能
- 提供所有视图的基类 `BaseTaskView`，封装 `ItemView` 生命周期、Dataview 代理创建
- 提供通用任务卡片生成函数 `createTaskCard`，接受标准化数据，输出 `<li class="task-item">`
- 提供数据标准化函数 `normalizeTaskCardData`，将 Tasks API 或 Dataview 结果转换为统一格式

## 实现方式
- `BaseTaskView` 继承 `ItemView`，在 `onOpen` 中初始化 `dv` 并调用 `_startCore`
- `createTaskCard` 构建两行 DOM：第一行状态图标 + 描述，第二行元信息（优先级、循环、日期、标签、ID、文件）
- `normalizeTaskCardData` 提取并重命名字段，确保后续处理一致

## 核心函数
- `createTaskCard(task, app)` → HTMLElement
- `normalizeTaskCardData(raw)` → TaskCardData

## DOM 结构
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

## 状态模型

无（纯工具函数与基类）
事件流

    createTaskCard 绑定点击跳转：使用 data-path 和 data-line，事件委托或直接 addEventListener

## 数据流伪代码

    raw task object 传入 normalizeTaskCardData → 获得统一结构

    调用 createTaskCard(normalized, app) → 生成 DOM

    视图将卡片插入列表

## 关键算法复杂度

    标准化：O(1) 字段映射

    卡片生成：O(1) DOM 操作

## 公共调用

    由其他视图调用

## 关键条件

    卡片必须使用 data-path 和 data-line 属性以支持跳转

## 依赖

    Obsidian API (ItemView, MarkdownView)

    CONFIG (图标映射)

## 修改指南

    调整卡片字段：修改 createTaskCard 内的 DOM 构建与 normalizeTaskCardData 的映射

    修改跳转行为：使用 app.workspace.openLinkText