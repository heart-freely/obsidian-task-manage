# 软件(结构)设计说明 (SDD)

## 修订记录

| 版本  | 日期       | 修订内容                                                     |
| ----- | ---------- | ------------------------------------------------------------ |
| 2.0.0 | 2026-05-21 | 初始版本                                                     |
| 2.2.0 | 2026-06-11 | 状态键名修正(planned→scheduled)、新增HideConfig结构、面板架构简化、intervalMode扩展、侧边栏简化、数据层引入DataManager |
| 2.3.0 | 2026-06-27 | 全面更新至当前代码实现：新增EditPanel面板、编辑系统重构（EditStore+BaseTaskEdit+task-editor）、侧边栏SidebarPanel独立文件、所有面板组件完整描述、工具模块补充、文件路径修正 |
|       |            |                                                              |

---

# 引言

## 标识

- **项目名称**：Obsidian Task Manage
- **文档名称**：软件(结构)设计说明 (SDD)
- **版本**：2.3.1
- **更新日期**：2026-06-27

## 系统概述

本插件将 Obsidian 中的任务标记转化为结构化数据，通过19种可视化视图帮助用户管理任务。采用 Store + 组件化 + 方案（Preset）架构：Store 为单一状态源（发布/订阅），Preset 驱动视图配置，Panels 管理器统一控制9个功能面板。业务视图与通用组件完全解耦。

## 文档概述

本文档描述插件的架构决策、模块划分、数据结构、接口定义及详细设计，遵循 CSCI 级设计规范。

## 基线

- Obsidian API ≥ 0.15.0
- TypeScript 5.x + esbuild
- 依赖：Dataview、Obsidian Tasks

# 引用文件

- Obsidian API 文档：https://docs.obsidian.md
- 官方示例插件：https://github.com/obsidianmd/obsidian-sample-plugin
- ECharts 文档：https://echarts.apache.org/
- GB/T 8567-2006 软件文档编制规范
- 项目功能和UI设计文档（任务标记格式、执行状态符号映射、任务标记顺序、共用颜色等常量定义）

# CSCI级设计决策

## 功能描述

系统核心功能：任务数据读取与解析、多视图展示、全局筛选与排序、任务编辑与批量修改、状态持久化。

**功能视图**：待办（InboxView）、重要（ImportantView）、今天（TodayView）、未来（FutureView）、所有任务（AllTasksView）、基础统计图、详细统计图。

**配置面板**（9个功能栏，默认顺序）：

| 键     | 名称     | 核心能力                                         |
| ------ | -------- | ------------------------------------------------ |
| excut  | 筛选状态 | 5种状态多选，主按钮全选/全不选                   |
| search | 筛选描述 | 关键词实时过滤，空格分隔且逻辑，双层输入保护     |
| mark   | 筛选标记 | 优先级/循环/日期/依赖/标签多选                   |
| time   | 筛选时间 | 动态+静态滑动条，三种时间模式，动态↔静态单向联动 |
| view   | 任务视图 | 4组19种视图样式切换                              |
| hide   | 视图隐藏 | 基于HideConfig的状态/优先级/循环/标记隐藏        |
| edit   | 视图编辑 | 批量编辑/补全时间/保存修改/撤回快照              |
| sort   | 视图排序 | 15种排序选项（原始+14种字段）                    |
| config | 视图配置 | 名称/图标、导入导出、恢复默认、删除              |

## 命名规范

| 元素      | 规则       | 示例                     |
| --------- | ---------- | ------------------------ |
| 文件名    | kebab-case | `base-task-view.ts`      |
| 类名      | PascalCase | `BaseTaskView`, `Panels` |
| 函数/变量 | camelCase  | `filterTasks`            |
| CSS类名   | kebab-case | `.task-list`             |

代码风格：TypeScript strict mode，2空格缩进，单引号，必须分号，始终尾逗号。

## 设计原则

1. **数据源分层**：Tasks 格式正则（`TASKS_RX`）解析标记，YAML 属性（`yaName`）用于文件/标题任务属性映射
2. **Store 单一状态源**：发布/订阅模式，`AppState` 包含当前方案、所有方案、侧边栏状态
3. **方案驱动配置**：每个侧边栏按钮对应一个 Preset，保存完整筛选条件、视图样式、面板状态
4. **视图基类统一**：`BaseTaskView` 继承 `BaseTaskEdit`，提供数据获取、筛选、排序、视图切换、分屏布局、编辑入口
5. **组件化复用**：通用视图组件接收数据数组返回 DOM，面板各栏独立封装
6. **筛选状态同步**：`GlobalFilter` 管理筛选条件，`HideConfig` 管理隐藏配置（独立于筛选）
7. **编辑系统分离**：`EditStore` 管理编辑状态，`BaseTaskEdit` 处理编辑交互，`Op` 对象提供标记操作，编辑UI工具在 `util/edit-utils.ts`
8. **状态持久化**：Store 通过 `loadData()/saveData()` 自动保存，整理处快照用 `localStorage`
9. **性能优化**：50ms防抖渲染，`DataManager` 单例缓存+筛选指纹，面板实例 Map 复用，输入聚焦时跳过面板重建

## 全局约束与假设

| 约束项   | 说明                                                         |
| -------- | ------------------------------------------------------------ |
| 运行环境 | Obsidian 0.15.0+，需启用 Dataview 和 Obsidian Tasks 插件     |
| CSS变量  | 假定主题提供 `--font-text`、`--font-ui-small`、`--font-ui-smaller`、`--text-normal`、`--text-muted`、`--background-primary`、`--background-secondary`、`--background-modifier-border`、`--background-modifier-hover`、`--background-modifier-active`、`--interactive-accent`、`--interactive-normal` |
| 浏览器   | Chromium (Electron)，支持 ES2020+、ResizeObserver、CSS Flexbox |
| 移动端   | 当前未充分测试                                               |
| 预设数量 | 通常不超过 20 个，重渲染性能可接受                           |

# CSCI体系结构设计

## 体系结构

```
┌────────────────────────────────────────┐
│              main.ts (入口)             │
│  初始化 Store、注册视图、侧边栏         │
└────────────────┬───────────────────────┘
                 │
┌────────────────▼───────────────────────┐
│           Store (状态层)               │
│  单一数据源，发布/订阅，持久化          │
│  集成 EditStore 编辑状态管理            │
└────────────────┬───────────────────────┘
                 │
┌────────────────▼───────────────────────┐
│           UI 层 (组件化)               │
│  布局(ui.ts) → 面板(panel/)            │
│  → 业务视图(view/)                     │
│  → 通用组件(main/)                     │
└────────────────┬───────────────────────┘
                 │
┌────────────────▼───────────────────────┐
│           数据层 (core/)               │
│  解析器(parser/) → 任务树(task/)       │
│  → 数据管理(data/) → 日期计算(date/)   │
│  → 组件处理(process/)                  │
└────────────────────────────────────────┘
```

## 程序(模块)划分

```yaml
组件:
  名称: Store
  描述: 全局状态管理，发布/订阅，持久化。集成 editStore 编辑状态管理
  接口: [getState, update, updateSilent, subscribe, getActivePreset, setSaveFn, setEditStore, getEditStore, toggleBatchMode, toggleSelectAll, applyEdit, applyAutoComplete, applySortTags, clearPreviews, saveCurrent, revertSnapshot, getSnapshots]
  依赖: [types.ts]

组件:
  名称: Panels
  描述: 面板管理器单例，管理9个功能栏的显隐、排序、高度、复用
  接口: [getInstance, init, syncState, refreshContent, applyVisibility, refreshTimePanel, initPanelSubscriptions, getEditPanel, cleanupAll]
  依赖: [Store, HeadPanel, TimePanel, StatusPanel, SearchPanel, MarkPanel, ViewPanel, HidePanel, EditPanel, SortPanel, PresetPanel]

组件:
  名称: BaseTaskView
  描述: 业务视图基类（继承BaseTaskEdit），防抖渲染(50ms)，分屏布局，19种视图切换，任务跳转
  接口: [render, destroy, renderByStyle, getDefaultFilter, applySort, openTaskAtLine, renderEmpty, renderSplitLayout, toggleTaskTreeNav]
  依赖: [Store, DataManager, EditStore, BaseTaskEdit]

组件:
  名称: DataManager
  描述: 单例数据管理器，加载/缓存/筛选。加载完成后清空文件content字段释放内存
  接口: [getInstance, loadData, getFullTree, getFilteredTree, getFlatNodes, getTaskTimeRange, getTaskIdMap, getNodeByUid, invalidate, invalidateFilterCache]
  依赖: [md-parser, task-tree]

组件:
  名称: TaskCard
  描述: 统一任务卡片，详细/简洁模式，tooltip和点击跳转，编辑模式UI
  接口: [createTaskCard]
  依赖: [task-format, TooltipManager, edit-utils]

组件:
  名称: EditStore
  描述: 编辑状态管理器，管理单/批量编辑模式、预览、保存、快照
  接口: [getState, enterSingleEditMode, enterBatchMode, exitBatchToReading, toggleBatchMode, toggleSelection, toggleSelectAll, applyEdit, applyContentEdit, applyAutoComplete, applySortTags, clearPreviews, saveCurrent, saveSingle, saveAll, revertSingle, revertSnapshot, getSnapshots]
  依赖: [types.ts, task-editor]

组件:
  名称: DateCalc
  描述: 日期计算工具模块，提供ISO周数计算、年份数据缓存、格式化、滑动条联动计算、动态/静态时间处理
  接口: [daysInYear, weeksInYear, isoWeek, dayOfYear, dayToDate, formatYearValue, formatQuarterValue, formatMonthValue, formatWeekValue, formatDayValue, formatDynamicValue, getLevelValues, datesFromLevel, calcDynamicOffset, maxDynamicRange, staticSliderRanges]
  依赖: [date-utils]
```

## 程序(模块)层次结构关系

```
src/
├── main.ts                              # 插件入口
├── type/type.ts                         # 类型定义（AppState, Preset, GlobalFilter, HideConfig, EditState, EditPanelState, TaskData, TaskTreeNode, FileRelations）
├── setting/setting.ts                   # 设置面板（TaskManageSettingTab）
├── core/
│   ├── config/
│   │   ├── config.ts                    # 核心常量（TASK_ELEMENTS, 颜色定义, 状态/优先级/循环/日期/标签映射, 任务文件识别配置与过滤器）
│   │   ├── tasks-config.ts             # Tasks格式定义（状态符号, 标记正则TASKS_RX, 优先级/循环映射）
│   │   └── dataview-config.ts          # Dataview格式定义（inline字段, emoji日期简写）
│   ├── store/
│   │   ├── store.ts                     # Store 类（全局状态管理+编辑面板状态+editStore集成）
│   │   └── preset/
│   │       ├── preset.ts               # 预设管理（增删改激活方案）
│   │       └── panel-preset.ts         # 面板默认配置（getDefaultFilter, getDefaultHideConfig, getDefaultPresets, YEAR_RANGE_OFFSET）
│   ├── edit/
│   │   ├── task-edit-store.ts          # EditStore 编辑状态管理
│   │   ├── base-task-edit.ts           # BaseTaskEdit 编辑交互Mixin
│   │   └── task-editor.ts              # 编辑操作对象Op（标记设置/删除、补全、排序、快照管理、文件写入）
│   ├── data/
│   │   └── data-manager.ts             # DataManager 单例数据管理器
│   ├── date/
│   │   └── date-calc.ts               # 日期计算模块（ISO周数、年份缓存、格式化、滑动条联动、动态/静态时间处理）
│   ├── parser/
│   │   ├── md-parser.ts                # Markdown文件解析器（YAML提取、标题识别、标题YAML块、任务文件加载）
│   │   ├── tasks-parser.ts            # Tasks格式列表任务行解析器
│   │   ├── task-parser.ts             # YAML属性解析器
│   │   └── dataview-parser.ts         # Dataview格式解析器
│   ├── process/
│   │   ├── calendar-view-process.ts   # 日历视图数据处理
│   │   ├── gantt-view-process.ts      # 甘特图数据处理
│   │   └── tree-view-process.ts       # 任务树处理（序号去除、状态统计、排序）
│   ├── task/
│   │   ├── task-tree.ts               # 统一任务树（数据结构、构建、筛选、扁平化、隐藏配置）
│   │   ├── task-derived.ts            # 任务派生数据（标记检测、时间区间、状态/优先级获取）
│   │   ├── task-filter.ts             # 扁平任务筛选
│   │   └── task-format.ts             # 任务格式化（元数据行HTML、tooltip HTML、描述文本）
│   └── command/
│       └── index.ts                    # 命令注册（当前为空）
├── ui/
│   ├── ui.ts                           # ManageView + ViewContainer + createManageLayout
│   ├── sidebar/
│   │   └── sidebar.ts                  # SidebarPanel 侧边栏面板
│   ├── panel/
│   │   ├── panel.ts                    # Panels 面板管理器单例
│   │   ├── head-panel.ts              # HeadPanel 标题栏按钮条
│   │   ├── time-panel.ts             # TimePanel 筛选时间面板
│   │   ├── status-panel.ts           # StatusPanel 筛选状态面板
│   │   ├── search-panel.ts           # SearchPanel 筛选描述面板
│   │   ├── mark-panel.ts             # MarkPanel 筛选标记面板
│   │   ├── view-panel.ts             # ViewPanel 任务视图面板
│   │   ├── hide-panel.ts             # HidePanel 视图隐藏面板
│   │   ├── edit-panel.ts             # EditPanel 编辑面板
│   │   ├── sort-panel.ts             # SortPanel 视图排序面板
│   │   └── preset-panel.ts           # PresetPanel 视图配置面板
│   ├── view/
│   │   ├── base-task-view.ts          # BaseTaskView 业务视图基类（继承BaseTaskEdit）
│   │   ├── all-task-view.ts           # AllTasksView
│   │   ├── inbox-task-view.ts         # InboxView
│   │   ├── important-task-view.ts     # ImportantView
│   │   ├── today-task-view.ts         # TodayView
│   │   └── future-task-view.ts        # FutureView
│   ├── main/
│   │   ├── card/
│   │   │   ├── card.ts                # 统一任务卡片入口+编辑上下文
│   │   │   ├── view-card.ts           # 卡片视图DOM构建
│   │   │   ├── grid-card.ts           # 卡片网格布局
│   │   │   └── group-card.ts          # 分组卡片组件
│   │   ├── list/
│   │   │   ├── list.ts                # 任务列表
│   │   │   ├── status-list.ts         # 状态列表
│   │   │   ├── priority-list.ts       # 优先级列表
│   │   │   ├── recurring-list.ts      # 循环列表
│   │   │   ├── time-list.ts           # 时间列表
│   │   │   ├── timeline-list.ts       # 时间轴列表
│   │   │   ├── tag-list.ts            # 标签列表
│   │   │   ├── uniqueId-list.ts       # 唯一ID列表
│   │   │   ├── depends-list.ts        # 依赖列表
│   │   │   ├── overdue-list.ts        # 逾期列表
│   │   │   └── tree-list.ts           # 任务树列表
│   │   ├── table/
│   │   │   └── table.ts               # 任务表格
│   │   ├── board/
│   │   │   ├── kanban-board.ts        # 看板视图
│   │   │   └── matrix-board.ts        # 矩阵视图
│   │   ├── calendar/
│   │   │   ├── calendar.ts            # 统一日历视图入口
│   │   │   ├── day-calendar.ts        # 日视图委托
│   │   │   ├── week-calendar.ts       # 周视图委托
│   │   │   ├── month-calendar.ts      # 月视图委托
│   │   │   ├── quarter-calendar.ts    # 季视图委托
│   │   │   └── year-calendar.ts       # 年视图委托
│   │   ├── gantt/
│   │   │   └── gantt.ts               # 甘特图视图
│   │   └── chart/
│   │       ├── echart.ts              # ECharts打包导入+全局兼容
│   │       ├── mark-chart.ts          # 标记统计图（6个饼图）
│   │       ├── detail-chart.ts        # 详细统计图（堆叠柱状图）
│   │       └── time-chart.ts          # 时间统计图（占位，待实现）
│   └── component/
│       ├── progress/
│       │   └── progress.ts            # 进度条组件
│       ├── slider/
│       │   └── slider.ts              # 通用双滑块+增强滑动条
│       └── tooltip/
│           └── tooltip.ts             # Tooltip单例管理器
└── util/
    ├── color-utils.ts                  # 颜色工具（主题检测、颜色映射、Canvas叠加转换）
    ├── date-utils.ts                   # 日期工具集（格式化、ISO周数、各时间范围计算）
    ├── dom-utils.ts                    # DOM工具（createEl便捷函数）
    ├── edit-utils.ts                   # 编辑工具（按钮组定义、编辑栏/预览行/复选框DOM构建）
    ├── logger.ts                       # 简易日志工具
    └── performance.ts                  # 性能工具（帧节流）
```

## 执行概念

**面板管理**：`Panels.init()` 创建宿主容器、标题栏、面板容器、拖拽手柄 → `syncState()` 从 Store 读取状态 → `refreshContent()` 根据 `barVisibility` 和 `toolbarOrder` 动态创建/复用面板实例（9个面板组件映射表）→ 拖拽手柄调整高度（[30, 85vh]）或折叠/展开。

**方案切换**：侧边栏点击 → `store.update({ activePresetId })` → `Panels.syncState()` + `ViewContainer.refresh()` → 动态加载业务视图类并渲染。

**数据缓存**：`DataManager.loadData()` 首次加载 → 调用 `loadAllTaskFiles(app)` 获取所有任务文件 → `buildTaskTree(files)` 构建完整树 → 建立ID映射（uid→node 和 id→node）→ 清空文件content释放内存。后续调用直接返回缓存。`getFilteredTree(filter)` 使用筛选指纹缓存。`getFlatNodes(filter)` 自动过滤 `display:false` 和虚拟根节点。

**防抖渲染**：`BaseTaskView.render()` 使用50ms定时器防抖。若前次渲染未执行，取消定时器并返回新Promise等待当前渲染完成。

**编辑系统**：`EditStore` 管理编辑状态 → `BaseTaskEdit` 处理进入/退出编辑、卡片状态切换、全局点击事件 → `createEditBar`/`createPreviewRow`（在 `util/edit-utils.ts`）构建编辑UI → `Op` 对象（在 `core/edit/task-editor.ts`）执行标记操作 → 快照通过 `localStorage` 持久化。

# 全局数据结构说明

## 核心类型定义

### AppState

```typescript
interface AppState {
  activePresetId: string | null;      // 当前激活方案ID
  presets: Preset[];                  // 所有视图方案
  presetGroups: PresetGroup[];        // 方案分组(预留字段，当前未启用)
  sidebarCollapsed: boolean;          // 侧边栏折叠状态
  sidebarWidth: number;               // 侧边栏宽度(默认100)
  editPanelState?: EditPanelState;    // 编辑面板状态
}
```

> `wasViewOpen` 是独立于 AppState 的持久化字段，用于记录插件上次关闭时视图是否打开，在 `main.ts` 中单独读写。

### Preset

```typescript
interface Preset {
  id: string;                         // 唯一标识
  name: string;                       // 视图名称
  groupId: string;                    // 分组ID
  businessView: string;               // 业务视图类型(allTasks/inbox/important/today/future)
  viewStyle: string;                  // 视图样式(19种)
  icon?: string;                      // 侧边栏图标(Emoji)
  filter: GlobalFilter;               // 筛选条件
  hideConfig?: HideConfig;            // 隐藏配置
  sort: { type: string; order: 'asc' | 'desc' };
  toolbarOrder?: string[];            // 面板排序(9个面板键)
  barVisibility?: Record<string, boolean>;  // 面板显隐
  toolbarPanelsCollapsed?: boolean;   // 面板折叠
  toolbarPanelsHeight?: number;       // 面板高度(默认300)
  useDynamic?: boolean;               // 动态时间联动
  intervalMode?: string;              // 时间模式
  taskTreeNavCollapsed?: boolean;     // 任务树导航折叠
  taskTreeNavWidth?: number;          // 任务树导航宽度(默认280)
  tableColumns?: Record<string, boolean>;  // 表格列显隐
}
```

### GlobalFilter

```typescript
interface GlobalFilter {
  dateRange: { start: number | null; end: number | null; isAll: boolean };
  statuses: string[];                 // 筛选的状态列表(空数组=全选)
  includeMarks: string[];             // 包含的标记(空数组=全选)
  excludeMarks: string[];             // 排除的标记
  rootPath: string | null;            // 根路径
  hideFolders?: boolean;              // [已废弃，由HideConfig替代]
  searchText?: string;                // 搜索关键词
  priorityValues?: string[];          // 优先级筛选值(空数组=全选)
  repeatCycles?: string[];            // 循环周期筛选值(空数组=全选)
}
```

### HideConfig

```typescript
interface HideConfig {
  hideStatuses: string[];             // 隐藏的状态
  hidePriorityValues: string[];       // 隐藏的优先级
  hideRepeatCycles: string[];         // 隐藏的循环周期
  hideMarks: string[];                // 隐藏的标记类型
  hideSearchText: string;             // 隐藏的描述关键词
  hideTableColumns: Record<string, boolean>;  // 隐藏的表格列
}
```

### EditState

```typescript
interface EditState {
  editMode: boolean;                  // 是否处于编辑模式
  batchMode: boolean;                 // 是否处于批量编辑模式
  selectedTasks: Set<string>;         // 选中的任务UID集合
  previews: Map<string, string>;      // 预览文本映射(uid → 预览行文本)
  savedTasks: Set<string>;            // 已保存的任务UID集合
  expandedButton: string | null;      // 当前展开的编辑按钮键
}
```

### EditPanelState

```typescript
interface EditPanelState {
  batchMode: boolean;                 // 是否批量模式
  selectedCount: number;              // 选中任务数量
  hasSnapshots: boolean;              // 是否有历史快照
}
```

### TaskData

```typescript
interface TaskData {
  rawLine: string;
  status: 'todo' | 'scheduled' | 'in-progress' | 'completed' | 'cancelled' | 'none';
  content: string;
  priority: number;                   // 0=🔺, 1=⏫, 2=🔼, 3=🔽, 4=⏬, 5=无
  repeat: string;
  created: number | null;
  scheduled: number | null;
  starts: number | null;
  due: number | null;
  done: number | null;
  cancelled: number | null;
  id: string;
  forbid: string;
  tag: string;
}
```

### TaskTreeNode

```typescript
interface TaskTreeNode {
  uid: string;                        // 唯一标识(path:line)
  type: 'file' | 'heading' | 'list';
  path: string; line: number; rawLine: string;
  depth: number; parent: TaskTreeNode | null; children: TaskTreeNode[];
  text: string;
  display: boolean;                   // 是否可见(HideConfig控制)
  match: boolean;                     // 是否匹配面板筛选条件
  status: TaskStatus;
  content: string;
  priority: number;
  repeat: string;
  created: number | null;
  scheduled: number | null;
  starts: number | null;
  due: number | null;
  done: number | null;
  cancelled: number | null;
  id: string;
  forbid: string;
  tag: string;
  headingLevel?: number;              // 标题级别(仅heading类型)
  headingText?: string;               // 标题文本(仅heading类型)
  fileRelations?: FileRelations;      // 文件间关系(仅file类型)
}

interface FileRelations {
  declaredParentName: string | null;
  declaredParent: TaskTreeNode | null;
  declaredChildren: TaskTreeNode[];
  linkedChildrenNames: string[];
  linkedChildren: TaskTreeNode[];
  linkedParents: TaskTreeNode[];
  conflict: 'meta_mismatch' | 'meta_missing' | 'link_missing' | null;
  missingLinks: string[];
}
```

## 常量

任务标记格式、执行状态符号映射、任务标记顺序等完整定义详见《项目功能和UI设计文档》。

### TASK_ELEMENTS 结构

插件采用统一的 `TASK_ELEMENTS` 对象定义所有任务元素（在 `core/config/config.ts`），每个元素包含 `key`、`zhName`/`enName`、`icon`、`inMarkSequence`、`yaName` 等属性。各子元素还包含深色/浅色主题颜色定义。

**状态子项**（5+1种）：`none`(无状态), `todo`(待办中, 🔲), `scheduled`(计划中, ❔), `in-progress`(进行中, ⏩), `cancelled`(已取消, ❎), `completed`(已完成, ✅)

**优先级子项**（5种）：`🔺`(最高), `⏫`(高), `🔼`(中), `🔽`(低), `⏬`(最低)

**循环子项**（4种）：`every day`(每天), `every week`(每周), `every month`(每月), `every year`(每年)

**日期标记**（6种）：`created`(➕), `scheduled`(⏳), `starts`(🛫), `cancelled`(❌), `done`(✅), `due`(📅)

**其他标记**（3种）：`tag`(🏁), `id`(🆔), `forbid`(⛔)

### 状态颜色

通过 `getStatusColors()` 动态获取当前主题状态颜色：

| 状态        | 深色主题                  | 浅色主题    |
| ----------- | ------------------------- | ----------- |
| none        | transparent               | transparent |
| todo        | rgba(85, 90, 100, 0.75)   | #6b7280     |
| scheduled   | rgba(105, 125, 170, 0.75) | #6b7ea8     |
| in-progress | rgba(80, 140, 210, 0.80)  | #3b82c4     |
| cancelled   | rgba(175, 62, 68, 0.70)   | #d14343     |
| completed   | rgba(80, 150, 120, 0.75)  | #4a8c6a     |

### 排序差异标注

- **StatusList 排序**：`todo→scheduled→in-progress→cancelled→completed`（已取消在已完成之前）
- **ProgressBar 段顺序**：`todo→scheduled→in-progress→completed→cancelled`（已完成在已取消之前）

## 变量

| 变量                   | 类型     | 默认值                                              | 说明                                              |
| ---------------------- | -------- | --------------------------------------------------- | ------------------------------------------------- |
| sidebarCollapsed       | boolean  | false                                               | 侧边栏折叠                                        |
| sidebarWidth           | number   | 100                                                 | 侧边栏宽度(px)                                    |
| toolbarPanelsCollapsed | boolean  | false                                               | 面板折叠                                          |
| toolbarPanelsHeight    | number   | 300                                                 | 面板高度(px)                                      |
| intervalMode           | string   | 各预设覆盖为特定值                                  | 时间模式(any-date/scheduled-due/starts-done/none) |
| presets                | Preset[] | 见 `core/store/preset/panel-preset.ts`              | 方案列表（5个默认预设）                           |
| toolbarOrder           | string[] | [excut,search,mark,time,view,hide,edit,sort,config] | 面板排序（9个面板）                               |
| taskTreeNavCollapsed   | boolean  | true                                                | 任务树导航折叠                                    |
| taskTreeNavWidth       | number   | 280                                                 | 任务树导航宽度(px)                                |

# 接口设计

## Store

| 方法                                                         | 说明                           |
| ------------------------------------------------------------ | ------------------------------ |
| `getState(): AppState`                                       | 获取全局状态（只读）           |
| `update(partial: Partial<AppState>): void`                   | 更新状态并通知订阅者+持久化    |
| `updateSilent(partial: Partial<AppState>): void`             | 更新状态不通知不持久化         |
| `saveSilent(): void`                                         | 手动触发持久化                 |
| `subscribe(listener: Listener): () => void`                  | 订阅状态变化，返回取消订阅函数 |
| `getActivePreset(): Preset \| undefined`                     | 获取当前激活方案               |
| `setSaveFn(fn): void`                                        | 设置持久化回调                 |
| `updateEditPanelState(panelState: EditPanelState): void`     | 静默更新编辑面板状态           |
| `setEditStore(es): void` / `getEditStore(): any`             | 编辑状态管理                   |
| `toggleBatchMode()` / `toggleSelectAll(nodes)`               | 编辑操作代理                   |
| `applyEdit(markKey, value)` / `applyAutoComplete(days)` / `applySortTags()` | 编辑操作代理                   |
| `saveCurrent()` / `revertSnapshot(index)` / `getSnapshots()` | 保存/撤回代理                  |

## Panels

| 方法                                        | 说明                                                         |
| ------------------------------------------- | ------------------------------------------------------------ |
| `getInstance(): Panels`                     | 获取单例                                                     |
| `init(store, viewEl, container, app): void` | 初始化面板管理器（创建宿主、标题栏、面板容器、拖拽手柄、样式注入） |
| `syncState(): void`                         | 从Store同步面板状态（预设切换时保存的时间面板状态）          |
| `refreshContent(): void`                    | 刷新面板内容（复用缓存实例，输入聚焦时跳过重建）             |
| `applyVisibility(): void`                   | 应用面板折叠/展开                                            |
| `refreshTimePanel(): void`                  | 刷新时间面板（恢复默认时调用）                               |
| `initPanelSubscriptions(): void`            | 初始化面板订阅                                               |
| `getEditPanel(): EditPanel \| undefined`    | 获取编辑面板实例                                             |
| `cleanupAll(): void`                        | 清理所有资源                                                 |

## BaseTaskView

| 方法                                                         | 说明                                           |
| ------------------------------------------------------------ | ---------------------------------------------- |
| `render(): Promise<void>`                                    | 渲染视图(50ms防抖，取消前次未执行渲染)         |
| `destroy(): void`                                            | 销毁视图（清理订阅、定时器、事件、甘特图实例） |
| `renderByStyle(container, nodes, style, filter, intervalMode, tree?, sort?): void` | 按19种视图样式渲染                             |
| `getDefaultFilter(): GlobalFilter`                           | 获取默认筛选（子类可覆写）                     |
| `applySort(nodes, sort): TaskTreeNode[]`                     | 应用排序(空值排最后，支持15种字段)             |
| `openTaskAtLine(node): void`                                 | 打开文件并跳转到任务行（带重试滚动）           |
| `renderEmpty(): void`                                        | 渲染空状态（子类可覆写）                       |
| `renderSplitLayout(tree, style, filter, intervalMode, sort, sortedNodes): void` | 渲染分屏布局（左侧任务树导航+右侧内容区）      |
| `toggleTaskTreeNav(collapsed): void`                         | 切换任务树导航折叠状态                         |

## DataManager

| 方法                                                | 说明                                                    |
| --------------------------------------------------- | ------------------------------------------------------- |
| `getInstance(): DataManager`                        | 获取单例                                                |
| `loadData(app): Promise<{files, nodes, taskIdMap}>` | 加载任务数据(首次后返回缓存，加载完成后清空文件content) |
| `getFullTree(): TaskTreeNode`                       | 获取完整任务树                                          |
| `getFilteredTree(filter): TaskTreeNode`             | 获取筛选后的树(筛选指纹缓存)                            |
| `getFlatNodes(filter): TaskTreeNode[]`              | 获取扁平化筛选结果(过滤display:false和虚拟根节点)       |
| `getTaskTimeRange(): {minTime, maxTime}`            | 获取任务时间范围                                        |
| `getTaskIdMap(): Map<string, TaskTreeNode>`         | 获取任务ID映射(uid→node 和 id→node)                     |
| `getNodeByUid(uid): TaskTreeNode \| undefined`      | 根据uid查找任务节点                                     |
| `invalidate(): void`                                | 清除全部缓存                                            |
| `invalidateFilterCache(): void`                     | 清除筛选缓存                                            |

## EditStore

| 方法                                                         | 说明                 |
| ------------------------------------------------------------ | -------------------- |
| `getState(): EditState`                                      | 获取编辑状态         |
| `enterSingleEditMode(node)` / `enterBatchMode()` / `enterBatchModeFromSingle(node)` | 进入各种编辑模式     |
| `exitBatchToReading()` / `exitEditMode(save?, keepSelection?)` | 退出编辑模式         |
| `toggleBatchMode()`                                          | 切换批量编辑模式     |
| `toggleSelection(node)` / `toggleSelectAll(nodes)`           | 切换任务选择         |
| `toggleExpandedButton(buttonKey)`                            | 切换编辑按钮展开状态 |
| `applyEdit(markKey, value)` / `applyContentEdit(node, newContent)` | 应用编辑操作         |
| `applyAutoComplete(days)` / `applySortTags()` / `clearPreviews()` | 批量操作             |
| `saveCurrent()` / `saveSingle(node)` / `saveAll()`           | 保存操作             |
| `revertSingle(node)` / `revertSnapshot(index)`               | 撤回操作             |
| `getSnapshots()`                                             | 获取快照列表         |
| `subscribePanel(listener)`                                   | 订阅面板更新         |

## DateCalc

| 方法                                                         | 说明                         |
| ------------------------------------------------------------ | ---------------------------- |
| `daysInYear(y): number`                                      | 获取某年天数（缓存）         |
| `weeksInYear(y): number`                                     | 获取某年周数（缓存）         |
| `isoWeek(d): number`                                         | 计算ISO周数                  |
| `dayOfYear(d): number`                                       | 计算年中第几天               |
| `dayToDate(y, d): Date`                                      | 年中第几天转日期             |
| `formatYearValue/QuarterValue/MonthValue/WeekValue/DayValue(x, baseYear?): string` | 格式化各时间级别             |
| `formatDynamicValue(v, unit): string`                        | 格式化动态滑动条值           |
| `getLevelValues(startDate, endDate, minYear?): {...}`        | 计算各时间级别起止值         |
| `datesFromLevel(lv, sv, ev, dynamicUnit?, baseYear?): {startDate, endDate}` | 根据级别和值计算日期范围     |
| `calcDynamicOffset(date, unit): number`                      | 计算日期相对于今天的动态偏移 |
| `maxDynamicRange(unit): number`                              | 计算动态范围最大值           |
| `staticSliderRanges(startDate, endDate, taskMinYear, taskMaxYear): {...}` | 计算静态滑动条范围           |

## 通用组件接口

| 组件          | 函数签名                                                     |
| ------------- | ------------------------------------------------------------ |
| TaskCard      | `createTaskCard(node: TaskTreeNode, options?: TaskCardOptions): HTMLElement` |
| TaskList      | `renderTaskList(container: HTMLElement, tasks: TaskTreeNode[], options?: TaskListOptions): void` |
| TaskTable     | `renderTaskTable(container, tasks, options?): void`          |
| GroupCard     | `createGroupCard(options: GroupCardOptions): HTMLElement`    |
| GridCard      | `renderCards(container, nodes, options?): void`              |
| ProgressBar   | `createProgressBar(options: ProgressBarOptions): HTMLElement` |
| TaskTree      | `renderTaskTree(container, options: TreeListOptions): void`  |
| Calendar      | `renderCalendarView(container, nodes, options?): void`       |
| Gantt         | `renderGanttWithTree(container, treeRoot, options?): { taskMap, redraw, destroy }` |
| Kanban        | `renderKanban(container, nodes): void`                       |
| Matrix        | `renderMatrix(container, nodes): void`                       |
| StatusList    | `renderStatus(container, nodes, options?): void`             |
| PriorityList  | `renderPriority(container, nodes, options?): void`           |
| RecurringList | `renderRecurring(container, nodes, options?): void`          |
| TimeList      | `renderTimeList(container, nodes, options?): void`           |
| TimelineList  | `renderTimeline(container, nodes, options?): void`           |
| TagList       | `renderTag(container, nodes, options?): void`                |
| UniqueIdList  | `renderUniqueId(container, nodes, options?): void`           |
| DependsList   | `renderDepends(container, nodes, options?): void`            |
| OverdueList   | `renderOverdueList(container, nodes, options?): void`        |
| MarkChart     | `renderMarkChart(container, nodes): void`                    |
| DetailChart   | `renderDetail(container, nodes, options?): void`             |
| TimeChart     | `renderTimeChart(container, nodes): void`                    |
| Tooltip       | `tooltip.show(html, x, y)` / `move(x, y)` / `hide()`         |
| Slider        | `createSlider(options): {refs, update, destroy}` / `createEnhancedSlider(options): {refs, updateMidLine, updateLabel}` |
| EditBar       | `createEditBar(node, options): HTMLElement`                  |
| PreviewRow    | `createPreviewRow(previewText, saved, onSave?, onRevert?, hasEdits?, onRestore?): HTMLElement` |
| Checkbox      | `createCheckbox(checked, onChange): HTMLElement`             |

# CSCI详细设计

## 公共UI规范

以下规范适用于所有功能面板和通用视图组件，各模块不再重复声明。

### 按钮

| 属性      | 标准按钮                                              | 子按钮                 |
| --------- | ----------------------------------------------------- | ---------------------- |
| 内边距    | 3px 6px                                               | 2px 5px                |
| 字体      | var(--font-text) / var(--font-ui-small)               | var(--font-ui-smaller) |
| 行高      | var(--line-height-normal)                             | —                      |
| 圆角      | 16px                                                  | 12px                   |
| 背景/激活 | var(--interactive-normal) / var(--interactive-accent) | 同                     |
| 外边距    | 2px 4px 2px 0                                         | —                      |
| 显示      | inline-flex; align-items:center                       | 同                     |

### 说明文字（标签）

| 属性   | 值                                                           |
| ------ | ------------------------------------------------------------ |
| 宽度   | 4em                                                          |
| 字体   | var(--font-text) / var(--font-ui-small) / normal             |
| 颜色   | var(--text-normal)                                           |
| 对齐   | text-align:justify; text-align-last:justify; text-justify:inter-character |
| 外边距 | 右侧6px，其余0；无内边距/边框                                |

### 行容器

```
display:flex; align-items:center; justify-content:flex-start; margin-bottom:4px; flex-wrap:wrap
```

### 面板容器

| 属性      | 值                                                           |
| --------- | ------------------------------------------------------------ |
| 定位      | 面板容器 relative, z-index:49；宿主 absolute, z-index:50, pointer-events:auto |
| 背景      | var(--background-primary)                                    |
| 边框/圆角 | 1px solid var(--background-modifier-border) / 6px            |
| 阴影      | 0 4px 8px rgba(0,0,0,0.1)                                    |
| 溢出      | overflow-y:auto; overflow-x:hidden                           |
| 高度      | 默认300px，拖拽调整[30, 85vh]                                |

### 任务卡片

| 模式 | 属性                                                         |
| ---- | ------------------------------------------------------------ |
| 详细 | 内边距8px 10px, 圆角8px, 左侧3px solid statusColor, 描述行font-weight:500, 编辑栏margin-top:4px |
| 简洁 | 边框none, 背景transparent, 内边距1px 0, 描述行font-weight:normal+nowrap, 编辑栏display:none |

### 分组卡片

| 属性       | 值                                                           |
| ---------- | ------------------------------------------------------------ |
| 背景/边框  | var(--background-primary) / 1px solid border                 |
| 圆角/阴影  | 8px / 0 1px 4px rgba(0,0,0,0.08)                             |
| 左侧颜色条 | 4px solid (按分组类型)                                       |
| 标题栏     | padding 8px 12px, flex, justify-content:flex-start, 底边框1px |

---

## 布局与视图管理

### ManageView / ViewContainer

| 属性      | 值                         |
| --------- | -------------------------- |
| 标识符    | `ui.ui`                    |
| 文件      | `src/ui/ui.ts`             |
| Store操作 | 读 activePresetId, presets |

**功能**：插件主视图入口。`ManageView` 继承 `ItemView`，注册为 `manage-view` 类型（图标 `list-checks`，显示名"任务管理"）。`onOpen()` 时隐藏 Obsidian 原生 view-header，调用 `createManageLayout()` 创建三栏布局：侧边栏(`SidebarPanel`) + 面板区域(`Panels`) + 视图区域(`ViewContainer`)。`onClose()` 时调用清理函数。

**视图加载**：`ViewContainer` 监听 Store，根据 `preset.businessView` 通过 `VIEW_LOADERS` 动态导入对应视图类：

| businessView | 视图类        | 文件                          |
| ------------ | ------------- | ----------------------------- |
| allTasks     | AllTasksView  | `view/all-task-view.ts`       |
| inbox        | InboxView     | `view/inbox-task-view.ts`     |
| important    | ImportantView | `view/important-task-view.ts` |
| today        | TodayView     | `view/today-task-view.ts`     |
| future       | FutureView    | `view/future-task-view.ts`    |

**布局创建**：`createManageLayout(container, store, app)` 创建三栏结构并返回清理函数。初始化 Panels 单例，在 `requestAnimationFrame` 中调用 `syncState()`。

### Panels（面板管理器）

| 属性      | 值                                                           |
| --------- | ------------------------------------------------------------ |
| 标识符    | `ui.panel.panel`                                             |
| 文件      | `src/ui/panel/panel.ts`                                      |
| 类型      | 单例                                                         |
| Store操作 | 读 toolbarPanelsCollapsed, toolbarPanelsHeight, toolbarOrder, barVisibility |

**功能**：管理所有功能面板的容器、显隐、排序、高度。面板实例通过 `Map<string, any>` 缓存，切换预设时复用。检测输入框聚焦状态，若聚焦则跳过面板内容重建以保护用户输入。

**面板组件映射表**：

| 键     | 组件类      |
| ------ | ----------- |
| config | PresetPanel |
| time   | TimePanel   |
| excut  | StatusPanel |
| search | SearchPanel |
| mark   | MarkPanel   |
| view   | ViewPanel   |
| sort   | SortPanel   |
| hide   | HidePanel   |
| edit   | EditPanel   |

**初始化流程**：`init()` → 创建 panelHost(absolute定位) → 创建 buttonBarEl(标题栏) → 初始化 HeadPanel → 创建 panelsContainer(relative定位, 默认隐藏) → 创建 panelContentInner(标题栏+面板容器) → 创建 resizeHandle(拖拽手柄, 8px高, 始终可见) → 注入公共样式(injectStyles) → 订阅Store → requestAnimationFrame中调用 syncState()。

**面板复用算法**：

```
refreshContent():
  1. 计算 visibleKeys = toolbarOrder.filter(key => barVisibility[key])
  2. 若存在输入框聚焦(activeElement为INPUT/TEXTAREA/isContentEditable)，跳过重建
  3. 遍历 panelEls(Map)，移除不在 visibleKeys 中的面板DOM，销毁Bar实例，从Map删除
  4. 遍历 visibleKeys：
     a. 若 panelEls 已有对应面板 → 保持不动(Bar组件通过自身store.subscribe更新)
     b. 若缺失 → 创建新div(className="panel-content")，加入panelsContainer，存入panelEls
     c. 实例化对应Bar组件(new PANEL_COMPONENTS[key](panel, store, app))，存入panelInstances
  5. 按 toolbarOrder 重排面板DOM顺序(buttonBarEl保持在第一位)
```

**高度调整算法**：

```
mousedown → 记录 startY, startHeight, dragging=true
mousemove → dy = clientY - startY; newHeight = clamp(startHeight + dy, 30, window.innerHeight*0.85)
           更新 panelsContainer.style.height; updateViewPadding()
mouseup → updatePreset({ toolbarPanelsHeight: newHeight }); dragging=false
```

**拖拽手柄**：高度8px，始终可见，背景 `rgba(128,128,128,0.4)`，悬停显示（opacity:1），默认半透明（opacity:0）。包含箭头(▲/▼)，点击切换折叠。面板折叠时容器 `display:none`，内容区 `paddingTop=8px`；展开时 `paddingTop=面板高度+8px`。

**样式注入**：`injectStyles()` 注入公共UI样式到文档头部，选择器带 `.panel-btn`、`.panel-label`、`.panel-row` 等前缀实现作用域隔离。

### HeadPanel（标题栏）

| 属性      | 值                                                           |
| --------- | ------------------------------------------------------------ |
| 标识符    | `ui.panel.head-panel`                                        |
| 文件      | `src/ui/panel/head-panel.ts`                                 |
| Store操作 | 读 toolbarOrder, barVisibility; 写 barVisibility, toolbarOrder |

**功能**：渲染可拖拽排序的标题按钮条。每个按钮：文字标签(`panel-header-label`) + 眼睛图标(`panel-eye`，可见时opacity:1，隐藏时opacity:0.4)。

**按钮标签映射**：

| 键     | 标签     |
| ------ | -------- |
| time   | 筛选时间 |
| excut  | 筛选状态 |
| search | 筛选描述 |
| mark   | 筛选标记 |
| view   | 任务视图 |
| hide   | 视图隐藏 |
| edit   | 视图编辑 |
| sort   | 视图排序 |
| config | 视图配置 |

**眼睛按钮算法**：

```
点击 barKey 的眼睛图标:
  1. dispatchEvent(new CustomEvent('panel-expand')) — 确保面板展开
  2. 读取当前 barVisibility，反转 barVisibility[barKey]
  3. updatePreset({ barVisibility: newVisibility })
  4. syncState() → refreshContent() 移除或新建对应面板
```

**拖拽排序算法**：

```
dragstart: 记录 draggedKey = barKey
dragover: e.preventDefault(); 添加 drag-over 样式
drop:
  1. 若 draggedKey === barKey，结束
  2. 获取当前 toolbarOrder，查找 fromIndex 和 toIndex
  3. 从 toolbarOrder 移除 fromIndex 元素，插入到 toIndex
  4. updatePreset({ toolbarOrder: newOrder })
```

**按钮样式**：flex-shrink:0, gap:4px, padding:4px 8px, border-radius:6px, 激活时 `var(--background-modifier-active)`, 拖拽时 cursor:grab。

## 侧边栏

| 属性      | 值                                                           |
| --------- | ------------------------------------------------------------ |
| 标识符    | `ui.sidebar.sidebar`                                         |
| 文件      | `src/ui/sidebar/sidebar.ts`                                  |
| Store操作 | 读 presets, activePresetId, sidebarCollapsed, sidebarWidth; 写 sidebarCollapsed, sidebarWidth, activePresetId, presets |

**功能**：视图方案导航面板。折叠时宽40px仅显示Emoji（或名称首字符），展开时显示 `emoji + 文字` 的完整按钮。顶部仅保留折叠/展开按钮(◀/▶)。底部提供新建按钮(➕)，以all-tasks预设为模板创建新方案。

**折叠/展开算法**：

```
点击折叠/展开按钮:
  1. 反转 sidebarCollapsed
  2. 若折叠: sidebarWidth = 40
  3. 若展开: 调用 adjustSidebarWidth() 自适应计算
  4. store.update({ sidebarCollapsed, sidebarWidth })
```

**宽度自适应算法**：

```
adjustSidebarWidth():
  1. 查询所有 .preset-btn 元素
  2. 遍历按钮: 重置 width=auto, box-sizing=border-box, padding=4px 6px
  3. 取最大 offsetWidth 作为统一按钮宽度
  4. 将所有按钮宽度设为该最大值; 容器 paddingRight=0
  5. 新宽度 = 最大宽度 + 4(左内边距)
  6. 若 |lastSidebarWidth - 新宽度| > 1px: 更新容器宽度, 记录 lastSidebarWidth
```

**新建视图算法**：

```
点击新建按钮:
  1. 查找 all-tasks 预设作为模板
  2. 生成唯一ID(时间戳)
  3. 创建新Preset(继承模板配置, name="新视图", icon="📋")
  4. presets.push(newPreset); activePresetId = newPreset.id
  5. store.update({ presets, activePresetId })
```

**特有约束**：假定预设数量不超过20个。

## 功能面板

各功能面板遵循统一模式：构造函数 `(container, store, app?)`，订阅Store自动重渲染，通过 `store.getActivePreset()` 读取配置，`store.update()` 写入变更。

### TimePanel（筛选时间）

| 属性      | 值                                                           |
| --------- | ------------------------------------------------------------ |
| 标识符    | `ui.panel.time-panel`                                        |
| 文件      | `src/ui/panel/time-panel.ts`                                 |
| Store操作 | 读 filter.dateRange, intervalMode, useDynamic; 写 filter.dateRange, intervalMode, useDynamic |

**功能**：提供动态时间滑动条和静态时间滑动条，支持三种时间计算模式。

**数据模型**：

| 变量                          | 用途                                                        |
| ----------------------------- | ----------------------------------------------------------- |
| dynamicStart/End              | 动态滑动条值(相对今天的偏移)                                |
| dynamicUnit                   | 动态单位(day/week/month/quarter/year)                       |
| staticStart/End               | 静态滑动条值(绝对日期)，同步到 filter.dateRange             |
| useDynamic                    | true时动态→静态单向同步                                     |
| intervalMode                  | "any-date"(默认) / "scheduled-due" / "starts-done" / "none" |
| currentMinYear/MaxYear        | 静态滑动条基准年份                                          |
| childSlidersDrivenByYear      | true时下级滑块由年级别驱动                                  |
| savedStaticStart/End          | 取消"使用动态"时恢复的静态状态                              |
| savedCurrentMinYear/MaxYear   | 取消"使用动态"时恢复的年份范围                              |
| savedChildSlidersDrivenByYear | 取消"使用动态"时恢复的驱动模式                              |

**联动矩阵**：

| 场景                       | 动态→静态                       | 静态→动态 |
| -------------------------- | ------------------------------- | --------- |
| useDynamic=true + 拖动动态 | ✅ 同步                          | —         |
| useDynamic=true + 拖动静态 | —                               | ❌ 不影响  |
| useDynamic=false           | ❌ 不影响                        | ❌ 不影响  |
| 点击"使用动态"按钮         | ✅ 同步（保存静态状态）          | —         |
| 取消"使用动态"按钮         | 恢复saved状态(无则回退今年全年) | ❌ 不影响  |

**时间计算模式**：

| 模式          | 起始字段           | 结束字段           | 说明                                                     |
| ------------- | ------------------ | ------------------ | -------------------------------------------------------- |
| any-date      | 所有日期字段最小值 | 所有日期字段最大值 | 默认。日历图/甘特图 `intervalMode="none"` 时回退到此模式 |
| scheduled-due | scheduled          | due                | 无due回退到done                                          |
| starts-done   | starts             | done               | 无done回退到cancelled, 再回退到due                       |
| none          | —                  | —                  | 不做时间筛选，不更新filter.dateRange                     |

**跨天检测**：每60秒定时检查 + 监听 `active-leaf-change` 和 `layout-change` 事件（通过 `app.workspace.on`）。使用 `requestAnimationFrame` 防抖。检测到日期跨天后自动更新"今天"标记位置和所有静态滑动条的刻度标记。

**动态滑动条**：日/周/月/季不允许跨年，年允许跨年(前后5年)。中点标记(偏移0)用强调色标记。说明文字："本日/周/月/季/年"（偏移0），"前/后N日/周/月/季/年"（非0）。文字宽度160px不换行。默认两个手柄在"本日"重合。

**静态滑动条**：年固定为当前年±10。同年时季/月/周/日为全范围，跨年时累加各年份单位总数。格式化使用while循环逐年减去单位数。拖动任一级别后所有级别同步刷新（通过 `rebuildStaticSliders` 重建所有滑块）。

**布局**：

```
时间筛选  [时间模式] [任意时间] [计划时间] [执行时间]
动态时间   年 季 月 周 日 [使用动态]
          [========||========] 本日~后3天
静态时间
  年      [========||========] 2021~2031
  季      [========||========] 2季~4季
  月      [========||========] 5月~12月
  周      [========||========] 22周~53周
  日      [========||========] 2026/5/31日~2026/12/31日
```

**特有约束**：`onPresetChanged()` 在预设切换时由 Panels 调用。初始化时异步加载数据获取任务时间范围。滑动条组件通过 `createEnhancedSlider` 创建，存储引用到 `enhancedSliders` Map 和 `updateMidLines` Map。

### StatusPanel（筛选状态）

| 属性      | 值                                     |
| --------- | -------------------------------------- |
| 标识符    | `ui.panel.status-panel`                |
| 文件      | `src/ui/panel/status-panel.ts`         |
| Store操作 | 读 filter.statuses; 写 filter.statuses |

**功能**：按5种执行状态多选筛选。主按钮"状态"控制全选/全不选（全选=空数组），子按钮依次为：待办中/计划中/进行中/已完成/已取消。选中高亮，逻辑为"或"。面板按钮使用独立的 `PANEL_STATUS_LABELS` 映射覆盖显示文字。

**按钮布局**：

```
筛选状态  [状态] [待办中] [计划中] [进行中] [已完成] [已取消]
```

**状态键名**：统一使用 `scheduled` 作为"计划中"状态键名。

### SearchPanel（筛选描述）

| 属性      | 值                                         |
| --------- | ------------------------------------------ |
| 标识符    | `ui.panel.search-panel`                    |
| 文件      | `src/ui/panel/search-panel.ts`             |
| Store操作 | 读 filter.searchText; 写 filter.searchText |

**功能**：文本输入框，placeholder"输入关键词匹配筛选任务，多个关键词用空格分隔，回车搜索"。支持多段关键字（空格分隔），逻辑为"且"。

**输入保护（双层）**：

1. **值缓存**：维护 `currentValue` 保存用户输入。Store 触发重渲染时若已有输入框，仅同步 value 不重建 DOM
2. **聚焦检测**：Panels 检测输入框聚焦状态，若聚焦则跳过整个面板内容重建

**搜索触发**：Enter键或blur事件触发搜索，延迟300ms防抖。

### MarkPanel（筛选标记）

| 属性      | 值                                                           |
| --------- | ------------------------------------------------------------ |
| 标识符    | `ui.panel.mark-panel`                                        |
| 文件      | `src/ui/panel/mark-panel.ts`                                 |
| Store操作 | 读 filter.priorityValues, filter.repeatCycles, filter.includeMarks; 写同 |

**功能**：按标记类型筛选，5组。默认全选（空数组=不过滤）。

**分组与按钮排列**：

| 行标签   | 按钮                                                    |
| -------- | ------------------------------------------------------- |
| 筛选优先 | 主按钮"优先级" + 🔺⏫🔼🔽⏬（逆序排列）                      |
| 筛选循环 | 主按钮"循环" + 🔁 every day/week/month/year              |
| 筛选时间 | 创建/计划/开始/取消/完成/截止（多选，includeMarks控制） |
| 筛选依赖 | 唯一ID/引用ID（多选，includeMarks控制）                 |
| 筛选标签 | 标签（includeMarks控制）                                |

**优先级组和循环组**：主按钮控制子按钮全选/全不选。任意子项选中→主按钮高亮，所有子项取消→主按钮取消高亮。子按钮始终可见。

### ViewPanel（任务视图）

| 属性      | 值                           |
| --------- | ---------------------------- |
| 标识符    | `ui.panel.view-panel`        |
| 文件      | `src/ui/panel/view-panel.ts` |
| Store操作 | 读 viewStyle; 写 viewStyle   |

**功能**：切换19种视图样式，多选一。分4组，每组有独立标签：

| 组       | 标签     | 视图列表                                                     |
| -------- | -------- | ------------------------------------------------------------ |
| 基础视图 | 基础视图 | 列表(list)、卡片(cards)、表格(table)                         |
| 标记视图 | 标记视图 | 状态(status)、优先级(priority)、循环(recurring)、日期(time)、标签(tag)、唯一ID(uniqueId)、引用ID(depends) |
| 管理视图 | 管理视图 | 看板(kanban)、矩阵(matrix)、逾期(overdue)、时间轴(timeline)、日历图(calendar)、任务树(tree)、甘特图(gantt) |
| 统计视图 | 统计视图 | 标记统计(mark)、时间统计(timeChart)、详细统计(detail)        |

当前激活视图按钮高亮（`active`类）。按钮仅显示文字，无emoji。

### HidePanel（视图隐藏）

| 属性      | 值                           |
| --------- | ---------------------------- |
| 标识符    | `ui.panel.hide-panel`        |
| 文件      | `src/ui/panel/hide-panel.ts` |
| Store操作 | 读 hideConfig; 写 hideConfig |

**功能**：基于 `HideConfig` 控制任务显隐，7组。隐藏状态下按钮高亮。

**分组与按钮排列**：

| 行标签   | 按钮                                                 |
| -------- | ---------------------------------------------------- |
| 隐藏状态 | 主按钮"状态" + 待办中/计划中/进行中/已完成/已取消    |
| 隐藏描述 | 文本输入框（placeholder"输入关键词匹配隐藏任务..."） |
| 隐藏优先 | 主按钮"优先级" + 🔺⏫🔼🔽⏬                               |
| 隐藏循环 | 主按钮"循环" + 🔁 every day/week/month/year           |
| 隐藏时间 | 主按钮"时间" + 创建/计划/开始/取消/完成/截止         |
| 隐藏依赖 | 主按钮"依赖" + 唯一ID/引用ID                         |
| 隐藏标签 | 标签（单选）                                         |

各组主按钮控制对应子按钮全选/全不选，行为与MarkPanel相同。

### EditPanel（视图编辑）

| 属性      | 值                           |
| --------- | ---------------------------- |
| 标识符    | `ui.panel.edit-panel`        |
| 文件      | `src/ui/panel/edit-panel.ts` |
| Store操作 | 通过Store代理操作EditStore   |

**功能**：管理批量编辑操作。`render()` 从 EditStore 读取当前状态构建UI。

**行1：批量编辑**：

| 按钮/控件                   | 可用条件            | 说明                                     |
| --------------------------- | ------------------- | ---------------------------------------- |
| 批量编辑按钮                | 始终可用            | 切换批量编辑模式，批量模式下高亮(active) |
| 全选/全不选                 | 批量模式            | 切换全选状态，按钮文字动态变化           |
| 任务时长输入框(type=number) | 批量模式+有勾选任务 | 默认值"0"，宽度48px                      |
| "天"标签                    | 同上                | 时长单位说明                             |
| 补全时间按钮                | 批量模式+有勾选任务 | 调用 `store.applyAutoComplete(days)`     |
| 清空预览按钮                | 批量模式+有勾选任务 | 调用 `store.clearPreviews()`             |
| 保存修改按钮                | 批量模式+有勾选任务 | 调用 `store.saveCurrent()`               |

**行2：批量撤回**：

| 按钮/控件      | 可用条件   | 说明                                                        |
| -------------- | ---------- | ----------------------------------------------------------- |
| 历史选择下拉框 | 始终显示   | 有快照时显示快照列表（时间+任务数），无快照显示"无历史原文" |
| 恢复原文按钮   | 有历史快照 | 调用 `store.revertSnapshot(idx)`                            |
| 清空历史按钮   | 有历史快照 | 确认后清除 `localStorage` 中的 `organizeSnapshots`          |

**状态样式**：不可用按钮使用 `opacity: 0.5; cursor: not-allowed;`。操作生效时按钮短暂高亮（300ms后移除active类）。

### SortPanel（视图排序）

| 属性      | 值                           |
| --------- | ---------------------------- |
| 标识符    | `ui.panel.sort-panel`        |
| 文件      | `src/ui/panel/sort-panel.ts` |
| Store操作 | 读 sort; 写 sort             |

**功能**：排序方式切换，多选一（15个按钮：原始 + 14种字段）。"原始"为默认选中（`sort.type=""`），恢复文件原始顺序。再次点击当前排序切换升降序（按钮文字追加"↑"或"↓"）。

**排序字段**：状态、描述、优先级、循环、创建、计划、开始、取消、完成、截止、唯一ID、引用ID、标签、文件名。

**排序规则**：`sort.type=""` 表示原始顺序，不排序。升降序通过 `sort.order` 控制（"asc"/"desc"）。

### PresetPanel（视图配置）

| 属性      | 值                                                     |
| --------- | ------------------------------------------------------ |
| 标识符    | `ui.panel.preset-panel`                                |
| 文件      | `src/ui/panel/preset-panel.ts`                         |
| Store操作 | 读 presets, activePresetId; 写 presets, activePresetId |

**功能**：管理当前视图的名称和图标设置。

**操作按钮**：

| 按钮               | 功能                                                         |
| ------------------ | ------------------------------------------------------------ |
| 视图名称文本输入框 | 修改预设名称（max-width:150px）                              |
| 视图图标文本输入框 | 修改预设图标（Emoji，placeholder"Emoji"）                    |
| 📥 导入配置         | 从JSON文件读取配置并合并至当前预设                           |
| 📤 导出配置         | 将当前预设导出为JSON文件（命名 `task-view-{name}.json`）     |
| 🔄 恢复默认         | 重置为 `getDefaultPresets()` 对应预设的出厂默认值，自动调用 `Panels.refreshTimePanel()` |
| 🗑️ 删除视图         | 过滤掉当前预设，自动切换至剩余第一个视图                     |

## 业务视图

### BaseTaskView

| 属性   | 值                              |
| ------ | ------------------------------- |
| 标识符 | `ui.view.base-task-view`        |
| 文件   | `src/ui/view/base-task-view.ts` |

**功能**：抽象基类，继承 `BaseTaskEdit`，50ms防抖渲染。提供数据获取、筛选、排序、视图切换、分屏布局、任务跳转。

**渲染流程（完整步骤）**：

```
doRender():
  1. 保存/恢复滚动位置（根据 scrollKey）
  2. 清空容器，清理分屏布局和甘特图实例
  3. 移除旧全局点击事件监听器
  4. 获取当前 preset.filter, preset.viewStyle, preset.intervalMode
  5. dataManager.loadData(app) → 获取所有任务数据（缓存命中直接返回）
  6. dataManager.getFullTree() → 获取完整任务树
  7. filterTree(fullTree, panelOptions) → 应用面板筛选(状态/描述/优先级/循环/标记)
  8. filterTreeByDateRange(panelFilteredTree, dateRange, intervalMode) → 应用时间筛选
  9. applyHideConfig(dateFilteredTree, hideConfig) → 应用隐藏配置(设置display标志)
  10. 若 selectedTreeNode 存在: flatNodes = collectNodeTasksDeep(selectedTreeNode) → 聚焦子树
      否则: flatNodes = flattenTree(dateFilteredTree)
  11. flatNodes = flatNodes.filter(n => n.display && n.uid !== "__task_root__" && n.match)
  12. 若 flatNodes 为空: renderEmpty()
  13. applySort(flatNodes, sort) → 排序（sort.type为空则不排序）
  14. 应用编辑上下文(applyEditContext)
  15. tree视图: renderTaskTree(); gantt视图: renderGanttWithTree()
      其他视图: renderSplitLayout() → 左侧任务树导航+右侧内容区
  16. 恢复滚动位置（延迟到下一帧）
  17. 重新绑定全局点击事件(延迟100ms)
```

**防抖实现**：

```
render():
  if (renderDebounceTimer) clearTimeout(renderDebounceTimer)
  return new Promise(resolve => {
    renderDebounceTimer = setTimeout(async () => {
      renderDebounceTimer = null
      await doRender()
      resolve()
    }, DEBOUNCE_DELAY=50)
  })
```

**Store订阅**：`BaseTaskView` 订阅Store变化，仅在 `activePresetId`、`sidebarCollapsed` 或 `filter` 发生变化时才触发 `render()`。

**分屏布局**：左侧任务树导航（宽度默认280px，可拖拽调整200-500px，折叠时0px+拖拽手柄），右侧内容区（flex:1）。任务树导航点击节点行为分两种：
- tree/gantt视图：调用 `openTaskAtLine` 跳转到文件
- 其他视图：聚焦子树（设置 `selectedTreeNode`/`focusedTreeNode`）并重新渲染

**排序算法**：

```
applySort(nodes, sort):
  1. 复制数组; order = sort.order === 'asc' ? 1 : -1
  2. 根据 sort.type 确定排序字段:
     status→状态顺序映射(0-4), description→content.toLowerCase,
     priority→priority数值, scheduled/due/created/starts/done/cancelled→时间戳,
     repeat/id/forbid/tag→字符串, filename→path提取文件名
  3. 空值排最后; 字符串用 localeCompare; 数字用减法
  4. 返回排序后数组
```

**任务跳转**：

```
openTaskAtLine(node):
  1. app.vault.getAbstractFileByPath(node.path) → 获取文件
  2. workspace.getLeaf(false).openFile(file, { active: true })
  3. 延迟300ms后尝试滚动(最多重试8次，每次间隔250ms):
     editor.setCursor({ line: targetLine, ch: 0 })
     editor.scrollIntoView({ from, to }, true)
     editor.setSelection(...) 选中目标行
```

**日历视图特殊处理**：`renderByStyle` 中 `calendar` 分支构建筛选条件标题（日期范围+状态+时间模式+任务数），传递给 `renderCalendarView`。

### 业务视图子类

| 视图          | 文件                             | 默认筛选差异                                                 | 空状态文本                 |
| ------------- | -------------------------------- | ------------------------------------------------------------ | -------------------------- |
| AllTasksView  | `ui/view/all-task-view.ts`       | 使用基类默认（无特殊筛选）                                   | "没有符合条件的任务"       |
| InboxView     | `ui/view/inbox-task-view.ts`     | statuses=["todo","scheduled"]                                | "📭 暂无待办任务"           |
| ImportantView | `ui/view/important-task-view.ts` | statuses=["todo","scheduled","in-progress"], priorityValues=["🔺","⏫","🔼"] | "⭐ 暂无重要任务"           |
| TodayView     | `ui/view/today-task-view.ts`     | statuses=["todo","scheduled","in-progress"], dateRange=今天00:00:00~23:59:59.999 | "📅 今天没有符合条件的任务" |
| FutureView    | `ui/view/future-task-view.ts`    | statuses=["todo","scheduled","in-progress"], dateRange=今天00:00:00~+15天23:59:59.999 | "🔜 暂无未来任务"           |

所有子类仅覆写 `getDefaultFilter()` 和 `renderEmpty()` 方法，其余逻辑继承自 `BaseTaskView`。

### 编辑系统

#### BaseTaskEdit

| 属性   | 值                                |
| ------ | --------------------------------- |
| 标识符 | `core.edit.base-task-edit`        |
| 文件   | `src/core/edit/base-task-edit.ts` |

**功能**：编辑Mixin基类，提供编辑入口、模式切换、卡片状态管理、编辑上下文、全局点击事件处理。

**进入编辑**：`handleEnterEdit(node)` → 阅读模式单击卡片 → 如果已在单编辑模式且点击同一卡片则忽略；如果批量模式则忽略；先清理之前编辑的卡片状态 → `editStore.enterSingleEditMode(node)` → `applyEditContext()` → `setCardEditMode(uid)`。

**批量编辑切换**：`toggleBatchMode()` 根据当前模式执行不同切换逻辑：
- 批量模式 → 退出到阅读模式（`exitBatchToReading`）
- 单编辑模式 → `enterBatchModeFromSingle(node)`
- 阅读模式 → `enterBatchMode()`

切换后调用 `refreshAllCardsForBatchMode()` 更新所有卡片显示复选框，`refreshEditPanel()` 刷新编辑面板。

**编辑上下文**：`applyEditContext()` 将当前编辑状态注入全局 `EditContext`，包含 `editMode`、`batchMode`、`selectedTasks`、`previews`、`savedTasks`、`expandedButton` 及各种回调函数（`onEdit`、`onContentEdit`、`onCheckChange`、`onSave`、`onRevert`、`onRestore`）。

**全局点击退出**：`onGlobalClick` 监听插件容器内点击：
- 编辑栏/预览行/可编辑描述区域 → 不退出
- 侧边栏折叠按钮 → 不退出
- 面板区域编辑面板内的批量编辑按钮 → 退出批量模式（如有选中任务先清理）
- 其他面板区域（批量模式）→ 退出批量模式到阅读模式
- 其他面板区域（单编辑模式）→ 退出编辑模式
- 侧边栏（批量模式）→ 退出批量模式到阅读模式
- 侧边栏（单编辑模式）→ 退出编辑模式
- 卡片区域（批量模式）→ `toggleSelection` 切换选择
- 卡片区域（单编辑模式）→ 切换到新卡片编辑
- 其他区域 → 退出编辑模式

#### EditStore

| 属性   | 值                                 |
| ------ | ---------------------------------- |
| 标识符 | `core.edit.task-edit-store`        |
| 文件   | `src/core/edit/task-edit-store.ts` |

**功能**：编辑状态管理器。管理单/批量编辑模式、任务选择、预览文本、已保存状态、展开按钮。

**模式切换**：
- `enterSingleEditMode(node)`：进入单个编辑，清空选择，选中当前节点，初始化预览
- `enterBatchMode()`：从阅读模式进入批量编辑，无预选任务
- `enterBatchModeFromSingle(node)`：从单编辑进入批量编辑，保留当前任务选中
- `exitBatchToReading()`：退出批量编辑到阅读模式，清空所有状态
- `exitEditMode(save?, keepSelection?)`：退出编辑模式

**编辑操作**：
- `applyEdit(markKey, value)`：对选中的所有未保存任务应用编辑。批量模式下遍历所有选中uid，跳过已保存的，基于上一次预览文本（而非原始文本）应用变更，保持预览累积
- `applyContentEdit(node, newContent)`：编辑描述内容（去除类型标记前缀和标题级别前缀）
- `applyAutoComplete(days)`：对选中任务执行自动补全时间
- `applySortTags()`：对选中任务执行标记排序
- `clearPreviews()`：清空所有预览恢复为原始文本

**保存与撤回**：
- `saveSingle(node)`：保存单个任务到文件，创建快照
- `saveAll()`：批量保存所有未保存的选中任务，创建快照，显示通知
- `revertSingle(node)`：撤回单个已保存任务
- `revertSnapshot(index)`：从指定快照恢复

**面板通知**：`subscribePanel(listener)` 注册面板更新回调，在状态变化时通过 `requestAnimationFrame` 异步通知。

#### task-editor（编辑操作Op）

| 属性   | 值                             |
| ------ | ------------------------------ |
| 标识符 | `core.edit.task-editor`        |
| 文件   | `src/core/edit/task-editor.ts` |

**功能**：`Op` 对象提供所有标记的设置和删除方法。

**支持的操作**：

| 操作              | 方法                           | 说明                          |
| ----------------- | ------------------------------ | ----------------------------- |
| 设置状态          | `setStatus(line, status)`      | 替换 `- [x]` 中的状态符号     |
| 设置描述          | `setContent(line, newContent)` | 替换描述文本，保留标记        |
| 设置/删除优先级   | `setPriority/delPriority`      | 基于 `TASKS_RX.priority` 正则 |
| 设置/删除循环     | `setRepeat/delRepeat`          | 基于 `TASKS_RX.repeat` 正则   |
| 设置/删除创建日期 | `setCreated/delCreated`        | ➕ YYYY-MM-DD                  |
| 设置/删除计划日期 | `setScheduled/delScheduled`    | ⏳ YYYY-MM-DD                  |
| 设置/删除开始日期 | `setStarts/delStarts`          | 🛫 YYYY-MM-DD                  |
| 设置/删除截止日期 | `setDue/delDue`                | 📅 YYYY-MM-DD                  |
| 设置/删除完成日期 | `setDone/delDone`              | ✅ YYYY-MM-DD                  |
| 设置/删除取消日期 | `setCancelled/delCancelled`    | ❌ YYYY-MM-DD                  |
| 设置/删除标签     | `setTag/delTag`                | 🏁 keyword                     |
| 设置/删除唯一ID   | `setId/delId`                  | 🆔 id                          |
| 设置/删除引用ID   | `setForbid/delForbid`          | ⛔ id1,id2                     |
| 自动补全时间      | `autoComplete(line, days?)`    | 从完成日期前推N天(默认3)      |
| 排序标记          | `sortTags(line)`               | 按固定顺序重排所有标记        |

**autoComplete算法**：

```
Op.autoComplete(line, days=3):
  1. 匹配完成日期(done)；若无完成日期则返回原行
  2. 先调用 sortTags(line) 排序
  3. 截止日期(due) = 完成日期
  4. 开始日期(starts) = 完成日期 - days天
  5. 计划日期(scheduled) = 开始日期
  6. 创建日期(created) = 开始日期
  7. 再次 sortTags 返回
```

**标记排序顺序**：`priority → repeat → created → scheduled → starts → due → done → cancelled → tag → id → forbid`

**批量写入**：`writeToFiles(app, getNode, taskIds, linesMap)` 按文件路径分组 → 对每个文件调用 `app.vault.process(file, data => ...)` 替换指定行。

**快照管理**：`loadSnapshots()`/`saveSnapshots()`/`addSnapshot(map)` 操作 `localStorage`(键`organizeSnapshots`，最多5个)。快照格式为 `[{ time: string, snapshot: Record<uid, rawLine> }]`。

## 通用视图组件

### 卡片组件

| 组件      | 文件                         | 说明                                                         |
| --------- | ---------------------------- | ------------------------------------------------------------ |
| TaskCard  | `ui/main/card/card.ts`       | 统一任务卡片入口。管理编辑上下文(`setEditContext`/`getEditContext`)。导出 `EditContext` 接口。委托 `createViewCard` |
| ViewCard  | `ui/main/card/view-card.ts`  | 卡片DOM构建：详细/简洁模式、编辑模式UI（编辑栏、预览行、复选框、描述可编辑绑定）、hover效果、tooltip绑定、双击跳转（阅读模式）、单击进入编辑（阅读模式） |
| GridCard  | `ui/main/card/grid-card.ts`  | 卡片网格：`display:grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap:12px` |
| GroupCard | `ui/main/card/group-card.ts` | 分组卡片：左侧4px颜色条，标题栏(flex, space-between, 含计数徽章)，内容区遍历tasks创建卡片 |

**卡片详细模式**（compact=false）：
- 左侧3px solid状态颜色条
- 行1：复选框(批量模式) + 描述文本(contenteditable编辑模式下可编辑)
- 编辑栏：12组编辑按钮（状态/优先级/周期/创建/计划/开始/取消/完成/截止/唯一ID/引用ID/标签）+ 文件名
- 预览行：编辑后显示预览+保存/恢复按钮

**卡片简洁模式**（compact=true）：
- 无边框，透明背景
- 单行描述文本（nowrap, overflow:hidden, text-overflow:ellipsis）
- tooltip显示完整任务信息

### 列表组件

| 组件          | 文件                             | 分组依据                             | 颜色           | 特殊说明                                                |
| ------------- | -------------------------------- | ------------------------------------ | -------------- | ------------------------------------------------------- |
| TaskList      | `ui/main/list/list.ts`           | 无(平铺)                             | —              | 支持compact和详细模式                                   |
| StatusList    | `ui/main/list/status-list.ts`    | 状态(待办→计划→进行中→已取消→已完成) | STATUS_COLORS  | 已取消在已完成之前                                      |
| PriorityList  | `ui/main/list/priority-list.ts`  | 优先级(🔺→⏫→🔼→🔽→⏬→无)                 | 优先级色(逆序) | 组内按priority数值升序                                  |
| RecurringList | `ui/main/list/recurring-list.ts` | 循环周期(every day→week→month→year)  | 四色循环       | 2×2网格布局，仅显示有循环标记的任务                     |
| TimeList      | `ui/main/list/time-list.ts`      | 计划日期(升序)                       | scheduled色    | 无计划日期排最后                                        |
| TimelineList  | `ui/main/list/timeline-list.ts`  | 截止日期(升序)                       | due色          | 无截止日期排最后                                        |
| TagList       | `ui/main/list/tag-list.ts`       | 标签值                               | tag色+五色循环 | 仅显示有标签的任务                                      |
| UniqueIdList  | `ui/main/list/uniqueId-list.ts`  | 有唯一ID的任务                       | ID色           | 仅显示有唯一ID的任务                                    |
| DependsList   | `ui/main/list/depends-list.ts`   | 有引用ID的任务                       | forbid色       | 仅显示有引用ID的任务                                    |
| OverdueList   | `ui/main/list/overdue-list.ts`   | 逾期天数(降序)                       | cancelled色    | 未完成(截止日期<今天)、已完成/已取消(截止日期<完成日期) |

### 表格 / 看板 / 矩阵

| 组件      | 文件                            | 说明                                                         |
| --------- | ------------------------------- | ------------------------------------------------------------ |
| TaskTable | `ui/main/table/table.ts`        | 默认可见列：类型/状态/描述/优先级/计划/开始/取消/截止。空列自动隐藏（遍历所有行检测值是否均为空字符串）。描述列 `white-space:normal; word-break:break-word; overflow-wrap:break-word`(宽度66%)，其他列 `nowrap`(宽度1px)。表头字体 `var(--font-ui-smaller)` 加粗。 |
| Kanban    | `ui/main/board/kanban-board.ts` | 三列横向(flex:1, gap:12px)：待办中(浅灰)、计划中(浅蓝)、进行中(浅红)。仅筛选 `todo/scheduled/in-progress` 状态。 |
| Matrix    | `ui/main/board/matrix-board.ts` | 四象限(grid, 2×2, gap:12px)：🔺紧急重要 / ⏫不紧急重要 / 🔼紧急不重要 / 🔽⏬不紧急不重要。仅筛选有优先级(priority≠5)的任务。 |

### 日历视图

| 属性   | 值                                                         |
| ------ | ---------------------------------------------------------- |
| 标识符 | `ui.main.calendar`                                         |
| 文件   | `src/ui/main/calendar/calendar.ts`(统一入口) + 5个委托文件 |

**功能**：统一入口 `renderCalendarView` 根据 `subView` 参数分发日/周/月/季/年视图。工具栏逆序排列(年→季→月→周→日)。`intervalMode="none"` 时回退为 `"any-date"`。

**数据处理**（在 `core/process/calendar-view-process.ts`）：
- `buildDateTaskMap(nodes, intervalMode)`：构建日期→任务列表映射（仅含首尾日期，使用 `added Set` 去重）
- `buildCellItems(date, dateTaskMap, intervalMode)`：判断每个任务在当天的显示类型（task/line/placeholder）
- `buildGlobalOrder(nodes)`：全局排序（优先级→状态）
- `inferDateRange(nodes, intervalMode)`：从任务列表中推断日期范围

**格子渲染**：最小高度40px，最大高度280px。超出 `MAX_VISIBLE_ITEMS_IN_CELL(5)` 时显示"+N个任务"指示器。点击格子展开（`grid-column:span 2`，max-height:none）。其他月份日期半透明。今天格子2px solid `var(--text-accent)`。

**年视图热力图**：12个月卡片(grid, 4列)，每天格子颜色 `rgba(64, 120, 209, 0.1 + count/maxCount * 0.9)`。今天格子2px边框高亮。

**空时间段**：与任务无交集的年/季/月/周仅显示紧凑标签（小字体、次要背景色、小圆角），排列在内容区底部弹性布局。

**样式注入**：每次渲染时调用 `injectCalendarStyles()` 重新注入日历样式（移除旧标签，创建新标签），支持动态主题切换。线条颜色通过遍历状态颜色映射动态生成CSS类 `.cal-span-line.{status}`。

**5个子视图委托文件**（`day-calendar.ts`、`week-calendar.ts`、`month-calendar.ts`、`quarter-calendar.ts`、`year-calendar.ts`）仅设置 `subView` 参数后调用 `renderCalendarView`。

### 甘特图

| 属性   | 值                           |
| ------ | ---------------------------- |
| 标识符 | `ui.main.gantt`              |
| 文件   | `src/ui/main/gantt/gantt.ts` |

**功能**：左侧任务树 + 右侧时间轴。返回 `{ taskMap: Map<string, TaskTreeNode>, redraw: () => void, destroy: () => void }`。

**时间轴头部分层**：根据 `dayWidth` 确定显示层级：
- dayWidth ≥ 40px → 年月季周日五层
- dayWidth ≥ 15px → 年月季周四层
- dayWidth ≥ 5px → 年月季三层
- dayWidth ≥ 1.5px → 年月两层

从底层到顶层渲染：日层→周层→月层→季层→年层。每层遍历 `totalDays`，当前值变化时创建标签。各层高度平均分配 `HEADER_HEIGHT(48px)`。

**网格背景**：根据 `dayWidth` 确定网格级别（≥40px: 1/7/30/365天，≥15px: 7/30/365天，≥5px: 30/365天，≥1.5px: 91/365天，其他: 365天）。每个级别使用不同的透明度。

**甘特条**：高20px圆角4px，颜色用 `STATUS_COLORS`。已完成任务显示进度填充（`rgba(46, 125, 50, 0.5)`）。右侧显示时长标签（天→d, 周→w, 月→m, 年→y）。tooltip第一行显示节点任务文本（带类型标记）+ 完整任务信息。

**依赖箭头**（SVG）：从ID任务的完成时间侧 → 引用ID任务的开始时间侧折线，带箭头三角形。hover透明stroke(14px)扩大可点击区域。

**定位按钮**：每个甘特条行添加"➤"按钮（font-size:11px, opacity:0.5），点击计算目标甘特条位置并滚动到可视区域。

**折叠更新机制**：任务树节点折叠/展开时触发 `tree-toggle` 自定义事件 → `requestAnimationFrame` 回调中执行：
1. 获取左侧树容器的实际渲染宽度
2. 更新内容区总宽度
3. 更新时间轴头部（间隔宽度、内部左偏移、头部总宽度）
4. 移除并重建网格背景
5. 移除并重建今日线
6. 遍历所有甘特条更新位置
7. 调用SVG `__redraw()` 方法重绘依赖箭头

**缩放**：Alt+滚轮缩放（dayWidth [0.5, 40]，步进 ×1.3/×0.7）。以鼠标位置为中心保持时间点不变。缩放状态持久化到 `localStorage`(键`ganttZoomState`，存储`{ dayWidth }`)。

**拖拽平移**：mousedown非甘特条区域开始拖拽，记录起始位置和滚动位置，mousemove更新水平滚动。

**配置常量**（在 `core/process/gantt-view-process.ts`）：
- `TASK_BAR_RADIUS: 4`
- `TASK_BAR_HEIGHT: 20`
- `ROW_HEIGHT: 28`
- `HEADER_HEIGHT: 48`
- `MIN_DAY_WIDTH: 0.5`
- `MAX_DAY_WIDTH: 40`
- `DEFAULT_DAY_WIDTH: 40`
- `TREE_MIN_WIDTH: 200`
- `STORAGE_KEY: "ganttZoomState"`

### 任务树

| 属性   | 值                              |
| ------ | ------------------------------- |
| 标识符 | `ui.main.list.tree-list`        |
| 文件   | `src/ui/main/list/tree-list.ts` |

**功能**：树形结构展示文件/标题/列表任务。支持聚焦子树、折叠展开、排序、进度条。

**节点显示格式**：

| 节点类型 | 显示格式         | 说明                                                         |
| -------- | ---------------- | ------------------------------------------------------------ |
| 文件任务 | 📄 + 文件名       | 从 `node.text` 获取                                          |
| 标题任务 | H级别 + 标题文本 | 使用 `node.headingLevel` 或 `node.depth`，去除number headings序号 |
| 列表任务 | ● + 任务描述     | 使用 `node.text`                                             |

**缩进**：`INDENT_WIDTH=24px`。使用修正后的深度（`depth - depthOffset`）计算缩进。

**行容器结构**：
1. 折叠按钮(16px, ▼/▶)或占位符（无子节点时）
2. 内容容器：TaskCard(compact+showTooltip) + 进度条(60px×8px) + 百分比 + 数量徽章(总任务数)
3. 右侧弹性空间(flex:1)

**排序规则**：同一节点下固定分组顺序（列表任务[0]→标题任务[1]→文件任务[2]）。若指定sort，各组内部按sort.type排序。使用 `sortFileNodes()` 递归排序。

**进度条统计**：`countNodeStatuses(node)` 收集所有子孙任务的各状态数量（通过 `collectAllTasksFromNode` 收集，去重uid，排除display:false节点和虚拟根节点）。

**虚拟根节点**：全树模式显示"🗂️ 任务管理"+合并进度条（所有子节点的状态合并）+总数。聚焦模式显示"📂 节点名称"标题栏（带类型图标），点击恢复全树，双击跳转文件。

**onRowRender回调**：`onRowRender(rowEl, node)` 在行容器添加到父元素后调用，供甘特图在行上附加甘特条DOM。

**tree-toggle事件**：折叠/展开按钮点击时，向最近的 `.task-tree`/`.gantt-tree-container`/`.task-tree-nav-content` 元素派发 `tree-toggle` 自定义事件（bubbles:true），供甘特图更新使用。

### 统计图表

| 组件        | 文件                            | 说明                                                         |
| ----------- | ------------------------------- | ------------------------------------------------------------ |
| ECharts     | `ui/main/chart/echart.ts`       | ECharts打包导入(`import * as echarts from "echarts"`)，全局兼容(`window.echarts`)。导出 `ensureEcharts(callback)` 同步回调接口（兼容旧代码）。 |
| MarkChart   | `ui/main/chart/mark-chart.ts`   | ECharts饼图矩阵（6个饼图，3列网格布局，gap:16px）：执行状态(状态色)/优先级(优先级色)/循环周期(循环色)/日期标记(日期标记色)/依赖关系(仅ID/仅引用ID/两者都有)/标签(动态色)。自适应主题文字颜色和背景色。无数据时显示灰色"无数据"。饼图配置：radius["35%","60%"], center["50%","45%"], label显示百分比。 |
| DetailChart | `ui/main/chart/detail-chart.ts` | ECharts堆叠柱状图。按计划日期范围生成日期序列，为每种状态生成每日计数组。X轴日期(旋转30°)，Y轴数量，系列按 `ALLOWED_STATUSES` 堆叠。图例在底部。点击🔍放大全屏查看（全屏遮罩rgba(0,0,0,0.8)+关闭按钮✖+点击遮罩关闭）。 |
| TimeChart   | `ui/main/chart/time-chart.ts`   | 时间统计图（占位，显示"时间统计图功能开发中..."）。          |

### 基础组件

| 组件        | 文件                                | 说明                                                         |
| ----------- | ----------------------------------- | ------------------------------------------------------------ |
| ProgressBar | `ui/component/progress/progress.ts` | 按状态顺序(todo→scheduled→in-progress→completed→cancelled)渲染分段。支持百分比显示和tooltip。tooltip顺序与StatusList一致。`countTaskStatuses(nodes)` 统计各状态数量。 |
| Tooltip     | `ui/component/tooltip/tooltip.ts`   | 单例管理器（`TooltipManager`类）。`ensureDiv()` 创建全局tooltip div。显示时定位鼠标右下方(x+15,y+15)。全局mousemove检测离开任务相关区域（`.task-item,.gantt-bar,.cal-task-item,.cal-span-line,.task-progress-bar,.cal-more-indicator`）时延时100ms隐藏。 |
| Slider      | `ui/component/slider/slider.ts`     | 通用双滑块：`createSlider(options)` 返回 `{refs, update, destroy}`。手柄宽度4px高16px，轨道高4px。支持单手柄拖拽、区间整体拖拽（间距≥step时）、点击轨道就近移动一手柄。`createEnhancedSlider(options)` 额外支持刻度标记（最多20个，今天刻度2px×8px强调色）、todayValue标记线、midLine、右侧标签（labelWidth 160px）。 |

## 数据层

### DataManager

| 属性   | 值                              |
| ------ | ------------------------------- |
| 标识符 | `core.data.data-manager`        |
| 文件   | `src/core/data/data-manager.ts` |
| 类型   | 单例                            |

**功能**：首次 `loadData(app)` → `loadAllTaskFiles(app)` 调用 `app.vault.getMarkdownFiles()` 过滤任务文件 → 对每个文件 `app.vault.cachedRead()` → `parseFile()` 解析 → `isTaskFile()` 判断 → `buildTaskTree(files)` 构建完整树 → 建立 `taskIdMap`(uid→node 和 id→node) → 清空所有文件的 `content` 字段释放内存 → 返回 `{files, nodes, taskIdMap}`。后续调用直接返回缓存。

**筛选指纹**：`filterFingerprint(filter) = JSON.stringify({ statuses: sorted, searchText, priorityValues: sorted, repeatCycles: sorted })`。指纹相同时直接返回缓存的筛选树。

**缓存失效**：
- `invalidate()`：清除全部缓存（监听 `vault.on("modify")` 事件触发）
- `invalidateFilterCache()`：仅清除筛选缓存和扁平化缓存（面板修改筛选条件时调用）

**扁平化过滤**：`getFlatNodes(filter)` 内部调用 `getFilteredTree(filter)` → `flattenTree()` → 过滤 `display:false` 和 `uid !== "__task_root__"` 的节点。

### 解析器

| 解析器          | 文件                             | 说明                                                         |
| --------------- | -------------------------------- | ------------------------------------------------------------ |
| md-parser       | `core/parser/md-parser.ts`       | Markdown文件解析：YAML提取（`parseFrontmatter`）→标题识别（`#{1,6}`）→内容结构构建（ContentNode树）。识别标题YAML块（` ```yaml/yml ``` `）解析标题任务属性。`promoteToHeadingTasks()` 自动将有子列表任务的标题提升为标题任务。`loadAllTaskFiles(app)` 批量加载任务文件。 |
| tasks-parser    | `core/parser/tasks-parser.ts`    | `TASK_REGEX = /^\s*-\s*\[([所有状态符号])\]\s+(.+)$/`（包含空格、?、>、/、\、x、X、-等）。`parseTaskLine()` 解析任务行，通过 `TASKS_RX` 正则提取各标记字段，`cleanText` 移除所有标记后返回纯描述。支持任务项过滤器 `matchTaskItem`。 |
| dataview-parser | `core/parser/dataview-parser.ts` | 解析 inline字段 `[key:: value]`（`DATAVIEW_INLINE_REGEX`）和 emoji日期简写（无空格，`DATAVIEW_EMOJI_DATE_REGEX`）。 |
| task-parser     | `core/parser/task-parser.ts`     | YAML属性解析。通过 `yaName`（如"任务状态""任务优先级"等）映射到 `TaskData` 字段。日期字段通过 `YAML_DATE_FIELDS` 自动提取 `YYYY-MM-DD` 格式。 |

### 任务树构建与筛选

| 模块         | 文件                        | 说明                                                         |
| ------------ | --------------------------- | ------------------------------------------------------------ |
| task-tree    | `core/task/task-tree.ts`    | `buildTaskTree(files)`：为每个文件创建file节点 → 解析文件间关系（YAML"父任务"字段 `parseParentField` + Wiki链接 `extractAllLinks`）→ 检测冲突(meta_mismatch/meta_missing/link_missing) → 建立父子关系（优先使用YAML声明，其次Wiki链接，循环引用检测 `isAncestor`）→ 创建虚拟根节点 `__task_root__`。 |
| tree-filter  | 同上                        | `filterTree(root, options)`：按面板条件筛选，设置节点 `match` 标志（"或"逻辑：多组条件满足任一即可）。`filterTreeByDateRange()`：按时间范围筛选（支持4种intervalMode）。`applyHideConfig()`：应用隐藏配置设置 `display` 标志（"或"逻辑：满足任一隐藏条件即隐藏）。`flattenTree()`：深度优先遍历+Set去重。 |
| task-derived | `core/task/task-derived.ts` | `getTaskMarks(node)`→各标记是否存在（返回 `TaskMarks` 类型）。`getTaskTimeRange(node, mode)`：支持4种 `IntervalMode`。`getStatusIcon/Name`、`getPriorityIcon/Name`、`getFileName`。 |
| task-filter  | `core/task/task-filter.ts`  | `filterTasks(nodes, filter, intervalMode?)`：纯函数，顺序应用日期→状态→标记→路径→搜索文本→优先级→循环周期筛选。各筛选条件仅在非空时生效。 |
| task-format  | `core/task/task-format.ts`  | `buildMetaRow(node)`：构建详细模式元数据行HTML（状态→优先级→循环→创建→计划→开始→取消→完成→截止→id→forbid→tag→文件名，各字段空时不输出标签）。`buildTooltip(node)`：构建tooltip HTML（状态→优先级→循环→创建→计划→开始→截止→完成→取消→id→forbid→tag，与元数据行顺序不同）。`buildDescription(node, _compact)`：构建描述文本（添加类型标记📄/H/●，标题去除number headings序号）。 |

### 组件处理

| 模块                  | 文件                                    | 说明                                                         |
| --------------------- | --------------------------------------- | ------------------------------------------------------------ |
| calendar-view-process | `core/process/calendar-view-process.ts` | 日历视图数据处理：`buildDateTaskMap`（仅首尾日期，`added Set` 去重）、`buildCellItems`（任务/线条/占位符类型判断，今天特殊处理）、`buildGlobalOrder`（优先级→状态排序）、`inferDateRange`、`getWeeksInRange`/`getMonthsInRange`/`getQuartersInRange`/`getYearsInRange`（时间范围列表生成）、`getMonthDays`（42天日期数组）。 |
| gantt-view-process    | `core/process/gantt-view-process.ts`    | 甘特图数据处理：`getTaskInterval`（时间区间）、`calcRangeFromRoots`（范围推断，支持传入 `dateRange`）、`getTimelineLayers`（根据 dayWidth 计算图层）、`getGridLineStyle`（网格线样式/颜色/透明度）、`getGridLevels`（网格级别数组）、`getGridFirstLineDate`（网格起始日期）、`advanceGridLineDate`（网格线日期推进）、`calcBarEdges`（甘特条左右位置和宽度）、`calcDependencyPath`（依赖箭头SVG路径）、`loadZoomState`/`saveZoomState`（localStorage缩放持久化）、`formatGanttDuration`（时长格式化）、`isDarkTheme`（主题检测）。 |
| tree-view-process     | `core/process/tree-view-process.ts`     | 任务树处理：`removeHeadingNumber`（去除number headings插件生成的序号）、`collectAllTasksFromNode`（收集子树任务，深度优先+去重）、`countNodeStatuses`（状态统计）、`sortFileNodes`/`sortContentNodes`（排序函数）、`getNodeGroupOrder`（类型分组排序权重：list=0, heading=1, file=2）、`compareTasks`（任务比较函数）。 |

### 日期计算

| 属性   | 值                           |
| ------ | ---------------------------- |
| 标识符 | `core.date.date-calc`        |
| 文件   | `src/core/date/date-calc.ts` |

**功能**：独立的日期计算工具模块，从 `panel-config.ts` 拆分出来。提供ISO周数计算、年份数据缓存、格式化函数、动态/静态滑动条联动计算。

**缓存机制**：`DAYS_IN_YEAR_CACHE`、`WEEKS_IN_YEAR_CACHE`、`FIRST_MONDAY_CACHE`、`LAST_SUNDAY_CACHE` 四个缓存对象确保每个年份的天数、周数、首个星期一的日期和最后一个星期日的日期仅计算一次。

**核心函数**：
- `daysInYear(y)` / `weeksInYear(y)`：获取某年天数/周数（带缓存）
- `isoWeek(d)`：计算ISO周数
- `dayOfYear(d)` / `dayToDate(y, d)`：年中第几天与日期的双向转换
- `formatYearValue/QuarterValue/MonthValue/WeekValue/DayValue`：各时间级别的格式化（支持跨年偏移计算）
- `formatDynamicValue(v, unit)`：动态滑动条值的文字说明（"本日"/"前3天"等）
- `getTodayAbsoluteValue(lv, baseYear)`：计算今天在各时间级别的绝对值
- `getLevelValues(startDate, endDate, minYear?)`：计算各时间级别的起止值（含跨年偏移）
- `datesFromLevel(lv, sv, ev, dynamicUnit?, baseYear?)`：根据级别和值计算日期范围（支持year/quarter/month/week/day/dynamic六种级别）
- `calcDynamicOffset(date, unit)`：计算日期相对于今天的动态偏移
- `maxDynamicRange(unit)`：计算动态范围最大值
- `staticSliderRanges(startDate, endDate, taskMinYear, taskMaxYear)`：计算静态滑动条各时间级别的范围
- `computeTotalSpanDays` / `calcPlannedDuration` / `calcActualDuration` / `calcTotalSpanHours`：时长计算
- `prepareDailyStatusStack`：准备每日状态堆叠数据

## 持久化与设置

### 插件设置面板

| 属性 | 值                       |
| ---- | ------------------------ |
| 文件 | `src/setting/setting.ts` |

**可配置项**：

| 设置项       | 说明                                                         |
| ------------ | ------------------------------------------------------------ |
| 任务路径     | 多行文本，每行一个文件夹路径。支持动态添加/删除行，每行有独立的下拉搜索功能（调用 `app.vault.getAllLoadedFiles()` 获取文件夹列表，防抖200ms，最多显示50个结果）。 |
| 文件夹过滤器 | 模式(pattern)、大小写敏感(Aa按钮)、全词匹配(ab按钮)、正则匹配(正则按钮)、排除模式(排除按钮，红色) |
| 文件过滤器   | 同上（标题为"任务文件"）                                     |
| 标题过滤器   | 同上（标题为"任务标题"）                                     |
| 任务项过滤器 | 状态符号（如 x ?）、排除模式。简化的输入框+排除按钮，无大小写/全词/正则选项。 |

**设置生效**：所有设置通过 `saveSettings()` 调用 `updateTaskFileConfig()` 实时更新到 `TASK_ROOT_PATHS` 和各过滤器变量，无需重启插件。`saveSettings()` 同时调用 `this.plugin.saveAllSettings()` 持久化。

**过滤器行样式**：激活的切换按钮使用 `var(--interactive-accent)` 背景+白色文字，非激活使用 `var(--background-modifier-border)` 背景+ `var(--text-muted)` 文字。

### 数据持久化

| 存储方式                              | 内容                                                         |
| ------------------------------------- | ------------------------------------------------------------ |
| `Plugin.loadData()/saveData()`        | AppState(presets, sidebarCollapsed, sidebarWidth, activePresetId, presetGroups, editPanelState) + settings(taskRootPath, 四级过滤器) |
| `localStorage`(键`organizeSnapshots`) | 整理处最近5次编辑快照 `[{ time: string, snapshot: Record<uid, rawLine> }]` |
| `localStorage`(键`ganttZoomState`)    | 甘特图缩放状态 `{ dayWidth: number }`                        |

**持久化流程**：`main.ts` 的 `persistData()` 函数合并当前 Store 状态和插件设置数据后调用 `this.saveData()`。Store 的 `update()` 自动调用 `save()` → `saveFn()` → `persistData()`。`updateSilent()` + `saveSilent()` 用于需要静默持久化的场景。

**版本兼容**：`main.ts` 加载时将保存数据与 `getDefaultPresets()` 合并：
- 非空数组优先使用保存值
- 空数组回退默认值
- 保存的预设未包含在默认预设中时作为自定义预设保留
- 自动补全 `barVisibility` 的9个默认值
- 自动在 `toolbarOrder` 中补全 `"edit"` 键
- `wasViewOpen` 独立于AppState存储

# CSCI集成测试要点

| 测试场景          | 验证点                                                       |
| ----------------- | ------------------------------------------------------------ |
| 侧边栏折叠/展开   | 宽度切换(40px↔自适应)，按钮内容变化(图标↔图标+文字)，状态持久化 |
| 侧边栏宽度自适应  | 按钮宽度统一对齐，容器无多余留白，展开时自动计算宽度         |
| 视图切换          | 右侧内容+面板状态同步刷新，预设数据正确恢复，动态加载视图类正确 |
| 面板拖拽排序      | 标题按钮顺序更新(9个面板)，面板排列同步，持久化正确          |
| 眼睛按钮显隐      | 面板显示/隐藏，折叠时自动展开面板，标题按钮透明度变化(opacity:1↔0.4) |
| 面板高度调整      | 拖拽实时生效，释放持久化，范围钳制[30, 85vh]                 |
| 面板复用          | 切换预设时已存在面板不重建，输入框聚焦时跳过内容刷新         |
| 时间滑动条联动    | useDynamic控制动态→静态单向同步，取消时恢复saved状态(无saved回退今年全年) |
| 时间模式切换      | intervalMode变化时筛选结果相应变化。日历/甘特图none→回退any-date |
| 筛选组合          | 状态+描述+标记+时间多条件筛选正确，全选(空数组)时不过滤      |
| 视图样式          | 19种视图正确渲染，空数据空状态文本正确，视图切换按钮高亮     |
| 排序              | 15种排序(原始+14字段)正确，升降序切换，空值始终排最后        |
| 任务树            | 三种节点类型正确显示，折叠展开+tree-toggle事件，进度条统计(去重uid)，排序和缩进(24px)，聚焦/全树模式切换 |
| 日历              | 日/周/月/季/年视图正确，格子渲染(卡片/线条/占位符类型判断)，年视图热力图颜色强度，空时间段标签，主题切换样式更新(重新注入) |
| 甘特图            | 甘特条位置颜色正确，Alt+滚轮缩放(以鼠标为中心，×1.3/×0.7)，拖拽平移，依赖箭头SVG，折叠更新机制(requestAnimationFrame)，定位按钮➤ |
| 任务跳转          | 双击跳转到文件正确位置并滚动到可见区域（重试8次，间隔250ms），选中目标行 |
| 编辑系统-单编辑   | 阅读模式单击卡片进入单编辑，编辑按钮展开子选项，预览累积(基于上次预览)，保存写入文件 |
| 编辑系统-批量编辑 | 批量模式复选框全选/全不选，同步编辑所有选中任务，补全时间(默认3天)，清空预览，保存修改创建快照 |
| 编辑系统-撤回     | 单任务撤回，快照列表选择撤回(最多5个)，恢复原文，清空历史    |
| 编辑系统-退出     | 点击编辑栏/预览行不退出，点击非编辑区退出，面板编辑按钮退出批量模式 |
| 持久化            | 插件重载后侧边栏/面板/预设/筛选/排序/隐藏状态正确恢复，wasViewOpen恢复视图 |
| 防抖渲染          | Store快速连续更新时仅最后一次触发实际渲染(50ms延迟，取消前次定时器) |
| 数据缓存          | DataManager筛选指纹缓存命中，`vault.on("modify")` 触发 `invalidate()` 清除全部缓存 |
| 设置面板          | 任务路径多行添加/删除，下拉搜索文件夹(防抖200ms，最多50结果)，四级过滤器修改后实时生效 |
| 编辑面板          | 批量编辑/全选/补全时间(可配置天数)/清空预览/保存修改/历史下拉选择/恢复原文/清空历史功能正确，按钮可用状态正确 |

# 需求的可追踪性

本SDD对应的需求详见《项目功能和UI设计文档》。各模块与功能的映射关系：

| 模块                                                | 对应功能需求                                                 |
| --------------------------------------------------- | ------------------------------------------------------------ |
| SidebarPanel                                        | 侧边栏功能设计、侧边栏UI设计                                 |
| Panels + 各功能面板(9个)                            | 视图配置面板功能设计、视图配置面板UI设计、各筛选/排序/隐藏/编辑/配置功能 |
| BaseTaskView + 业务视图子类(5个)                    | 业务视图设计（待办/今天/未来/重要/所有任务）                 |
| 通用视图组件(19种)                                  | 通用视图UI设计（列表/卡片/表格/看板/矩阵/日历/甘特图/任务树/统计图表等） |
| DataManager + 解析器 + 任务树                       | 任务数据读取与解析、任务树数据结构                           |
| EditStore + BaseTaskEdit + task-editor + edit-utils | 编辑视图设计（单个编辑/批量编辑）、编辑视图UI设计            |
| Store + 设置面板                                    | 持久化设计、插件配置                                         |
| DateCalc                                            | 时间筛选面板的日期计算需求                                   |

# 注解

## 当前已知限制

- 级联日期联动逻辑未实现（独立滑动条各自更新）
- 甘特图依赖箭头实时更新待增强
- 移动端适配未充分测试
- `time-chart.ts` 时间统计图为占位文件（显示"时间统计图功能开发中..."）
- `command/index.ts` 命令注册为空（无插件命令）
- `presetGroups` 方案分组为预留字段，侧边栏当前不按分组渲染
- `organize-task-view.ts`（整理处视图）不存在于当前项目结构中

## 术语表

| 术语                  | 说明                                                         |
| --------------------- | ------------------------------------------------------------ |
| Preset                | 视图方案，保存完整筛选条件、视图样式、面板状态               |
| Store                 | 全局状态管理器，发布/订阅模式                                |
| Panels                | 面板管理器单例，管理9个功能面板                              |
| DataManager           | 数据管理器单例，统一数据加载和缓存                           |
| HideConfig            | 隐藏配置接口，独立于 GlobalFilter                            |
| GlobalFilter          | 全局筛选条件接口                                             |
| intervalMode          | 时间计算模式：scheduled-due(计划~截止) / starts-done(开始~完成) / any-date(任意日期匹配) / none(不做时间筛选) |
| TaskTreeNode          | 任务树节点，统一数据结构（uid唯一标识 = path:line）          |
| ContentNode           | 文件内容解析节点(heading/task)                               |
| FileRelations         | 文件间父子关系（YAML声明+Wiki链接，5种情况处理）             |
| EditStore             | 编辑状态管理器（单/批量模式、预览累积、快照管理）            |
| BaseTaskEdit          | 编辑交互Mixin基类（编辑入口、卡片状态、全局点击）            |
| EditContext           | 编辑上下文接口，注入卡片组件使用                             |
| Op                    | 编辑操作对象，提供12种标记的设置/删除方法                    |
| TASK_ELEMENTS         | 统一的任务元素定义对象（含中英文名、图标、颜色、YAML映射）   |
| TASKS_RX              | Tasks格式各标记的正则表达式映射                              |
| YA_NAME               | YAML属性名，用于文件/标题任务的属性映射                      |
| Panels.panelEls       | 面板DOM元素Map（key → HTMLElement），用于面板复用            |
| Panels.panelInstances | 面板组件实例Map（key → Bar实例），用于面板复用和接口访问     |

# 附录

## 涉及文件清单（完整版，与实际项目结构严格一致）

### 入口与类型
| 文件               | 职责                                                         |
| ------------------ | ------------------------------------------------------------ |
| `src/main.ts`      | 插件入口（Store初始化、预设合并、视图注册、持久化、wasViewOpen恢复） |
| `src/type/type.ts` | 类型定义（AppState, Preset, GlobalFilter, HideConfig, EditState, EditPanelState, TaskData, TaskTreeNode, FileRelations, IntervalMode等） |

### 核心配置
| 文件                                 | 职责                                                         |
| ------------------------------------ | ------------------------------------------------------------ |
| `src/core/config/config.ts`          | 核心常量（TASK_ELEMENTS完整定义, 颜色定义, 状态/优先级/循环/日期/标签映射, 任务文件识别配置与过滤器, updateTaskFileConfig） |
| `src/core/config/tasks-config.ts`    | Tasks格式定义（状态符号, TASKS_RX正则, 优先级/循环映射）     |
| `src/core/config/dataview-config.ts` | Dataview格式定义（inline字段, emoji日期简写）                |

### Store层
| 文件                                    | 职责                                                         |
| --------------------------------------- | ------------------------------------------------------------ |
| `src/core/store/store.ts`               | Store类（全局状态管理+编辑面板状态+editStore集成+编辑操作代理） |
| `src/core/store/preset/preset.ts`       | 预设管理（增删改激活方案）                                   |
| `src/core/store/preset/panel-preset.ts` | 面板默认配置（getDefaultFilter, getDefaultHideConfig, getDefaultPresets, YEAR_RANGE_OFFSET） |

### 编辑系统
| 文件                               | 职责                                                         |
| ---------------------------------- | ------------------------------------------------------------ |
| `src/core/edit/task-edit-store.ts` | EditStore编辑状态管理（单/批量模式、预览累积、保存/撤回、快照） |
| `src/core/edit/base-task-edit.ts`  | BaseTaskEdit编辑交互Mixin（编辑入口、卡片状态管理、编辑上下文、全局点击退出） |
| `src/core/edit/task-editor.ts`     | 编辑操作对象Op（12种标记设置/删除、自动补全、排序、快照管理、文件写入） |

### 数据层
| 文件                            | 职责                                                         |
| ------------------------------- | ------------------------------------------------------------ |
| `src/core/data/data-manager.ts` | DataManager单例（加载/缓存/筛选指纹/扁平化/失效）            |
| `src/core/date/date-calc.ts`    | 日期计算模块（ISO周数、年份缓存、格式化、滑动条联动、动态/静态时间处理） |

### 解析器
| 文件                                 | 职责                                                         |
| ------------------------------------ | ------------------------------------------------------------ |
| `src/core/parser/md-parser.ts`       | Markdown文件解析器（YAML提取、标题识别、标题YAML块、任务文件加载、isTaskFile判断） |
| `src/core/parser/tasks-parser.ts`    | Tasks格式列表任务行解析器（parseTaskLine、TASK_REGEX正则）   |
| `src/core/parser/task-parser.ts`     | YAML属性解析器（文件任务+标题任务共用）                      |
| `src/core/parser/dataview-parser.ts` | Dataview格式解析器                                           |

### 组件处理
| 文件                                        | 职责                                                         |
| ------------------------------------------- | ------------------------------------------------------------ |
| `src/core/process/calendar-view-process.ts` | 日历视图数据处理（日期-任务映射、格子数据构建、排序、时间范围生成） |
| `src/core/process/gantt-view-process.ts`    | 甘特图数据处理（时间区间、范围、图层、网格、甘特条位置、依赖箭头、缩放持久化） |
| `src/core/process/tree-view-process.ts`     | 任务树处理（序号去除、任务收集、状态统计、排序函数）         |

### 任务核心
| 文件                            | 职责                                                         |
| ------------------------------- | ------------------------------------------------------------ |
| `src/core/task/task-tree.ts`    | 统一任务树（数据结构、构建、文件关系解析、筛选、时间范围筛选、隐藏配置、扁平化） |
| `src/core/task/task-derived.ts` | 任务派生数据（标记检测、时间区间计算、状态/优先级获取）      |
| `src/core/task/task-filter.ts`  | 扁平任务筛选（日期/状态/标记/路径/搜索/优先级/循环）         |
| `src/core/task/task-format.ts`  | 任务格式化（元数据行HTML、tooltip HTML、描述文本构建）       |

### 命令
| 文件                        | 职责                 |
| --------------------------- | -------------------- |
| `src/core/command/index.ts` | 命令注册（当前为空） |

### 设置
| 文件                     | 职责                                                    |
| ------------------------ | ------------------------------------------------------- |
| `src/setting/setting.ts` | 设置面板（任务路径多行+下拉搜索、四级过滤器、实时生效） |

### UI入口
| 文件           | 职责                                                         |
| -------------- | ------------------------------------------------------------ |
| `src/ui/ui.ts` | ManageView + ViewContainer + createManageLayout（三栏布局、视图动态加载） |

### 侧边栏
| 文件                        | 职责                                                      |
| --------------------------- | --------------------------------------------------------- |
| `src/ui/sidebar/sidebar.ts` | SidebarPanel侧边栏面板（折叠/展开、宽度自适应、新建视图） |

### 面板组件
| 文件                           | 职责                                                         |
| ------------------------------ | ------------------------------------------------------------ |
| `src/ui/panel/panel.ts`        | Panels面板管理器单例（宿主容器、标题栏、面板容器、拖拽手柄、9个面板组件映射、面板复用、高度调整、输入聚焦保护、样式注入） |
| `src/ui/panel/head-panel.ts`   | HeadPanel标题栏按钮条（拖拽排序、眼睛按钮显隐）              |
| `src/ui/panel/time-panel.ts`   | TimePanel筛选时间面板（时间模式、动态滑动条、静态滑动条五级、联动、跨天检测） |
| `src/ui/panel/status-panel.ts` | StatusPanel筛选状态面板（主按钮全选/全不选、5种状态子按钮）  |
| `src/ui/panel/search-panel.ts` | SearchPanel筛选描述面板（文本输入、双层输入保护）            |
| `src/ui/panel/mark-panel.ts`   | MarkPanel筛选标记面板（优先级/循环/时间/依赖/标签5组）       |
| `src/ui/panel/view-panel.ts`   | ViewPanel任务视图面板（4组19种视图样式切换）                 |
| `src/ui/panel/hide-panel.ts`   | HidePanel视图隐藏面板（HideConfig七组控制）                  |
| `src/ui/panel/edit-panel.ts`   | EditPanel编辑面板（批量编辑/补全时间/保存修改/撤回快照）     |
| `src/ui/panel/sort-panel.ts`   | SortPanel视图排序面板（15种排序+升降序切换）                 |
| `src/ui/panel/preset-panel.ts` | PresetPanel视图配置面板（名称/图标、导入导出JSON、恢复默认、删除） |

### 业务视图
| 文件                                 | 职责                                                         |
| ------------------------------------ | ------------------------------------------------------------ |
| `src/ui/view/base-task-view.ts`      | BaseTaskView业务视图基类（继承BaseTaskEdit，50ms防抖渲染、分屏布局、19种视图切换、排序、跳转） |
| `src/ui/view/all-task-view.ts`       | AllTasksView所有任务视图                                     |
| `src/ui/view/inbox-task-view.ts`     | InboxView待办任务视图                                        |
| `src/ui/view/important-task-view.ts` | ImportantView重要任务视图                                    |
| `src/ui/view/today-task-view.ts`     | TodayView今天任务视图                                        |
| `src/ui/view/future-task-view.ts`    | FutureView未来任务视图                                       |

### 通用视图组件-卡片
| 文件                             | 职责                                  |
| -------------------------------- | ------------------------------------- |
| `src/ui/main/card/card.ts`       | 统一任务卡片入口+编辑上下文管理       |
| `src/ui/main/card/view-card.ts`  | 卡片视图DOM构建（详细/简洁/编辑模式） |
| `src/ui/main/card/grid-card.ts`  | 卡片网格布局                          |
| `src/ui/main/card/group-card.ts` | 分组卡片组件                          |

### 通用视图组件-列表
| 文件                                 | 职责                                                         |
| ------------------------------------ | ------------------------------------------------------------ |
| `src/ui/main/list/list.ts`           | 任务列表                                                     |
| `src/ui/main/list/status-list.ts`    | 状态列表                                                     |
| `src/ui/main/list/priority-list.ts`  | 优先级列表                                                   |
| `src/ui/main/list/recurring-list.ts` | 循环列表                                                     |
| `src/ui/main/list/time-list.ts`      | 时间列表（按计划日期分组）                                   |
| `src/ui/main/list/timeline-list.ts`  | 时间轴列表（按截止日期分组）                                 |
| `src/ui/main/list/tag-list.ts`       | 标签列表                                                     |
| `src/ui/main/list/uniqueId-list.ts`  | 唯一ID列表                                                   |
| `src/ui/main/list/depends-list.ts`   | 依赖列表                                                     |
| `src/ui/main/list/overdue-list.ts`   | 逾期列表                                                     |
| `src/ui/main/list/tree-list.ts`      | 任务树列表（聚焦/全树模式、折叠展开、进度条、onRowRender回调） |

### 通用视图组件-其他
| 文件                                       | 职责                                                   |
| ------------------------------------------ | ------------------------------------------------------ |
| `src/ui/main/table/table.ts`               | 任务表格（空列自动隐藏）                               |
| `src/ui/main/board/kanban-board.ts`        | 看板视图（三列）                                       |
| `src/ui/main/board/matrix-board.ts`        | 矩阵视图（四象限）                                     |
| `src/ui/main/calendar/calendar.ts`         | 统一日历视图入口（日/周/月/季/年、样式注入、热力图）   |
| `src/ui/main/calendar/day-calendar.ts`     | 日视图委托                                             |
| `src/ui/main/calendar/week-calendar.ts`    | 周视图委托                                             |
| `src/ui/main/calendar/month-calendar.ts`   | 月视图委托                                             |
| `src/ui/main/calendar/quarter-calendar.ts` | 季视图委托                                             |
| `src/ui/main/calendar/year-calendar.ts`    | 年视图委托                                             |
| `src/ui/main/gantt/gantt.ts`               | 甘特图视图（时间轴分层、甘特条、依赖箭头、缩放、平移） |
| `src/ui/main/chart/echart.ts`              | ECharts打包导入+全局兼容                               |
| `src/ui/main/chart/mark-chart.ts`          | 标记统计图（6个饼图）                                  |
| `src/ui/main/chart/detail-chart.ts`        | 详细统计图（堆叠柱状图+全屏放大）                      |
| `src/ui/main/chart/time-chart.ts`          | 时间统计图（占位，待实现）                             |

### 基础组件
| 文件                                    | 职责                                           |
| --------------------------------------- | ---------------------------------------------- |
| `src/ui/component/progress/progress.ts` | 进度条组件（分段渲染、tooltip、状态统计）      |
| `src/ui/component/slider/slider.ts`     | 通用双滑块+增强滑动条（刻度、today标记、标签） |
| `src/ui/component/tooltip/tooltip.ts`   | Tooltip单例管理器（全局跟踪、延时隐藏）        |

### 工具函数
| 文件                      | 职责                                                         |
| ------------------------- | ------------------------------------------------------------ |
| `src/util/color-utils.ts` | 颜色工具（主题检测、颜色映射、Canvas叠加转换）               |
| `src/util/date-utils.ts`  | 日期工具集（格式化、ISO周数、各时间范围计算）                |
| `src/util/dom-utils.ts`   | DOM工具（createEl便捷函数）                                  |
| `src/util/edit-utils.ts`  | 编辑工具（EDIT_BUTTONS12组定义、编辑栏/预览行/复选框DOM构建、hasContentBeenEdited） |
| `src/util/logger.ts`      | 简易日志工具（生产环境仅输出错误）                           |
| `src/util/performance.ts` | 性能工具（throttleByFrame帧节流）                            |

