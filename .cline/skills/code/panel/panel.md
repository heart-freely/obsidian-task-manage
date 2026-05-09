# panel.js - 导航中心视图（NavigatorView）

## 基本信息

- **文件路径**: `src/panel/panel.js`
- **所属模块**: panel（面板）
- **功能**: 提供任务管理的导航中心面板，包含侧边栏视图切换器、粘性头部（快捷日期/控制按钮/排序）、过滤区和主内容区，支持 20+ 种子视图的动态加载和切换

## 核心架构

```
NavigatorView (BaseTaskView 子类)
  └── startNavigatorCore()
       ├── 布局构建: outerWithSidebar → sidebar + mainArea
       │   └── mainArea → scrollArea → stickyHeader + filterWrapper + contentLayout
       │       └── contentLayout → treePanel (左) + viewPanel (右)
       ├── 状态创建: createInitialState() + PersistenceManager
       ├── 头部构建: buildHeader() → 快捷日期 + 控制按钮(含隐藏) + 过滤区 + 排序
       ├── 树渲染: TaskTreeRenderer(treePanel)
       ├── 视图切换: activateSubView() → 动态加载子视图
       └── 刷新流程: refreshCurrentView() → 过滤 → 树渲染 → 内容渲染 → 持久化
```

## 类说明

### `NavigatorView` (extends BaseTaskView)

Obsidian 自定义 ItemView 实现，提供任务导航的中心面板。

| 方法                                              | 说明                                                    |
| ------------------------------------------------- | ------------------------------------------------------- |
| `getViewType()`                                   | 返回 `"navigator-view"`                                 |
| `getDisplayText()`                                | 返回 `"任务导航中心"`                                   |
| `getIcon()`                                       | 返回 `"compass"`                                        |
| `onOpen()`                                        | 打开时恢复上次的子视图类型，默认 `"task-dataview-view"` |
| `_startCore(dv, app, storageAdapter, instanceId)` | 调用 `startNavigatorCore` 启动核心逻辑                  |
| `getState()`                                      | 返回 `{ subViewType }` 保存子视图状态                   |
| `setState(state)`                                 | 恢复子视图类型                                          |

## 函数说明

### `startNavigatorCore(dv, app, storageAdapter, instanceId, initialSubView, navigatorView?)`

启动导航核心逻辑，创建完整布局、初始化状态、构建头部和侧边栏、激活初始子视图。

**参数**:

- `dv` (Object): Obsidian Dataview API
- `app` (Object): Obsidian App 实例
- `storageAdapter` (Object): 存储适配器
- `instanceId` (string): 实例 ID
- `initialSubView` (string): 初始子视图类型
- `navigatorView` (NavigatorView, optional): NavigatorView 实例

**返回值**: `Promise<Function>` - cleanup 函数，调用时清理所有资源

---

### `buildHeader()`

构建粘性头部区域（内部函数），包含快捷日期按钮行、控制按钮（含隐藏按钮）、过滤区。每次重新渲染全局 UI 时重建。

---

### `refreshCurrentView()`

刷新当前子视图（内部函数），执行过滤 → 渲染树面板 → 渲染内容面板 → 持久化状态。

---

### `applyNavFilters()`

应用导航层过滤（内部函数），使用指纹缓存避免重复过滤。

**返回值**: `Array` - 过滤后的任务列表

---

### `renderContent(filteredTasks)`

渲染内容面板（内部函数），仅对非自渲染视图生效。

**参数**:

- `filteredTasks` (Array): 过滤后的任务列表

---

### `activateSubView(viewType, force?)`

激活指定子视图（内部函数），切换当前子视图、清理旧视图、加载新视图、刷新过滤和布局。同时更新侧边栏视图切换器高亮状态。

**参数**:

- `viewType` (string): 目标子视图类型
- `force` (boolean, optional): 是否强制切换

## 全局状态

### `NavigatorView._lastViewType`

持久化的子视图类型，通过 `getState()`/`setState()` 由 Obsidian 管理。

### `state` 对象（由 `createInitialState()` 创建）

```
state = {
  dateFilterState: { start, end, isAll },  // 日期过滤
  markFilterState: { statuses, includeMarks, excludeMarks },  // 标记过滤
  hideRepeatTasks: boolean,       // 隐藏重复任务
  hideCompletedTasks: boolean,    // 隐藏已完成任务
  hideCancelledTasks: boolean,    // 隐藏已取消任务
  hideFolders: boolean,           // 隐藏文件夹/根路径过滤
  showTree: boolean,              // 显示树面板
  showFilters: boolean,           // 显示过滤区
  filterRootPath: string|null,    // 树面板根路径过滤
  leftSort: { type, order },      // 左侧排序状态
  activeQuickBtn: DOMElement|null,  // 当前活跃快捷按钮
  quickBtns: DOMElement[],         // 快捷按钮数组
  filterCache: { fingerprint, tasks },  // 过滤缓存
  collapsedNodes: Object,          // 树面板折叠节点
  chartInstances: Object[],        // 图表实例列表
  dataViewStatuses: string[],      // 数据视图状态列表
}
```

## 支持的子视图列表

| 视图类型               | 说明             | 加载方式            |
| ---------------------- | ---------------- | ------------------- |
| `task-dataview-view`   | 数据视图（图表） | 直接调用 drawCharts |
| `matrix-tasks-view`    | 矩阵视图         | startMatrixView     |
| `kanban-task-view`     | 看板视图         | startKanbanView     |
| `important-task-view`  | 重要任务         | 动态 import         |
| `recurring-task-view`  | 循环任务         | 动态 import         |
| `today-task-view`      | 今天任务         | 动态 import         |
| `future-n-task-view`   | 未来15天         | startListBaseView   |
| `future-all-task-view` | 未来所有任务     | startListBaseView   |
| `overdue-task-view`    | 逾期任务         | startListBaseView   |
| `depends-task-view`    | 依赖任务         | 动态 import         |
| `tag-task-view`        | 标签视图         | 动态 import         |
| `inbox-task-view`      | 收集箱           | 动态 import         |
| `timeline-task-view`   | 时间线           | 动态 import         |
| `table-task-view`      | 表格视图         | 动态 import         |
| `calendar-task-view`   | 日历视图         | 动态 import         |
| `gantt-task-view`      | 甘特图           | 动态 import         |
| `organize-task-view`   | 整理箱           | 动态 import         |
| `pomodoro-task-view`   | 番茄钟           | 占位（即将上线）    |
| `tree-task-view`       | 树视图           | 占位（即将上线）    |
| `edit-tasks-view`      | 编辑视图         | 占位（即将上线）    |

## 交互流程

```
startNavigatorCore()
  │
  ├── 清理全局 tooltip
  ├── 创建 sharedSortState / tooltipManager / state / persistence
  │
  ├── 构建布局
  │   ├── outerWithSidebar
  │   ├── sidebar (视图切换)
  │   └── mainArea
  │       └── scrollArea
  │           ├── stickyHeader (快捷日期+控制+排序)
  │           ├── filterWrapper (级联日期+标记过滤)
  │           └── contentLayout
  │               ├── treePanel (左侧树)
  │               └── viewPanel (右侧内容)
  │
  ├── 构建树渲染器 TaskTreeRenderer
  │
  ├── 构建侧边栏 buildViewSwitcher
  │
  ├── 构建头部 buildHeader()
  │   ├── 快捷日期行 (quickRow)
  │   ├── 控制按钮 (buildControlPanel + buildHideButtons)
  │   └── 排序行 (buildSortRow)
  │
  ├── 加载持久化状态 persistence.load()
  │
  └── 激活初始子视图 activateSubView(initialSubView)
      │
      ├── 清理旧视图 (currentSubView.cleanup)
      ├── 根据视图类型切换状态
      │   ├── matrix/kanban/inbox → 限制 statuses 为 todo/planned/in-progress
      │   └── 其他 → 恢复 dataViewStatuses
      ├── 动态 import 加载目标视图
      ├── 刷新过滤和渲染
      └── 更新侧边栏高亮 + 持久化 lastViewType
```

## 自渲染视图列表

以下视图自行管理 viewPanel 内容，不通过 `renderContent()` 渲染：

```
inbox-task-view, important-task-view, recurring-task-view,
today-task-view, future-n-task-view, future-all-task-view,
overdue-task-view, depends-task-view, tag-task-view,
organize-task-view, timeline-task-view, table-task-view,
tree-task-view, calendar-task-view, gantt-task-view,
pomodoro-task-view
```

## 状态持久化策略

`PersistenceManager.save()` 保存以下字段：

- `showFilters`, `showTree` (面板显示开关)
- `hideRepeatTasks`, `hideCompletedTasks`, `hideCancelledTasks`, `hideFolders` (过滤开关)
- `leftSort` (排序偏好)
- `markFilterState` (标记过滤状态)
- `collapsedNodes` (树面板折叠状态)
- `chartScale`, `leftPanelWidth`, `intervalMode` (布局/图表设置)
- `dataViewStatuses` (数据视图状态列表)

不保存运行时临时数据：缓存任务列表、图表实例、快捷按钮 DOM 引用等。

## 条件逻辑

| 条件                          | 行为                                             |
| ----------------------------- | ------------------------------------------------ |
| 过滤条件变化                  | 清空 `filterCache.fingerprint`，下次访问重新过滤 |
| 切换 matrix/kanban/inbox 视图 | 自动限制状态为 `todo/planned/in-progress`        |
| 切换其他视图                  | 恢复 `dataViewStatuses`                          |
| 树面板隐藏                    | `treePanel.style.display = "none"`               |
| 过滤区隐藏                    | `filterWrapper.style.display = "none"`           |
| 重置全部                      | 恢复初始状态并重新构建头部和渲染                 |

## DOM 结构

```
div.navigator-outer-with-sidebar
├── div.navigator-sidebar (左侧边栏)
│   └── 视图切换按钮 (buildViewSwitcher)
│
└── div.navigator-main (flex:1)
    └── div.navigator-scroll-area
        ├── div.header-sticky (粘性头部)
        │   ├── div.quick-row
        │   │   ├── span.filter-label "快捷"
        │   │   └── 快捷日期按钮 (buildQuickDatePanel)
        │   ├── div.section-divider
        │   ├── 控制按钮行 (buildControlPanel + buildHideButtons)
        │   ├── div.section-divider
        │   └── div.sort-row-wrapper
        │       └── 排序按钮 (buildSortRow)
        │
        ├── div.filter-area
        │   ├── 级联日期面板 (buildDateCascadePanel)
        │   ├── div.section-divider
        │   └── 标记过滤面板 (buildMarkFilterPanel)
        │
        └── div.navigator-content-layout
            ├── div.navigator-tree-panel (左侧: 任务树)
            └── div.navigator-view-panel (右侧: 内容视图)
```
