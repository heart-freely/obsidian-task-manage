---
name: 导航中心视图
skill-version: 4.0
description: 导航中心视图（NavigatorView），提供任务管理的中心面板，包含侧边栏视图切换器、粘性头部（快捷日期/控制按钮/排序）、过滤区和主内容区
triggers:
  - 调整导航面板布局
  - 修改子视图切换逻辑
  - 改导航层过滤逻辑
  - 修该视图激活/清理流程
---

# 导航中心视图 Skill

## 文件 <!-- @sync -->

`src/panel/panel.js`

## 导出 <!-- @sync -->

- `VIEW_TYPE_NAVIGATOR`
- `NavigatorView` (class)
- `startNavigatorCore`

## 关联文件 <!-- @sync -->

- 源码：`src/panel/panel.js`
- Skill：`.cline/skills/code/panel/panel.md`
- 子视图 skill 汇总：`.cline/skills/code/views/views.md`

## 功能 <!-- @manual -->

- 提供 Obsidian 自定义 ItemView 实现（NavigatorView）
- 管理所有子视图的切换生命周期（activateSubView）
- 构建粘性头部（快捷日期/控制按钮/排序/过滤区）
- 实现导航层过滤（带指纹缓存）
- 双面板布局：树面板 + 内容面板
- 通过 PersistenceManager 持久化状态

## API (@skill-api) <!-- @sync -->

### 导入方

`main.js` 或其他入口：
```js
import { VIEW_TYPE_NAVIGATOR, NavigatorView, startNavigatorCore } from "./panel/panel"
```

### 导入

- `obsidian`: Notice
- `configs/plugin-configs`: CONFIG
- `storages/persist-storages`: createInitialState, getEffectiveDateRange, getFilterFingerprint, PersistenceManager
- `tasks/read/read-tasks`: getAllTasks
- `tasks/process/*`: filterTasks, fetchFutureTasks, fetchOverdueTasks, fetchTasks
- `panel/bars/*`: buildControlPanel, buildDateCascadePanel, buildHideButtons, buildMarkFilterPanel, buildQuickDatePanel, buildViewSwitcher, buildSortRow
- `panel/components/tree-view-components`: TaskTreeRenderer
- `panel/interacts/tooltip-interact`: TooltipManager
- `panel/views/*`: startListBaseView, BaseTaskView, drawCharts, startKanbanView, startMatrixView (等所有子视图)

## 类与核心函数 (@skill-class) <!-- @sync -->

- `NavigatorView` (extends `BaseTaskView`) - Obsidian 自定义 ItemView，管理子视图类型持久化
- `startNavigatorCore()` - 导航核心，创建布局、初始化状态、构建头部、激活子视图
- `buildHeader()` - 构建粘性头部（快捷日期/控制按钮/排序/过滤区）
- `refreshCurrentView()` - 刷新当前子视图（过滤→树面板→内容面板→持久化）
- `applyNavFilters(): Task[]` - 应用导航层过滤（带指纹缓存）
- `renderContent(filteredTasks)` - 渲染非自渲染视图的内容面板
- `activateSubView(viewType, force)` - 激活指定子视图
- `TaskTreeRenderer` - 树面板渲染器
- `tooltipManager` - 工具提示管理器单例
- `persistence` - 持久化管理器

## 核心函数 (@skill-func) <!-- @sync -->

- `VIEW_TYPE_NAVIGATOR: string` - 视图类型标识符
- `NavigatorView.getViewType(): string` - 返回视图类型
- `NavigatorView.getDisplayText(): string` - 返回显示名称
- `NavigatorView.getIcon(): string` - 返回图标名
- `NavigatorView.onOpen(): Promise` - 恢复上次子视图类型
- `NavigatorView._startCore(dv, app, storageAdapter, instanceId): Promise<Function>` - 启动导航核心
- `NavigatorView.getState(): { subViewType }` - 获取状态
- `NavigatorView.setState(state): void` - 设置状态
- `startNavigatorCore(dv, app, storageAdapter, instanceId, initialSubView, navigatorView?): Promise<Function>` - 核心启动函数
- `buildHeader(): void` - 构建粘性头部
- `refreshCurrentView(): Promise` - 刷新当前子视图
- `applyNavFilters(): Task[]` - 应用导航层过滤
- `renderContent(filteredTasks): Promise` - 渲染内容面板
- `activateSubView(viewType, force?): Promise` - 激活子视图

## 数据流伪代码 (@skill-flow) <!-- @sync -->

```text
NavigatorView.onOpen() → 从 getState() 恢复 _lastViewType
→ _startCore() → startNavigatorCore()
→ 创建布局 outerWithSidebar + sidebar + mainArea
→ 创建 state + persistence + tooltipManager + treeRenderer
→ buildViewSwitcher() 构建侧边栏
→ buildHeader() 构建粘性头部
→ persistence.load() 恢复持久化状态
→ 激活初始子视图 (activateSubView)
→ applyNavFilters() 过滤任务
→ treeRenderer.render() + renderContent()
→ 返回 cleanup 函数
```

## 全局状态 (@skill-global-state) <!-- @sync -->

```js
state = {
  dateFilterState: { start, end, isAll },
  markFilterState: { statuses, includeMarks, excludeMarks },
  hideRepeatTasks: boolean,
  hideCompletedTasks: boolean,
  hideCancelledTasks: boolean,
  hideFolders: boolean,
  showTree: boolean,
  showFilters: boolean,
  filterRootPath: string|null,
  leftSort: { type, order },
  activeQuickBtn: DOMElement|null,
  quickBtns: DOMElement[],
  dateCascadeEls: Object,
  chartInstances: Object[],
  filterCache: { fingerprint, tasks },
  collapsedNodes: Object,
  dataViewStatuses: string[],
}
NavigatorView._lastViewType: string  // 持久化的子视图类型
```

## 子视图清单 (@skill-anchor) <!-- @sync -->

| viewType | 视图 | 文件 |
|---|---|---|
| `task-dataview-view` | 数据图表视图 | `views/data-tasks-view.js` |
| `matrix-tasks-view` | 矩阵视图 | `views/matrix-task-view.js` |
| `kanban-task-view` | 看板视图 | `views/kanban-task-view.js` |
| `important-task-view` | 重要任务视图 | `views/important-task-view.js` |
| `inbox-task-view` | 收集箱视图 | `views/inbox-task-view.js` |
| `today-task-view` | 今日任务视图 | `views/today-task-view.js` |
| `recurring-task-view` | 循环任务视图 | `views/recurring-task-view.js` |
| `future-n-task-view` | 未来15天视图 | `views/future-task-n-view.js` |
| `future-all-task-view` | 未来所有视图 | `views/future-task-all-view.js` |
| `overdue-task-view` | 逾期任务视图 | `views/overdue-task-view.js` |
| `depends-task-view` | 依赖任务视图 | `views/depends-task-view.js` |
| `tag-task-view` | 标签任务视图 | `views/tag-task-view.js` |
| `timeline-task-view` | 时间线视图 | `views/timeline-task-view.js` |
| `table-task-view` | 表格视图 | `views/table-task-view.js` |
| `calendar-task-view` | 日历视图 | `views/calendar-task-view.js` |
| `gantt-task-view` | 甘特图视图 | `views/gantt-task-view.js` |
| `organize-task-view` | 整理箱视图 | `views/organize-task-view.js` |
| `pomodoro-task-view` | 番茄钟视图 | `views/pomodoro-task-view.js` |
| `tree-task-view` | 树形视图 | `views/tree-task-view.js` |
| `edit-task-view` | 编辑视图 | `views/edit-tasks-view.js` |

## 关键条件 <!-- @sync -->

- 子视图切换时: dataViewStatuses 在进出 task-dataview-view 时保存/恢复
- matrix/kanban/inbox 视图强制 statuses = ["todo","planned","in-progress"]
- 过滤指纹缓存: fingerprint 匹配时跳过重复过滤
- 自渲染视图列表: selfRenderedViews 中的视图自行管理 viewPanel
- 树面板显隐: state.showTree 控制 display
- 过滤区显隐: state.showFilters 控制 display
- cleanup: 销毁 echarts 实例 + 清理子视图 + 清空容器

## DOM 结构 <!-- @sync -->

- `.navigator-outer-with-sidebar` - 最外层容器（flex 行）
- `.navigator-sidebar` - 侧边栏视图切换区
- `.navigator-main` - 主内容区（flex 列）
- `.navigator-scroll-area` - 可滚动内容区
- `.header-sticky` - 粘性头部（快捷日期/控制按钮/排序/过滤）
- `.filter-area` - 过滤区
- `.navigator-content-layout` - 双面板布局（树面板 + 视图面板）
- `.navigator-tree-panel` - 左侧树面板
- `.navigator-view-panel` - 右侧视图内容面板
- `.quick-row` - 快捷日期行
- `.filter-label` - 过滤标签
- `.section-divider` - 节分隔线
- `.sort-row-wrapper` - 排序行容器
- `.empty-message` - 空状态提示
- `.dataview-tooltip` - 工具提示元素（全局唯一）

## 依赖 <!-- @sync -->

- `obsidian`: Notice
- `configs/plugin-configs`: CONFIG
- `storages/persist-storages`: createInitialState, getEffectiveDateRange, getFilterFingerprint, PersistenceManager
- `tasks/process/common-process`: DateUtils
- `tasks/process/filter-task-process`: filterTasks
- `tasks/process/task-query-process`: fetchFutureTasks, fetchOverdueTasks, fetchTasks
- `tasks/read/read-tasks`: getAllTasks
- 所有 bars 子模块
- 所有 views 子模块
- `panel/components/tree-view-components`: TaskTreeRenderer
- `panel/interacts/tooltip-interact`: TooltipManager

## 修改指南 <!-- @auto-record -->

- 2026-05-07: v4.0 从源码注释中完整提取生命周期和结构
