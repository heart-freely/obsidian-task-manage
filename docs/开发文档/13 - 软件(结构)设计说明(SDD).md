# 软件(结构)设计说明 (SDD)

## 修订记录

| 版本  | 日期       | 修订内容                                                     |
| ----- | ---------- | ------------------------------------------------------------ |
| 2.0.0 | 2026-05-21 | 初始版本                                                     |
| 2.2.0 | 2026-06-11 | 状态键名修正(planned→scheduled)、新增HideConfig结构、面板架构简化、intervalMode扩展、侧边栏简化、数据层引入DataManager |

---

# 引言

## 标识

- **项目名称**：Obsidian Task Manage
- **文档名称**：软件(结构)设计说明 (SDD)
- **版本**：2.2.0
- **更新日期**：2026-06-11

## 系统概述

本插件将 Obsidian 中的任务标记转化为结构化数据，通过19种可视化视图帮助用户管理任务。采用 Store + 组件化 + 方案（Preset）架构：Store 为单一状态源（发布/订阅），Preset 驱动视图配置，Panels 管理器统一控制8个功能面板。业务视图与通用组件完全解耦。

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

**功能视图**：收集（InboxView）、整理（OrganizeView）、组织（看板/矩阵）、回顾（Today/Important/Future/AllTasks）、统计（基础/详细统计图）。

**配置面板**（8个功能栏，默认顺序）：

| 键     | 名称     | 核心能力                                  |
| ------ | -------- | ----------------------------------------- |
| excut  | 筛选状态 | 5种状态多选，主按钮全选/全不选            |
| search | 筛选描述 | 关键词实时过滤，空格分隔且逻辑            |
| mark   | 筛选标记 | 优先级/循环/日期/依赖/标签多选            |
| time   | 筛选时间 | 动态+静态滑动条，三种时间模式             |
| view   | 任务视图 | 4组19种视图样式切换                       |
| hide   | 视图隐藏 | 基于HideConfig的状态/优先级/循环/标记隐藏 |
| sort   | 视图排序 | 14种排序选项+原始顺序                     |
| config | 视图配置 | 名称/图标、导入导出、恢复默认、删除       |

## 命名规范

| 元素      | 规则       | 示例                     |
| --------- | ---------- | ------------------------ |
| 文件名    | kebab-case | `base-task-preset.ts`    |
| 类名      | PascalCase | `BaseTaskView`, `Panels` |
| 函数/变量 | camelCase  | `filterTasks`            |
| CSS类名   | kebab-case | `.task-list`             |

代码风格：TypeScript strict mode，2空格缩进，单引号，必须分号，始终尾逗号。

## 设计原则

1. **数据源分层**：Tasks 格式正则（`TASKS_RX`）解析标记，YAML 属性（`yaName`）用于文件/标题任务属性映射
2. **Store 单一状态源**：发布/订阅模式，`AppState` 包含当前方案、所有方案、侧边栏状态
3. **方案驱动配置**：每个侧边栏按钮对应一个 Preset，保存完整筛选条件、视图样式、面板状态
4. **视图基类统一**：`BaseTaskView` 提供数据获取、筛选、排序、视图切换、分屏布局
5. **组件化复用**：通用视图组件接收数据数组返回 DOM，面板各栏独立封装
6. **筛选状态同步**：`GlobalFilter` 管理筛选条件，`HideConfig` 管理隐藏配置
7. **状态持久化**：Store 通过 `loadData()/saveData()` 自动保存，整理处快照用 `localStorage`
8. **性能优化**：50ms防抖渲染（取消前次未执行渲染并返回Promise），`DataManager` 单例缓存+筛选指纹，面板实例 Map 复用

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
│  单一数据源，发布/订阅，持久化         │
└────────────────┬───────────────────────┘
                 │
┌────────────────▼───────────────────────┐
│           UI 层 (组件化)               │
│  布局(ui.ts) → 面板(panel/)            │
│  → 业务视图(store/preset/)             │
│  → 通用组件(main/)                     │
└────────────────┬───────────────────────┘
                 │
┌────────────────▼───────────────────────┐
│           数据层 (core/)               │
│  解析器(parser/) → 任务树(task/)       │
│  → 数据管理(data/) → 面板计算(panel/)  │
└────────────────────────────────────────┘
```

## 程序(模块)划分

```yaml
组件:
  名称: Store
  描述: 全局状态管理，发布/订阅，持久化
  接口: [getState, update, subscribe, getActivePreset, setSaveFn]
  依赖: [types.ts]

组件:
  名称: Panels
  描述: 面板管理器单例，管理8个功能栏的显隐、排序、高度、复用
  接口: [getInstance, init, syncState, refreshContent, applyVisibility, refreshTimePanel, cleanupAll]
  依赖: [Store, HeadPanel, TimePanel, StatusPanel, SearchPanel, MarkPanel, ViewPanel, HidePanel, SortPanel, PresetPanel]

组件:
  名称: BaseTaskView
  描述: 业务视图基类，防抖渲染(50ms)，分屏布局，19种视图切换
  接口: [render, destroy, renderByStyle, getDefaultFilter, applySort, openTaskAtLine]
  依赖: [Store, DataManager]

组件:
  名称: DataManager
  描述: 单例数据管理器，加载/缓存/筛选。加载完成后清空文件content字段释放内存
  接口: [getInstance, loadData, getFullTree, getFilteredTree, getFlatNodes, getTaskTimeRange, invalidate, invalidateFilterCache]
  依赖: [md-parser, task-tree]

组件:
  名称: TaskCard
  描述: 统一任务卡片，详细/简洁模式，tooltip和点击跳转
  接口: [createTaskCard]
  依赖: [task-format, TooltipManager]
```

## 程序(模块)层次结构关系

```
src/
├── main.ts                         # 插件入口
├── setting/setting.ts              # 设置面板
├── type/type.ts                    # 类型定义
├── core/
│   ├── store/
│   │   ├── store.ts                # Store 类
│   │   └── preset/                 # 方案管理+业务视图(7个文件)
│   ├── config/                     # 核心配置(4个文件)
│   ├── data/data-manager.ts        # DataManager 单例
│   ├── panel/panel-config.ts       # 面板配置计算
│   ├── parser/                     # 解析器(4个文件)
│   ├── task/                       # 任务树/派生/筛选/格式化/编辑(6个文件)
│   ├── component/                  # 日历/甘特图/任务树处理(3个文件)
│   └── command/index.ts            # 命令注册(空)
├── ui/
│   ├── ui.ts                       # ManageView, ViewContainer
│   ├── sidebar/sidebar.ts          # SidebarPanel
│   ├── panel/                      # Panels+9个功能面板(10个文件)
│   ├── main/                       # 通用组件(card/list/table/board/calendar/gantt/chart)
│   └── component/                  # 基础组件(slider/progress/tooltip/editor)
└── util/                           # 工具(4个文件)
```

## 执行概念

**面板管理**：`Panels.init()` 创建宿主容器、标题栏、面板容器、拖拽手柄 → `syncState()` 从 Store 读取状态 → `refreshContent()` 根据 `barVisibility` 和 `toolbarOrder` 动态创建/复用面板实例 → 拖拽手柄调整高度（[30, 85vh]）或折叠/展开。

**方案切换**：侧边栏点击 → `store.update({ activePresetId })` → `Panels.syncState()` + `ViewContainer.refresh()` → 动态加载业务视图类并渲染。

**数据缓存**：`DataManager.loadData()` 首次加载 → 构建完整树 → 建立ID映射 → 清空文件content释放内存。`getFilteredTree(filter)` 使用筛选指纹缓存。`getFlatNodes(filter)` 自动过滤 `display:false` 和虚拟根节点。

**防抖渲染**：`BaseTaskView.render()` 使用50ms定时器防抖。若前次渲染未执行，取消定时器并返回新Promise等待当前渲染完成。

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
}
```

> `wasViewOpen` 是独立于 AppState 的持久化字段，用于记录插件上次关闭时视图是否打开，在 `main.ts` 中单独读写。

### Preset

```typescript
interface Preset {
  id: string;                         // 唯一标识
  name: string;                       // 视图名称
  groupId: string;                    // 分组ID
  businessView: string;               // 业务视图类型(allTasks/inbox/important/today/future/organize)
  viewStyle: string;                  // 视图样式(19种)
  icon?: string;                      // 侧边栏图标(Emoji)
  filter: GlobalFilter;               // 筛选条件
  hideConfig?: HideConfig;            // 隐藏配置
  sort: { type: string; order: 'asc' | 'desc' };
  toolbarOrder?: string[];            // 面板排序
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

### TaskData

```typescript
interface TaskData {
  rawLine: string;                    // 原始行文本
  status: 'todo' | 'scheduled' | 'in-progress' | 'completed' | 'cancelled';
  content: string;                    // 清理后的描述
  priority: number;                   // 0=🔺, 1=⏫, 2=🔼, 3=🔽, 4=⏬, 5=无
  repeat: string;
  created: number | null;             // 时间戳(毫秒)
  scheduled: number | null;
  starts: number | null;
  due: number | null;
  done: number | null;
  cancelled: number | null;
  id: string;
  forbid: string;                     // 依赖ID列表(逗号分隔)
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
  text: string;                       // 显示文本
  display: boolean;                   // 是否可见(HideConfig控制)
  match: boolean;                     // 是否匹配面板筛选条件
  // 继承 TaskData 字段: status/content/priority/repeat/created/scheduled/starts/due/done/cancelled/id/forbid/tag
  headingLevel?: number;              // 标题级别(仅heading类型)
  headingText?: string;               // 标题文本(仅heading类型)
  fileRelations?: FileRelations;      // 文件间关系(仅file类型)
}

interface FileRelations {
  declaredParentName: string | null;          // YAML声明的父任务
  declaredParent: TaskTreeNode | null;        // 解析到的声明父节点
  declaredChildren: TaskTreeNode[];           // 声明本节点为父的子节点
  linkedChildrenNames: string[];              // Wiki链接的子文件名
  linkedChildren: TaskTreeNode[];             // 解析到的链接子节点
  linkedParents: TaskTreeNode[];              // 链接本节点的父节点
  conflict: 'meta_mismatch' | 'meta_missing' | 'link_missing' | null;
  missingLinks: string[];                     // 未能解析的链接
}
```

## 常量

任务标记格式、执行状态符号映射、任务标记顺序等完整定义详见《项目功能和UI设计文档》。以下为UI组件直接依赖的关键常量：

**状态颜色**（`STATUS_COLORS`）：

| 状态        | 颜色    |
| ----------- | ------- |
| todo        | #2e333b |
| scheduled   | #4b525b |
| in-progress | #7fb8f0 |
| completed   | #47852f |
| cancelled   | #c3393e |

**优先级颜色**（`PRIORITY_COLORS`）：🔺=#c3393e, ⏫=#e06c75, 🔼=#d19a66, 🔽=#61afef, ⏬=#98c379

**排序差异标注**：StatusList 排序为 `todo→scheduled→in-progress→cancelled→completed`（已取消在已完成之前）；ProgressBar 段顺序为 `todo→scheduled→in-progress→completed→cancelled`（已完成在已取消之前）。

## 变量

| 变量                   | 类型     | 默认值                                                 | 说明           |
| ---------------------- | -------- | ------------------------------------------------------ | -------------- |
| sidebarCollapsed       | boolean  | false                                                  | 侧边栏折叠     |
| sidebarWidth           | number   | 100                                                    | 侧边栏宽度(px) |
| toolbarPanelsCollapsed | boolean  | false                                                  | 面板折叠       |
| toolbarPanelsHeight    | number   | 300                                                    | 面板高度(px)   |
| intervalMode           | string   | 基类fallback: "scheduled-due"；各预设覆盖为 "any-date" | 时间模式       |
| presets                | Preset[] | 见 panel-default-config.ts                             | 方案列表       |
| toolbarOrder           | string[] | [excut,search,mark,time,view,hide,sort,config]         | 面板排序       |

# 接口设计

## Store

| 方法                                        | 说明                           |
| ------------------------------------------- | ------------------------------ |
| `getState(): AppState`                      | 获取全局状态                   |
| `update(partial: Partial<AppState>): void`  | 更新状态并通知订阅者           |
| `subscribe(listener: Listener): () => void` | 订阅状态变化，返回取消订阅函数 |
| `getActivePreset(): Preset \| undefined`    | 获取当前激活方案               |
| `setSaveFn(fn): void`                       | 设置持久化回调                 |

## Panels

| 方法                                        | 说明                         |
| ------------------------------------------- | ---------------------------- |
| `getInstance(): Panels`                     | 获取单例                     |
| `init(store, viewEl, container, app): void` | 初始化面板管理器             |
| `syncState(): void`                         | 从Store同步面板状态          |
| `refreshContent(): void`                    | 刷新面板内容(复用缓存实例)   |
| `applyVisibility(): void`                   | 应用面板显隐                 |
| `refreshTimePanel(): void`                  | 刷新时间面板(恢复默认时调用) |
| `cleanupAll(): void`                        | 清理所有资源                 |

## BaseTaskView

| 方法                                                         | 说明                                   |
| ------------------------------------------------------------ | -------------------------------------- |
| `render(): Promise<void>`                                    | 渲染视图(50ms防抖，取消前次未执行渲染) |
| `destroy(): void`                                            | 销毁视图                               |
| `renderByStyle(container, nodes, style, filter, intervalMode): void` | 按视图样式渲染                         |
| `getDefaultFilter(): GlobalFilter`                           | 获取默认筛选                           |
| `applySort(nodes, sort): TaskTreeNode[]`                     | 应用排序(空值排最后)                   |
| `openTaskAtLine(node): void`                                 | 打开文件并跳转到任务行                 |

## DataManager

| 方法                                                | 说明                                                    |
| --------------------------------------------------- | ------------------------------------------------------- |
| `getInstance(): DataManager`                        | 获取单例                                                |
| `loadData(app): Promise<{files, nodes, taskIdMap}>` | 加载任务数据(首次后返回缓存，加载完成后清空文件content) |
| `getFullTree(): TaskTreeNode`                       | 获取完整任务树                                          |
| `getFilteredTree(filter): TaskTreeNode`             | 获取筛选后的树(筛选指纹缓存)                            |
| `getFlatNodes(filter): TaskTreeNode[]`              | 获取扁平化筛选结果(过滤display:false和虚拟根节点)       |
| `getTaskTimeRange(): {minTime, maxTime}`            | 获取任务时间范围                                        |
| `invalidate(): void`                                | 清除全部缓存                                            |
| `invalidateFilterCache(): void`                     | 清除筛选缓存                                            |

## 通用组件接口

| 组件              | 函数签名                                                     |
| ----------------- | ------------------------------------------------------------ |
| TaskCard          | `createTaskCard(node: TaskTreeNode, options?: TaskCardOptions): HTMLElement` |
| TaskList          | `renderTaskList(container: HTMLElement, tasks: TaskTreeNode[], options?: TaskListOptions): void` |
| TaskTable         | `renderTaskTable(container, tasks, options?): void`          |
| GroupCard         | `createGroupCard(options: GroupCardOptions): HTMLElement`    |
| ProgressBar       | `createProgressBar(options: ProgressBarOptions): HTMLElement` |
| TaskTree          | `renderTaskTree(container, options: TreeListOptions): void`  |
| Calendar          | `renderCalendarView(container, nodes, options?): void`       |
| Gantt             | `renderGanttWithTree(container, treeRoot, options?): { taskMap, redraw, destroy }` |
| Kanban/Matrix     | `renderKanban(container, nodes): void` / `renderMatrix(container, nodes): void` |
| Statistics/Detail | `renderStatistics(container, nodes): void` / `renderDetail(container, nodes): void` |
| Tooltip           | `tooltip.show(html, x, y)` / `move(x, y)` / `hide()`         |
| Slider            | `createSlider(options): {refs, update, destroy}` / `createEnhancedSlider(options): {refs, updateMidLine, updateLabel}` |

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
| 详细 | 内边距8px 10px, 圆角8px, 左侧3px solid var(--interactive-accent), 描述行font-weight:500, 元数据行0.8em(状态→优先级→循环→创建→计划→开始→取消→完成→截止→id→forbid→tag→文件名) |
| 简洁 | 边框none, 背景transparent, 内边距1px 0, 描述行font-weight:normal+nowrap, 元数据行display:none |

### 分组卡片

| 属性       | 值                                                           |
| ---------- | ------------------------------------------------------------ |
| 背景/边框  | var(--background-primary) / 1px solid border                 |
| 圆角/阴影  | 8px / 0 1px 4px rgba(0,0,0,0.08)                             |
| 左侧颜色条 | 4px solid (按分组类型)                                       |
| 标题栏     | padding 8px 12px, flex, justify-content:space-between, 底边框1px |

---

## 布局与视图管理

### ManageView / ViewContainer

| 属性      | 值                         |
| --------- | -------------------------- |
| 标识符    | `ui.ui`                    |
| 文件      | `src/ui/ui.ts`             |
| Store操作 | 读 activePresetId, presets |

**功能**：插件主视图入口。`ManageView` 继承 `ItemView`，注册为 `manage-view` 类型（图标 `list-checks`，显示名"任务管理"）。`createManageLayout()` 创建三栏布局：侧边栏 + 面板区域(Panels) + 视图区域(ViewContainer)。

**视图加载**：`ViewContainer` 监听 Store，根据 `preset.businessView` 通过 `VIEW_LOADERS` 动态导入对应视图类：

| businessView | 视图类        |
| ------------ | ------------- |
| allTasks     | AllTasksView  |
| inbox        | InboxView     |
| important    | ImportantView |
| today        | TodayView     |
| future       | FutureView    |
| organize     | OrganizeView  |

### Panels（面板管理器）

| 属性      | 值                                                           |
| --------- | ------------------------------------------------------------ |
| 标识符    | `ui.panel.panel`                                             |
| 文件      | `src/ui/panel/panel.ts`                                      |
| 类型      | 单例                                                         |
| Store操作 | 读 toolbarPanelsCollapsed, toolbarPanelsHeight, toolbarOrder, barVisibility |

**功能**：管理所有功能面板的容器、显隐、排序、高度。面板实例通过 `Map<string, any>` 缓存，切换预设时复用。检测输入框聚焦状态，若聚焦则跳过面板内容重建以保护用户输入。

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

**拖拽手柄**：高度8px，始终可见，背景 `rgba(128,128,128,0.4)`，悬停显示。包含箭头(▲/▼)，点击切换折叠。面板折叠时容器 `display:none`，内容区 `paddingTop=8px`；展开时 `paddingTop=面板高度+8px`。

### HeadPanel（标题栏）

| 属性      | 值                                                           |
| --------- | ------------------------------------------------------------ |
| 标识符    | `ui.panel.head-panel`                                        |
| 文件      | `src/ui/panel/head-panel.ts`                                 |
| Store操作 | 读 toolbarOrder, barVisibility; 写 barVisibility, toolbarOrder |

**功能**：渲染可拖拽排序的标题按钮条。每个按钮：文字标签(`panel-header-label`) + 眼睛图标(`panel-eye`，可见时opacity:1，隐藏时opacity:0.4)。

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

**功能**：视图方案导航面板。折叠时宽40px仅显示Emoji，展开时宽度通过按钮内容自适应计算。顶部仅保留折叠/展开按钮(◀/▶)。底部提供新建按钮(➕)，以all-tasks预设为模板创建新方案。

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

**视图切换**：点击业务视图按钮 → `store.update({ activePresetId: preset.id })` → Store通知订阅者 → Panels.syncState() + ViewContainer.refresh()。

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

| 变量                     | 用途                                                        |
| ------------------------ | ----------------------------------------------------------- |
| dynamicStart/End         | 动态滑动条值(相对今天的偏移)                                |
| dynamicUnit              | 动态单位(day/week/month/quarter/year)                       |
| staticStart/End          | 静态滑动条值(绝对日期)，同步到 filter.dateRange             |
| useDynamic               | true时动态→静态单向同步                                     |
| intervalMode             | "any-date"(默认) / "scheduled-due" / "starts-done" / "none" |
| currentMinYear/MaxYear   | 静态滑动条基准年份                                          |
| childSlidersDrivenByYear | true时下级滑块由年级别驱动                                  |
| saved*                   | 取消"使用动态"时恢复。若saved为空，回退到"今年全年"         |

**联动矩阵**：

| 场景                       | 动态→静态                   | 静态→动态 |
| -------------------------- | --------------------------- | --------- |
| useDynamic=true + 拖动动态 | ✅ 同步                      | —         |
| useDynamic=true + 拖动静态 | —                           | ❌ 不影响  |
| useDynamic=false           | ❌ 不影响                    | ❌ 不影响  |
| 点击"使用动态"按钮         | ✅ 同步                      | —         |
| 取消"使用动态"按钮         | 恢复saved(无则回退今年全年) | ❌ 不影响  |

**时间计算模式**：

| 模式          | 起始字段           | 结束字段           | 说明                                                     |
| ------------- | ------------------ | ------------------ | -------------------------------------------------------- |
| any-date      | 所有日期字段最小值 | 所有日期字段最大值 | 默认。日历图/甘特图 `intervalMode="none"` 时回退到此模式 |
| scheduled-due | scheduled          | due                | 无due回退到done                                          |
| starts-done   | starts             | done               | 无done回退到cancelled, 再回退到due                       |
| none          | —                  | —                  | 不做时间筛选，不更新filter.dateRange                     |

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

**滑动条通用设计**：手柄宽度4px高16px（起始`translateX(-100%)` border-radius:3px 0 0 3px，结束`translateX(0)` border-radius:0 3px 3px 0），轨道高4px，填充 `var(--interactive-accent)`。刻度最多20个，今天刻度2px×8px强调色（若step跳过todayVal则单独添加）。拖拽：单手柄只移动该手柄；两手柄间距≥step时可拖拽区间整体移动；点击轨道外就近移动一手柄。所有值 `Math.round` 钳制到 `[min, max]`。

**动态滑动条**：日/周/月/季不允许跨年，年允许跨年(前后5年)。中点标记(偏移0)用强调色标记。说明文字：0→"本日/周/月/季/年"，非0→"前/后N日/周/月/季/年"。文字宽度160px不换行。默认两个手柄在"本日"重合。

**静态滑动条**：年固定为当前年±10。同年时季/月/周/日为全范围，跨年时累加各年份单位总数。格式化使用while循环逐年减去单位数。拖动任一级别后所有级别同步刷新。单值格式如"2026年""2026/2季""2026/6月""2026/23周""2026/6/1日"。

**跨天检测**：每60秒定时检查 + 监听 `active-leaf-change` 和 `layout-change` 事件。使用 `requestAnimationFrame` 防抖。

### StatusPanel（筛选状态）

| 属性      | 值                                     |
| --------- | -------------------------------------- |
| 标识符    | `ui.panel.status-panel`                |
| 文件      | `src/ui/panel/status-panel.ts`         |
| Store操作 | 读 filter.statuses; 写 filter.statuses |

**功能**：按5种执行状态多选筛选。主按钮"状态"控制全选/全不选（全选=空数组），子按钮依次为：待办中/计划中/进行中/已完成/已取消。选中高亮，逻辑为"或"。

**按钮布局**：

```
筛选状态  [状态] [待办中] [计划中] [进行中] [已完成] [已取消]
```

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

**功能**：切换19种视图样式，多选一。分4组：

| 组       | 视图列表                                         |
| -------- | ------------------------------------------------ |
| 基础视图 | 列表、卡片、表格                                 |
| 标记视图 | 状态、优先级、循环、日期、标签、唯一ID、引用ID   |
| 管理视图 | 看板、矩阵、逾期、时间轴、任务树、甘特图、日历图 |
| 统计视图 | 基础统计、详细统计                               |

当前激活视图按钮高亮（`active`类）。按钮仅显示文字，无emoji。

### HidePanel（视图隐藏）

| 属性      | 值                           |
| --------- | ---------------------------- |
| 标识符    | `ui.panel.hide-panel`        |
| 文件      | `src/ui/panel/hide-panel.ts` |
| Store操作 | 读 hideConfig; 写 hideConfig |

**功能**：基于 `HideConfig` 控制任务显隐，7组。隐藏状态下按钮高亮。

**分组与按钮排列**：

| 行标签   | 按钮                                                         |
| -------- | ------------------------------------------------------------ |
| 隐藏状态 | 主按钮"状态" + 待办中/计划中/进行中/已完成/已取消            |
| 隐藏描述 | 文本输入框（placeholder"输入关键词匹配隐藏任务，多个关键词用空格分隔，回车搜索"） |
| 隐藏优先 | 主按钮"优先级" + 🔺⏫🔼🔽⏬                                       |
| 隐藏循环 | 主按钮"循环" + 🔁 every day/week/month/year                   |
| 隐藏时间 | 主按钮"时间" + 创建/计划/开始/取消/完成/截止                 |
| 隐藏依赖 | 主按钮"依赖" + 唯一ID/引用ID                                 |
| 隐藏标签 | 标签（单选）                                                 |

各组主按钮控制对应子按钮全选/全不选，行为与MarkPanel相同。

### SortPanel（视图排序）

| 属性      | 值                           |
| --------- | ---------------------------- |
| 标识符    | `ui.panel.sort-panel`        |
| 文件      | `src/ui/panel/sort-panel.ts` |
| Store操作 | 读 sort; 写 sort             |

**功能**：排序方式切换，多选一（15个按钮：原始 + 14种字段）。"原始"为默认选中（`sort.type=""`），恢复文件原始顺序。再次点击当前排序切换升降序（按钮文字追加"↑"或"↓"）。

**排序字段**：状态、描述、优先级、循环、创建、计划、开始、取消、完成、截止、唯一ID、引用ID、标签、文件名。

### PresetPanel（视图配置）

| 属性      | 值                                                     |
| --------- | ------------------------------------------------------ |
| 标识符    | `ui.panel.preset-panel`                                |
| 文件      | `src/ui/panel/preset-panel.ts`                         |
| Store操作 | 读 presets, activePresetId; 写 presets, activePresetId |

**功能**：管理视图名称（文本输入，max-width:150px）、图标（文本输入，Emoji）。操作按钮：📥导入配置（JSON文件，合并至当前预设）、📤导出配置（JSON文件下载，命名 `task-view-{name}.json`）、🔄恢复默认（重置为 `getDefaultPresets()` 对应预设，自动调用 `Panels.refreshTimePanel()`）、🗑️删除视图（过滤掉当前预设，自动切至剩余第一个）。

## 业务视图

### BaseTaskView

| 属性   | 值                                          |
| ------ | ------------------------------------------- |
| 标识符 | `core.store.preset.base-task-preset`        |
| 文件   | `src/core/store/preset/base-task-preset.ts` |

**功能**：抽象基类，50ms防抖渲染。提供数据获取、筛选、排序、视图切换、分屏布局、任务跳转。

**渲染流程（完整步骤）**：

```
doRender():
  1. 清空容器，清理分屏布局和甘特图实例
  2. 获取当前 preset.filter, preset.viewStyle, preset.intervalMode
  3. dataManager.loadData(app) → 获取所有任务数据
  4. dataManager.getFullTree() → 获取完整任务树
  5. filterTree(fullTree, panelOptions) → 应用面板筛选(状态/描述/优先级/循环/标记)
  6. filterTreeByDateRange(panelFilteredTree, dateRange, intervalMode) → 应用时间筛选
  7. applyHideConfig(dateFilteredTree, hideConfig) → 应用隐藏配置(设置display标志)
  8. 若 selectedTreeNode 存在: flatNodes = collectNodeTasksDeep(selectedTreeNode) → 聚焦子树
     否则: flatNodes = flattenTree(dateFilteredTree)
  9. flatNodes = flatNodes.filter(n => n.display && n.uid !== "__task_root__" && n.match)
     → 过滤display:false、虚拟根节点、match:false的节点
  10. 若 flatNodes 为空: renderEmpty()
  11. applySort(flatNodes, sort) → 排序
  12. tree视图: renderTaskTree(); gantt视图: renderGanttWithTree()
      其他视图: renderSplitLayout() → 左侧任务树导航+右侧内容区
```

**分屏布局**：左侧任务树导航（宽度默认280px，可拖拽调整200-500px，折叠时0px+拖拽手柄），右侧内容区（flex:1）。任务树导航点击节点：tree/gantt视图→跳转文件；其他视图→聚焦子树（设置selectedTreeNode）并重新渲染。

**排序算法**：

```
applySort(nodes, sort):
  1. 复制数组; order = sort.order === 'asc' ? 1 : -1
  2. 根据 sort.type 确定排序字段(status→状态顺序映射, description→content.toLowerCase,
     priority→priority, scheduled/due/created/starts/done/cancelled→时间戳, 其他→字段值)
  3. 空值排最后; 字符串用 localeCompare; 数字用减法
  4. 返回排序后数组
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

**任务跳转**：

```
openTaskAtLine(node):
  1. app.vault.getAbstractFileByPath(node.path) → 获取文件
  2. workspace.getLeaf(false).openFile(file)
  3. 延迟150ms后尝试滚动(最多重试5次，每次间隔100ms):
     editor.setCursor({ line: targetLine, ch: 0 })
     editor.scrollIntoView({ from: {line: targetLine-1}, to: {line: targetLine+5} })
     延迟50ms再次 scrollIntoView 精确到目标行
```

### 业务视图子类

| 视图          | 文件                     | 默认筛选差异                                                 |
| ------------- | ------------------------ | ------------------------------------------------------------ |
| AllTasksView  | all-task-preset.ts       | 使用基类默认（无特殊筛选）                                   |
| InboxView     | inbox-task-preset.ts     | statuses=["todo","scheduled"]; 空态"📭 暂无待办任务"          |
| ImportantView | important-task-preset.ts | statuses=["todo","scheduled","in-progress"], priorityValues=["🔺","⏫","🔼"]; 空态"⭐ 暂无重要任务" |
| TodayView     | today-task-preset.ts     | statuses=["todo","scheduled","in-progress"], dateRange=今天; intervalMode="any-date"; 空态"📅 今天没有符合条件的任务" |
| FutureView    | future-task-preset.ts    | statuses=["todo","scheduled","in-progress"], dateRange=今天~+15天; intervalMode="any-date"; 空态"🔜 暂无未来任务" |
| OrganizeView  | organize-task-preset.ts  | 覆写 render() 实现批量编辑界面; hideRepeat=false             |

### OrganizeView 批量编辑

**四种筛选模式**（四选一）：

| 模式                | 条件                                                   |
| ------------------- | ------------------------------------------------------ |
| 未完成&缺失必需标记 | (todo或planned) 且缺失(优先级/创建/计划/开始/截止)任一 |
| 未完成&格式完整     | (todo或planned) 且不缺失必需标记                       |
| 已完成&缺失必需标记 | (in-progress/completed/cancelled) 且缺失必需标记       |
| 已完成&格式完整     | (in-progress/completed/cancelled) 且不缺失必需标记     |

**编辑操作**：优先级(修改/删除)、循环(修改/删除)、日期标记(设为今天/删除)、标签(🏁 keep/delete/自定义/删除)、唯一ID(生成随机6位/自定义/删除)、引用ID(删除)、补全时间(调用 `Op.autoComplete(line, 3)`：从完成日期前推3天=开始日期，计划日期=开始日期，创建日期=开始日期，截止日期=完成日期)、排序标记(调用 `Op.sortTags(line)`：按固定顺序重排)。

**预览累积规则**：初次勾选时预览=原始文本；每次点击编辑按钮基于上一次预览结果更新（而非原始文本）。已确认(✔)的任务行不参与后续编辑。

**快照管理**：最近5次快照存储在 `localStorage`(键`organizeSnapshots`)。每次"保存所有修改"前自动创建快照（记录被修改任务的原始文本）。撤回时读取最近快照并写入文件。

**界面布局**：筛选模式切换行 → 编辑工具栏（全选/全不选 + 各标记编辑按钮组 + 补全时间 + 排序标记）→ 任务列表（每行：复选框 + 原始文本 + 预览/已修改状态 + 确定/撤回按钮）→ 底部操作栏（💾保存所有修改 + ↩撤回上次保存）。

## 通用视图组件

### 卡片组件

| 组件      | 文件                 | 说明                                                         |
| --------- | -------------------- | ------------------------------------------------------------ |
| TaskCard  | `card/card.ts`       | 统一任务卡片。`buildDescription()` 添加类型标记（📄文件/H标题/●列表），标题任务去除number headings序号，详细模式不显示tooltip（信息已在元数据行中） |
| GridCard  | `card/grid-card.ts`  | 卡片网格：`grid, repeat(auto-fill, minmax(280px, 1fr)), gap:12px` |
| GroupCard | `card/group-card.ts` | 分组卡片：左侧4px颜色条，标题栏(flex, space-between)，内容区遍历tasks |

### 列表组件

| 组件          | 文件                     | 分组依据                                     | 颜色                   |
| ------------- | ------------------------ | -------------------------------------------- | ---------------------- |
| TaskList      | `list/list.ts`           | 无(平铺)                                     | —                      |
| StatusList    | `list/status-list.ts`    | 状态(待办→计划→进行中→已取消→已完成)         | STATUS_COLORS          |
| PriorityList  | `list/priority-list.ts`  | 优先级(🔺→⏫→🔼→🔽→⏬→无)                         | 优先级色               |
| RecurringList | `list/recurring-list.ts` | 循环周期(every day→week→month→year), 2×2网格 | 四色循环               |
| TimeList      | `list/time-list.ts`      | 计划日期(升序，无日期排最后)                 | rgba(97,175,239,0.25)  |
| TimelineList  | `list/timeline-list.ts`  | 截止日期(升序)                               | rgba(97,175,239,0.25)  |
| TagList       | `list/tag-list.ts`       | 标签值                                       | 五色循环               |
| UniqueIdList  | `list/uniqueId-list.ts`  | 有唯一ID的任务                               | rgba(140,120,200,0.25) |
| DependsList   | `list/depends-list.ts`   | 有引用ID的任务                               | rgba(224,108,117,0.25) |
| OverdueList   | `list/overdue-list.ts`   | 逾期天数(降序)                               | rgba(224,108,117,0.25) |

**逾期判断**：未完成任务(截止日期<今天)，已完成/已取消任务(截止日期<完成日期)。

### 表格 / 看板 / 矩阵

| 组件      | 文件                    | 说明                                                         |
| --------- | ----------------------- | ------------------------------------------------------------ |
| TaskTable | `table/table.ts`        | 默认可见列：类型/状态/描述/优先级/计划/开始/取消/截止。空列自动隐藏（所有行值为空字符串则整列不渲染）。描述列 `white-space:normal; word-break:break-word`，其他列 `nowrap`。 |
| Kanban    | `board/kanban-board.ts` | 三列横向(flex, gap:12px)：待办中/计划中/进行中。仅筛选这三种状态的任务。 |
| Matrix    | `board/matrix-board.ts` | 四象限(grid, 2×2, gap:12px)：🔺紧急重要 / ⏫不紧急重要 / 🔼紧急不重要 / 🔽⏬不紧急不重要。仅筛选有优先级的任务。 |

### 日历视图

| 属性   | 值                                                         |
| ------ | ---------------------------------------------------------- |
| 标识符 | `ui.main.calendar`                                         |
| 文件   | `src/ui/main/calendar/calendar.ts`(统一入口) + 5个委托文件 |

**功能**：统一入口根据 `subView` 参数分发日/周/月/季/年视图。工具栏逆序排列(年→季→月→周→日)。`intervalMode="none"` 时回退为 `"any-date"`。

**数据处理**：

```
buildDateTaskMap(nodes, intervalMode):
  1. 遍历节点，调用 getTaskInterval 获取时间区间
  2. 仅将首日期和尾日期加入映射(中间日期不加入)
  3. 使用 added Set(uid|dateKey) 去重，防止同一天重复添加

buildCellItems(date, dateTaskMap, intervalMode):
  1. 获取当天任务列表
  2. 遍历每个任务:
     - 首日期或尾日期落在当天 → type: "task"(显示卡片)
     - 中间日期(非首尾) → 当天=今天时 type: "task"，否则 type: "line"(显示彩色线条)
     - 其他(有interval但不在区间内) → type: "placeholder"(占位)
  3. 全局排序: buildGlobalOrder(优先级→状态)
```

**格子渲染**：最小高度40px，最大高度280px。超出 `MAX_VISIBLE_ITEMS_IN_CELL(5)` 时显示"+N个任务"指示器，点击展开格子(`grid-column:span 2`)。其他月份日期半透明。今天格子2px solid `var(--text-accent)`。

**年视图热力图**：12个月卡片(grid, 4列)，每天格子颜色 `rgba(64, 120, 209, 0.1 + count/maxCount * 0.9)`。今天格子2px边框。

**空时间段**：与任务无交集的年/季/月/周仅显示紧凑标签（小字体、次要背景色、小圆角），排列在内容区底部。

### 甘特图

| 属性   | 值                           |
| ------ | ---------------------------- |
| 标识符 | `ui.main.gantt`              |
| 文件   | `src/ui/main/gantt/gantt.ts` |

**功能**：左侧任务树 + 右侧时间轴。返回 `{ taskMap: Map<string, TaskTreeNode>, redraw: () => void, destroy: () => void }`。`taskMap` 存储任务ID到节点的映射，供依赖箭头绘制使用。`redraw` 在缩放或树折叠后重建。

**时间轴头部构建**：

```
createTimelineHeader():
  1. 根据 dayWidth 确定显示层级: dayWidth≥40→年月季周日, ≥15→年月季周, ≥5→年月季, ≥1.5→年月
  2. 平均分配各层高度 = HEADER_HEIGHT / 层数
  3. 从底到顶渲染: 日层→周层→月层→季层→年层
  4. 每层遍历 totalDays，当前值变化时创建标签div
  5. 今日线: 2px solid var(--interactive-accent), opacity:0.5
```

**甘特条**：高20px圆角4px，颜色用 `STATUS_COLORS`。已完成任务显示进度填充（`rgba(46,125,50,0.5)`）。右侧显示时长标签（days→d, weeks→w, months→m, years→y）。tooltip：第一行显示节点任务文本（带类型标记）+ 完整任务信息。

**依赖箭头**（SVG）：

```
calcDependencyPath(sx, sy, tx, ty):
  从ID任务的完成时间侧中线末端 → 引用ID任务的开始时间侧左上角
  折线: M sx,sy → L (tx-arrowSize),sy → L (tx-arrowSize),ty
  箭头: triangle at (tx, ty)
  hover: 14px透明stroke扩大可点击区域，显示依赖tooltip
```

**折叠更新机制**：任务树节点折叠/展开时触发 `tree-toggle` 自定义事件 → `requestAnimationFrame` 回调中：重算树宽度 → 更新内容区总宽度 → 更新时间轴头部 → 重建网格背景 → 重建今日线 → 更新甘特条位置 → `svg.__redraw()` 重绘依赖箭头。

**缩放**：Alt+滚轮缩放（dayWidth [0.5, 40]，步进 ×1.3/×0.7）。以鼠标位置为中心保持时间点不变。缩放状态持久化到 `localStorage`(键`ganttZoomState`)。

### 任务树

| 属性   | 值                              |
| ------ | ------------------------------- |
| 标识符 | `ui.main.list.tree-list`        |
| 文件   | `src/ui/main/list/tree-list.ts` |

**功能**：树形结构展示文件/标题/列表任务。支持聚焦子树、折叠展开、排序、进度条。

**节点显示格式**：

| 节点类型 | 显示格式                                  | 识别条件                                   |
| -------- | ----------------------------------------- | ------------------------------------------ |
| 文件任务 | 📄 + 文件名                                | 页面YAML frontmatter解析或内容中有标记任务 |
| 标题任务 | H级别 + 标题文本(去除number headings序号) | 标题下有标题YAML块，或有子列表任务         |
| 列表任务 | ● + 任务描述                              | 匹配 `TASK_REGEX` 的任务行                 |

**缩进**：`INDENT_WIDTH=24px`。文件任务 `depth*24px`，标题/列表任务再+1级。

**行容器结构**：折叠按钮(16px, ▼/▶)或占位符 + 内容容器(TaskCard compact+showTooltip + 进度条60px×8px + 百分比 + 数量徽章) + 右侧弹性空间。

**排序规则**：同一节点下固定分组顺序（列表任务→标题任务→文件任务）。若指定sort，各组内部按sort.type排序。实现函数：`sortFileNodes()`、`sortContentNodes()`。

**进度条统计**：`countNodeStatuses()` 收集所有子孙任务的各状态数量（去重uid，排除虚拟根节点和display:false节点）。

**虚拟根节点**：全树模式显示"🗂️ 任务管理"+所有子节点合并进度条+总数。聚焦模式显示"📂 节点名称"标题栏，点击恢复全树。

**交互**：折叠按钮切换子节点显示/隐藏，触发 `tree-toggle` 事件。悬停文字显示浅色背景+tooltip。悬停进度条显示各状态数量和百分比。点击节点调用 `onClick` 或 `openTaskAtLine`。

**onRowRender 回调**：`onRowRender(rowEl, node)` 在行容器添加到父元素后调用，供甘特图在行上附加甘特条DOM。

### 统计图表

| 组件       | 文件                        | 说明                                                         |
| ---------- | --------------------------- | ------------------------------------------------------------ |
| Statistics | `chart/statistics-chart.ts` | ECharts饼图矩阵（6个饼图）：执行状态/优先级/循环周期/日期标记/依赖关系/标签。自适应主题文字颜色。无数据时显示灰色"无数据"。 |
| Detail     | `chart/detailc-chart.ts`    | ECharts堆叠柱状图。按计划日期分组，展示各状态日分布。点击🔍放大全屏查看。 |

### 基础组件

| 组件        | 文件                             | 说明                                                         |
| ----------- | -------------------------------- | ------------------------------------------------------------ |
| ProgressBar | `component/progress/progress.ts` | 按状态顺序(todo→scheduled→in-progress→completed→cancelled)渲染分段。支持百分比显示。tooltip顺序：待办中→计划中→进行中→已取消→已完成（与StatusList一致，与段顺序不同）。 |
| Tooltip     | `component/tooltip/tooltip.ts`   | 单例。定位鼠标右下方(x+15,y+15)。全局mousemove检测离开任务相关区域（`.task-item,.gantt-bar,.cal-task-item,.cal-span-line,.task-progress-bar,.cal-more-indicator`）时延时100ms隐藏。 |
| Slider      | `component/slider/slider.ts`     | 通用双滑块。`createSlider` 返回 `{refs, update, destroy}`。`createEnhancedSlider` 额外支持刻度标记、todayValue标记线、midLine、右侧标签（labelWidth 160px）。 |

## 数据层

### DataManager

| 属性   | 值                              |
| ------ | ------------------------------- |
| 标识符 | `core.data.data-manager`        |
| 文件   | `src/core/data/data-manager.ts` |
| 类型   | 单例                            |

**功能**：首次 `loadData(app)` → `loadAllTaskFiles(app)` → `buildTaskTree(files)` → 建立 `taskIdMap`(uid→node 和 id→node) → 清空所有文件的 `content` 字段释放内存 → 返回 `{files, nodes, taskIdMap}`。后续调用直接返回缓存。

**筛选指纹**：`filterFingerprint = JSON.stringify({ statuses, searchText, priorityValues, repeatCycles }.sort)`。指纹相同时直接返回缓存的筛选树。

**扁平化过滤**：`getFlatNodes()` 返回 `flattenTree(getFilteredTree()).filter(n => n.display && n.uid !== "__task_root__")`。

### 解析器

| 解析器          | 文件                             | 说明                                                         |
| --------------- | -------------------------------- | ------------------------------------------------------------ |
| md-parser       | `core/parser/md-parser.ts`       | Markdown文件解析：YAML提取（`parseFrontmatter`）→标题识别（`#{1,6}`）→内容结构构建（ContentNode树）。识别标题YAML块（` ```yaml/yml ``` `）解析标题任务属性。`promoteToHeadingTasks()` 自动将有子列表任务的标题提升为标题任务。 |
| tasks-parser    | `core/parser/tasks-parser.ts`    | `TASK_REGEX = /^\s*-\s*\[([符号])\]\s+(.+)$/`。通过 `TASKS_RX` 正则解析各标记字段。`cleanText` 移除所有标记后返回纯描述。 |
| dataview-parser | `core/parser/dataview-parser.ts` | 解析 inline字段 `[key:: value]` 和 emoji日期简写（无空格，如 `🗓️2026-01-15`）。 |
| task-parser     | `core/parser/task-parser.ts`     | YAML属性解析。通过 `yaName`（如"任务状态""任务优先级"等）映射到 `TaskData` 字段。日期字段自动提取 `YYYY-MM-DD` 格式。 |

### 任务树构建与筛选

| 模块         | 文件                        | 说明                                                         |
| ------------ | --------------------------- | ------------------------------------------------------------ |
| task-tree    | `core/task/task-tree.ts`    | `buildTaskTree(files)`：为每个文件创建file节点→解析文件间关系（YAML"父任务"字段+Wiki链接）→检测冲突(meta_mismatch/meta_missing/link_missing)→建立父子关系（优先使用YAML声明，其次Wiki链接）→创建虚拟根节点 `__task_root__`。 |
| tree-filter  | 同上                        | `filterTree(root, options)`：按面板条件筛选，设置节点 `match` 标志。`filterTreeByDateRange()`：按时间范围筛选。`applyHideConfig()`：应用隐藏配置设置 `display` 标志。`flattenTree()`：深度优先遍历+Set去重。 |
| task-derived | `core/task/task-derived.ts` | `getTaskMarks(node)`→各标记是否存在。`getTaskTimeRange(node, mode)`：支持4种intervalMode。`getStatusIcon/Name`、`getPriorityIcon/Name`。 |
| task-filter  | `core/task/task-filter.ts`  | `filterTasks(nodes, filter)`：纯函数，顺序应用日期→状态→标记→路径→搜索文本→优先级→循环周期筛选。 |
| task-format  | `core/task/task-format.ts`  | `buildMetaRow`：构建元数据行HTML（状态→优先级→循环→创建→计划→开始→取消→完成→截止→id→forbid→tag→文件名）。`buildTooltip`：构建tooltip HTML（状态→优先级→循环→创建→计划→开始→截止→完成→取消→id→forbid→tag）。`buildDescription`：构建描述文本（添加类型标记📄/H/●，标题去除number headings序号）。 |

### 任务编辑器

| 属性   | 值                             |
| ------ | ------------------------------ |
| 标识符 | `core.task.task-editor`        |
| 文件   | `src/core/task/task-editor.ts` |

**功能**：`Op` 对象提供 `setPriority/delPriority/setRepeat/delRepeat/setCreated/delCreated/.../autoComplete/sortTags` 等方法。所有标记操作基于 `replaceMark(line, regex, newMark?)` 函数（newMark=undefined时删除标记）。

**autoComplete算法**：

```
Op.autoComplete(line, days=3):
  1. 匹配完成日期(done)；若无完成日期则返回原行
  2. 先调用 sortTags(line) 排序
  3. 截止日期 = 完成日期；开始日期 = 完成日期 - days天
  4. 计划日期 = 开始日期；创建日期 = 开始日期
  5. 再次 sortTags 返回
```

**批量写入**：`writeToFiles(app, nodes, taskIds, linesMap)` 按文件路径分组 → 对每个文件调用 `app.vault.process(file, data => ...)` 替换指定行。

**快照管理**：`loadSnapshots()`/`saveSnapshots()`/`addSnapshot(map)` 操作 `localStorage`(键`organizeSnapshots`，最多5个)。

## 持久化与设置

### 插件设置面板

| 属性 | 值                       |
| ---- | ------------------------ |
| 文件 | `src/setting/setting.ts` |

**可配置项**：

| 设置项       | 说明                                                         |
| ------------ | ------------------------------------------------------------ |
| 任务路径     | 多行文本，每行一个文件夹路径。支持下拉搜索文件夹（调用 `app.vault.getAllLoadedFiles()` 获取文件夹列表）。 |
| 文件夹过滤器 | 模式(pattern)、大小写敏感(Aa)、全词匹配(ab)、正则匹配、排除模式。 |
| 文件过滤器   | 同上                                                         |
| 标题过滤器   | 同上                                                         |
| 任务项过滤器 | 状态符号（如 x ?）、排除模式                                 |

所有设置通过 `updateTaskFileConfig()` 实时更新到 `TASK_ROOT_PATHS` 和各过滤器变量。

### 数据持久化

| 存储方式                              | 内容                                                         |
| ------------------------------------- | ------------------------------------------------------------ |
| `Plugin.loadData()/saveData()`        | AppState(presets, sidebarCollapsed, sidebarWidth, activePresetId) + settings(taskRootPath, 四级过滤器) |
| `localStorage`(键`organizeSnapshots`) | 整理处最近5次编辑快照 `[{ time, snapshot: Record<uid, rawLine> }]` |
| `localStorage`(键`ganttZoomState`)    | 甘特图缩放状态 `{ dayWidth }`                                |

**版本兼容**：`main.ts` 加载时将保存数据与 `getDefaultPresets()` 合并。非空数组优先使用保存值，空数组回退默认值。`wasViewOpen` 独立于AppState存储，用于判断插件重载后是否恢复视图。

# CSCI集成测试要点

| 测试场景         | 验证点                                                       |
| ---------------- | ------------------------------------------------------------ |
| 侧边栏折叠/展开  | 宽度切换(40px↔自适应)，按钮内容变化(图标↔图标+文字)，状态持久化 |
| 侧边栏宽度自适应 | 按钮宽度统一对齐，容器无多余留白                             |
| 视图切换         | 右侧内容+面板状态同步刷新，预设数据正确恢复                  |
| 面板拖拽排序     | 标题按钮顺序更新，面板排列同步，持久化                       |
| 眼睛按钮显隐     | 面板显示/隐藏，折叠时自动展开，标题按钮透明度变化            |
| 面板高度调整     | 拖拽实时生效，释放持久化，范围钳制[30, 85vh]                 |
| 面板复用         | 切换预设时已存在面板不重建，输入框聚焦时跳过刷新             |
| 时间滑动条联动   | useDynamic控制动态→静态单向同步，取消时恢复saved(无saved回退今年全年) |
| 时间模式切换     | intervalMode变化时筛选结果相应变化。日历/甘特图none→回退any-date |
| 筛选组合         | 状态+描述+标记+时间多条件筛选正确，全选(空数组)时不过滤      |
| 视图样式         | 19种视图正确渲染，空数据空状态文本正确                       |
| 排序             | 14种排序+原始顺序正确，升降序切换，空值排最后                |
| 任务树           | 三种节点类型正确显示，折叠展开+tree-toggle事件，进度条统计(去重)，排序和缩进 |
| 日历             | 日/周/月/季/年视图正确，格子渲染(卡片/线条/占位符)，年视图热力图颜色，空时间段标签 |
| 甘特图           | 甘特条位置颜色正确，Alt+滚轮缩放(以鼠标为中心)，拖拽平移，依赖箭头，折叠更新机制 |
| 任务跳转         | 点击任务跳转到文件正确位置并滚动到可见区域                   |
| 整理处           | 编辑预览累积(基于上次预览)，确定修改写入文件，快照撤回恢复   |
| 持久化           | 插件重载后侧边栏/面板/预设/筛选/排序/隐藏状态正确恢复。wasViewOpen恢复视图 |
| 防抖渲染         | Store快速连续更新时仅最后一次触发实际渲染                    |
| 数据缓存         | DataManager筛选指纹缓存命中，invalidate后重新加载            |
| 设置面板         | 任务路径/四级过滤器修改后实时生效，下拉搜索文件夹正确        |

# 需求的可追踪性

本SDD对应的需求详见《项目功能和UI设计文档》。各模块与功能的映射关系：

| 模块                          | 对应功能需求                                                 |
| ----------------------------- | ------------------------------------------------------------ |
| SidebarPanel                  | 侧边栏功能设计、侧边栏UI设计                                 |
| Panels + 各功能面板           | 视图配置面板功能设计、视图配置面板UI设计、各筛选/排序/隐藏/配置功能 |
| BaseTaskView + 业务视图子类   | 业务视图设计（待办/今天/未来/重要/所有任务）                 |
| 通用视图组件(19种)            | 通用视图UI设计（列表/卡片/表格/看板/矩阵/日历/甘特图/任务树/统计图表等） |
| DataManager + 解析器 + 任务树 | 任务数据读取与解析、任务树数据结构                           |
| 任务编辑器 + OrganizeView     | 通用编辑视图设计（单个编辑/批量编辑）                        |
| Store + 设置面板              | 持久化设计、插件配置                                         |

# 注解

## 当前已知限制

- 级联日期联动逻辑未实现（独立滑动条）
- 甘特图依赖箭头实时更新待增强
- 移动端适配未充分测试
- 批量编辑器（`bulk-editor.ts`、`single-editor.ts`）为占位文件
- `task-writer.ts` 为空文件
- `presetGroups` 方案分组为预留字段，侧边栏当前不按分组渲染

## 术语表

| 术语          | 说明                                                         |
| ------------- | ------------------------------------------------------------ |
| Preset        | 视图方案，保存完整筛选条件、视图样式、面板状态               |
| Store         | 全局状态管理器，发布/订阅模式                                |
| Panels        | 面板管理器单例，管理8个功能面板                              |
| DataManager   | 数据管理器单例，统一数据加载和缓存                           |
| HideConfig    | 隐藏配置接口，独立于 GlobalFilter                            |
| GlobalFilter  | 全局筛选条件接口                                             |
| intervalMode  | 时间计算模式：scheduled-due(计划~截止) / starts-done(开始~完成) / any-date(任意日期匹配) / none(不做时间筛选) |
| TaskTreeNode  | 任务树节点，统一数据结构                                     |
| ContentNode   | 文件内容解析节点(heading/task)                               |
| FileRelations | 文件间父子关系（YAML声明+Wiki链接）                          |

# 附录

## 涉及文件清单

| 文件                                             | 职责                       |
| ------------------------------------------------ | -------------------------- |
| `src/main.ts`                                    | 插件入口                   |
| `src/type/type.ts`                               | 类型定义                   |
| `src/setting/setting.ts`                         | 设置面板                   |
| `src/core/store/store.ts`                        | Store                      |
| `src/core/store/preset/preset.ts`                | 方案管理                   |
| `src/core/store/preset/base-task-preset.ts`      | 业务视图基类               |
| `src/core/store/preset/all-task-preset.ts`       | 所有任务视图               |
| `src/core/store/preset/inbox-task-preset.ts`     | 待办任务视图               |
| `src/core/store/preset/important-task-preset.ts` | 重要任务视图               |
| `src/core/store/preset/today-task-preset.ts`     | 今天任务视图               |
| `src/core/store/preset/future-task-preset.ts`    | 未来任务视图               |
| `src/core/store/preset/organize-task-preset.ts`  | 整理处视图                 |
| `src/core/config/config.ts`                      | 核心配置                   |
| `src/core/config/tasks-config.ts`                | Tasks格式定义              |
| `src/core/config/dataview-config.ts`             | Dataview格式定义           |
| `src/core/config/panel-default-config.ts`        | 面板默认配置               |
| `src/core/data/data-manager.ts`                  | DataManager                |
| `src/core/panel/panel-config.ts`                 | 面板配置计算               |
| `src/core/parser/md-parser.ts`                   | Markdown解析器             |
| `src/core/parser/tasks-parser.ts`                | Tasks解析器                |
| `src/core/parser/dataview-parser.ts`             | Dataview解析器             |
| `src/core/parser/task-parser.ts`                 | YAML解析器                 |
| `src/core/task/task-tree.ts`                     | 任务树构建+筛选+扁平化     |
| `src/core/task/task-derived.ts`                  | 任务派生数据               |
| `src/core/task/task-filter.ts`                   | 扁平任务筛选               |
| `src/core/task/task-format.ts`                   | 任务格式化                 |
| `src/core/task/task-editor.ts`                   | 任务编辑器                 |
| `src/core/component/calendar-view-process.ts`    | 日历视图处理               |
| `src/core/component/gantt-view-process.ts`       | 甘特图处理                 |
| `src/core/component/tree-view-process.ts`        | 任务树处理                 |
| `src/core/command/index.ts`                      | 命令注册                   |
| `src/ui/ui.ts`                                   | ManageView + ViewContainer |
| `src/ui/sidebar/sidebar.ts`                      | SidebarPanel               |
| `src/ui/panel/panel.ts`                          | Panels                     |
| `src/ui/panel/head-panel.ts`                     | HeadPanel                  |
| `src/ui/panel/time-panel.ts`                     | TimePanel                  |
| `src/ui/panel/status-panel.ts`                   | StatusPanel                |
| `src/ui/panel/search-panel.ts`                   | SearchPanel                |
| `src/ui/panel/mark-panel.ts`                     | MarkPanel                  |
| `src/ui/panel/view-panel.ts`                     | ViewPanel                  |
| `src/ui/panel/hide-panel.ts`                     | HidePanel                  |
| `src/ui/panel/sort-panel.ts`                     | SortPanel                  |
| `src/ui/panel/preset-panel.ts`                   | PresetPanel                |
| `src/ui/main/card/card.ts`                       | 任务卡片                   |
| `src/ui/main/card/grid-card.ts`                  | 卡片网格                   |
| `src/ui/main/card/group-card.ts`                 | 分组卡片                   |
| `src/ui/main/list/list.ts`                       | 任务列表                   |
| `src/ui/main/list/status-list.ts`                | 状态列表                   |
| `src/ui/main/list/priority-list.ts`              | 优先级列表                 |
| `src/ui/main/list/recurring-list.ts`             | 循环列表                   |
| `src/ui/main/list/time-list.ts`                  | 时间列表                   |
| `src/ui/main/list/timeline-list.ts`              | 时间轴列表                 |
| `src/ui/main/list/tag-list.ts`                   | 标签列表                   |
| `src/ui/main/list/uniqueId-list.ts`              | 唯一ID列表                 |
| `src/ui/main/list/depends-list.ts`               | 依赖列表                   |
| `src/ui/main/list/overdue-list.ts`               | 逾期列表                   |
| `src/ui/main/list/tree-list.ts`                  | 任务树列表                 |
| `src/ui/main/table/table.ts`                     | 表格                       |
| `src/ui/main/board/kanban-board.ts`              | 看板                       |
| `src/ui/main/board/matrix-board.ts`              | 矩阵                       |
| `src/ui/main/calendar/calendar.ts`               | 统一日历                   |
| `src/ui/main/calendar/day-calendar.ts`           | 日视图                     |
| `src/ui/main/calendar/week-calendar.ts`          | 周视图                     |
| `src/ui/main/calendar/month-calendar.ts`         | 月视图                     |
| `src/ui/main/calendar/quarter-calendar.ts`       | 季视图                     |
| `src/ui/main/calendar/year-calendar.ts`          | 年视图                     |
| `src/ui/main/gantt/gantt.ts`                     | 甘特图                     |
| `src/ui/main/chart/echart.ts`                    | ECharts封装                |
| `src/ui/main/chart/statistics-chart.ts`          | 基础统计图                 |
| `src/ui/main/chart/detailc-chart.ts`             | 详细统计图                 |
| `src/ui/component/slider/slider.ts`              | 滑动条                     |
| `src/ui/component/progress/progress.ts`          | 进度条                     |
| `src/ui/component/tooltip/tooltip.ts`            | Tooltip                    |
| `src/ui/component/editor/bulk-editor.ts`         | 批量编辑器(占位)           |
| `src/ui/component/editor/single-editor.ts`       | 单个编辑器(占位)           |
| `src/util/date-utils.ts`                         | 日期工具                   |
| `src/util/dom-utils.ts`                          | DOM工具                    |
| `src/util/logger.ts`                             | 日志工具                   |
| `src/util/performance.ts`                        | 性能工具                   |

