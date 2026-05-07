---
name: 任务管理插件开发架构
description: 插件整体架构、数据流、开发规范、命名规则等全局信息。所有视图 Skill 的顶层参考。
skill-version: 4.0
triggers:
  - 了解架构
  - 修改核心数据流
  - 添加新模块
---

# 项目总览 <!-- @sync --

本插件为 Obsidian 提供统一的任务管理面板，基于 **Tasks 插件 API** 与 **Dataview** 双数据源，采用 ItemView 架构，内置 20+ 个专业视图，并复用全局筛选、排序、左侧任务树导航。

## 技术栈与依赖 <!-- @sync --
由 AI 从源码自动提取（如 `package.json`、`main.js` 等）。

- **运行环境**：Obsidian 插件（`ItemView`）
- **数据源**：Tasks 插件 API + Dataview（自定义标记解析）
- **UI 渲染**：原生 DOM API + Canvas + ECharts
- **状态管理**：全局 state + Obsidian `loadData/saveData` + `localStorage`
- **构建工具**：esbuild

## 架构分层与关键目录 <!-- @sync --
由 AI 从源码目录结构自动生成。

```text
src/
├── main.js                 # 插件入口
├── configs/                # 全局常量
├── panel/                  # UI 层（视图、组件、交互）
├── tasks/                  # 数据层（读取、处理、写入）
├── storage/                # 持久化
├── echarts/                # 图表封装
└── utils/                  # 工具

```
## 核心数据流 <!-- @sync --
由 AI 从源码中的调用关系自动提取。

用户交互 → panel.js 更新全局 state → readTasks.getAllTasks()
→ 缓存全量任务 → 左侧树/统计更新 → 当前视图渲染

## 全局状态结构（自动从源码同步）<!-- @sync --
以下由 AI 从 `src/storage/persist-storage.js` 中的 `createInitialState` 自动提取。

```js
state = {
  dateFilterState: { start, end, isAll },
  markFilterState: { statuses, includeMarks, excludeMarks },
  hideRepeatTasks: false,
  hideCompletedTasks: false,
  hideCancelledTasks: false,
  hideFolders: false,
  leftSort: { type: 'status', order: 'asc' },
  filterCache: { fingerprint, tasks: [] },
  collapsedNodes: {},
  chartInstances: [],
}
```


## 公共 API 签名（自动从源码同步）<!-- @sync --

以下由 AI 从 `src/tasks/read/read-tasks.js`、`src/tasks/process/filter-task-process.js`、`src/tasks/write/write-tasks.js` 提取。

- `getAllTasks(force, dv, state): Promise<Task[]`
- `filterTasks(tasks, state): Task[]`
- `bulkPatch(changes): Promise<void`
- `createSnapshot(originals): Snapshot`

## 常见开发任务索引 <!-- @sync --

由 AI 从 `.cline/skills/code/` 目录结构自动生成。

| 目标             | 参考 Skill                                                  |
| ---------------- | ----------------------------------------------------------- |
| 新增列表视图     | `views/base-list-view.md`                                   |
| 扩展任务卡片字段 | `views/base-task-view.md`                                   |
| 开发图形化视图   | `views/gantt-task-view.md` 或 `views/calendar-task-view.md` |
| 修改标记解析规则 | `tasks/read-tasks.md`                                       |
| 调整全局常量     | `configs/plugin-configs.md`                                 |

## 错误处理与边界约定 <!-- @sync --

由 AI 从源码中的错误处理模式自动总结。

- 所有 API 调用必须 try-catch，失败时显示 notice 并返回空数组。
- 数据为空时显示友好空状态文案。
- 日期解析失败置为 null，不中断流程。
- 无日期任务在甘特图/日历中提示。

## 参考文档

- 开发规范详情请参见 `.cline/skills/references/develop-standard.md`
- 任务数据模型：`.cline/skills/code/tasks/tasks.md`
- 视图开发基类：`.cline/skills/code/views/base-task-view.md`

本文件为架构总览，具体模块实现请参考 `.cline/skills/code/` 下各独立 Skill。AI 会自动同步全局状态结构、公共 API 签名以及上述标记为 `@sync` 的章节。

