---
标准: GB/T 8567-2006
版本: 1.0.0
生成时间: 2026-05-15
文档名称: 13 - 软件(结构)设计说明 (SDD)
项目名称: Obsidian 任务管理插件
"@ai-rewrite": preserve
"@ai-merge": append
"@ai-human-sections":
    - "## 全局数据结构说明"
    - "## 接口设计"
    - "## CSCI详细设计"
---

说明：

1. 《软件(结构)设计说明》(SDD)描述了计算机软件配置项(CSCI)的设计。它描述了CSCI级设计决策、CSCI体系结构设计(概要设计)和实现该软件所需的详细设计。SDD可用接口设计说明IDD和数据库(顶层)设计说明DBDD加以补充。
2. SDD连同相关的IDD和DBDD是实现该软件的基础。向需方提供了设计的可视性，为软件支持提供了所需要的信息。
3. IDD和DBDD是否单独成册抑或与SDD合为一份资料视情况繁简而定。

# 引言

### 标识

- **项目名称**：Obsidian Task Manage
- **文档名称**：软件(结构)设计说明 (SDD)
- **版本**：2.0.0
- **更新日期**：2026-05-21

### 系统概述

这是一个功能丰富的 Obsidian 任务管理插件，基于 Dataview 和 Tasks 插件 API，采用 Store + 组件化架构。系统将 Obsidian 中的任务标记从纯文本转化为结构化数据，通过多种可视化视图（列表、看板、矩阵、日历、甘特图、时间线、任务树、统计图表等）帮助用户高效管理任务。

**新版架构核心特点**：

- 以 **Store（发布/订阅）** 为单一状态源，全局状态共享
- **方案（Preset）** 驱动视图配置，支持保存、切换、导入/导出
- **工具栏（Toolbar）** 由多个可独立显隐的功能栏组成，支持拖动排序
- 业务视图与通用组件完全解耦，同一数据可切换多种展示形式
- 侧边栏管理视图方案，支持折叠/展开、自定义图标

系统遵循"数据源分层、视图基类统一、全局状态共享"的架构原则，确保各视图之间筛选条件一致、交互体验统一。

### 文档概述

本文档描述 Obsidian Task Manage 插件的完整设计，包括架构决策、模块划分、数据结构、接口定义及详细设计。文档结构遵循 CSCI 级设计规范，为开发和维护提供完整参考。

### 基线

- Obsidian API 版本：≥ 0.15.0
- TypeScript 5.x + esbuild
- 依赖插件：Dataview、Obsidian Tasks

# 引用文件

- Obsidian API 文档：https://docs.obsidian.md
- 官方示例插件：https://github.com/obsidianmd/obsidian-sample-plugin
- ECharts 文档：https://echarts.apache.org/
- GB/T 8567-2006 软件文档编制规范

# CSCI级设计决策

## 功能描述

本系统的核心功能包括：任务数据读取与解析、多视图展示、全局筛选与排序、任务编辑与批量修改、状态持久化。

系统按功能分为以下核心模块：

- **收集**：任务收集箱，展示未开始/计划中任务
- **整理**：任务整理处，批量编辑任务标记
- **组织**：任务矩阵、看板，按优先级/状态组织任务
- **回顾**：重要任务、循环任务、今天任务、未来任务、逾期任务、依赖任务、标签任务等
- **执行**：通过工具栏实时筛选、排序、切换视图
- **统计**：基础统计图、详细统计图

**新版工具栏功能栏**（默认顺序）：

1. **任务时间**：快捷日期、级联日期（年份/季度/月份/周数/周几）、自定义起止日期、计划~截止/开始~完成切换
2. **任务状态**：执行状态筛选（未开始/计划中/进行中/已完成/已取消）
3. **任务搜索**：按任务内容关键词实时过滤
4. **任务标记**：优先级、循环、创建、计划、开始、截止等标记筛选
5. **任务视图**：分组展示通用视图样式按钮（列表、表格、看板等），支持自定义 Emoji
6. **视图隐藏**：显示/隐藏循环、已完成、已取消、文件夹
7. **视图排序**：按状态、优先级、计划、截止、文件名等排序
8. **视图配置**：导入/导出配置、自定义视图图标、保存/重置/删除视图

## 命名规范

项目采用统一的命名约定，确保代码风格一致。

| 元素         | 规则                       | 示例                                 |
| ------------ | -------------------------- | ------------------------------------ |
| 文件名       | kebab-case                 | `base-task-view.ts`, `time-bar.ts`   |
| 视图类型常量 | `VIEW_TYPE_` + UPPER_SNAKE | `VIEW_TYPE_CALENDAR`                 |
| 类名         | PascalCase                 | `BaseTaskView`, `TimeBar`, `Toolbar` |
| 函数/变量    | camelCase                  | `getAllTasks`, `renderViewBar`       |
| CSS 类名     | kebab-case，视图前缀       | `.task-list`, `.cal-header`          |

```yaml
命名规范:
    文件名: kebab-case
    视图类型常量: VIEW_TYPE_ + UPPER_SNAKE
    类名: PascalCase
    函数名: camelCase
    CSS类名: kebab-case，视图前缀

代码风格:
    语言: TypeScript (strict mode)
    缩进: 2空格
    引号: 单引号
    分号: 必须
    尾逗号: 始终
```

## 设计原则

本软件遵循以下设计原则，确保各模块之间职责清晰、协作高效：

1. **数据源分层**：优先使用 Tasks 插件 API（如 `fetchTasks`）获取任务列表，保证状态自动更新。对于 Tasks API 无法提供的自定义标记（如 `🆔`、`⛔`、`🏁` 等），通过 Dataview 的 `dv.pages` 和文件内容解析获取。

2. **Store 单一状态源**：采用发布/订阅模式，全局状态（`AppState`）包含当前激活方案、所有方案、筛选条件、UI 状态等。所有 UI 组件通过 `store.subscribe()` 监听变化，自动更新。

3. **方案驱动配置**：每个侧边栏按钮对应一个视图方案（`Preset`），保存完整的筛选条件、视图样式、排序、工具栏显隐状态、图标等。切换方案即加载对应配置。

4. **视图基类与统一接口**：所有业务视图继承 `BaseTaskView`，实现 `render()` 方法。基类负责订阅 Store、管理生命周期。通用组件通过接收数据数组和配置选项返回 DOM。

5. **组件化与复用**：通用视图组件（`task-card`、`task-list`、`kanban`、`matrix` 等）放置在 `components/` 下，可被任意业务视图调用。工具栏各功能栏独立封装，支持拖动排序和显隐切换。

6. **全局筛选状态同步**：通过 `GlobalFilter` 接口统一管理日期范围、状态、标记筛选等条件。筛选变更时通过 Store 通知所有订阅组件自动刷新。

7. **状态持久化**：全局状态和方案通过 Obsidian 的 `Plugin.loadData()/saveData()` 自动保存和恢复。整理箱视图的编辑预览、历史快照等复杂状态采用 `localStorage` 或独立文件存储。

8. **性能与体验**：任务列表超过 100 条时分页（`PAGE_SIZE=50`）；甘特图使用 Canvas 虚拟滚动。复杂视图在数据处理阶段预计算时间戳和排序索引，避免渲染时重复计算。工具栏按钮条在页面滚动被遮挡时自动变为固定悬浮。

9. **编辑与预览逻辑（整理箱专用）**：批量编辑标记、预览累积（下一个编辑操作基于上一个预览结果）、确定修改、快照撤回、持久化视图状态恢复。

10. **任务标记规范**：任务格式严格遵循：`- [状态] 描述 🔼 🔁 every week ➕ 日期 ⏳ 日期 🛫 日期 📅 日期 ✅ 日期 ❌ 日期 🆔 id ⛔ id1,id2 🏁 flag`。自定义标记在 `read-tasks.ts` 中通过正则解析。

# CSCI体系结构设计

## 体系结构

系统采用 **Store + 组件化 + 方案（Preset）** 架构，主要分层：

```
┌────────────────────────────────────────┐
│              main.ts (入口)             │
│  初始化 Store、注册命令、注册主视图     │
└────────────────┬───────────────────────┘
                 │
┌────────────────▼───────────────────────┐
│           Store (状态层)               │
│  单一数据源，发布/订阅，持久化         │
│  - AppState (全局状态)                 │
│  - Preset (方案管理)                   │
└────────────────┬───────────────────────┘
                 │
┌────────────────▼───────────────────────┐
│           UI 层 (组件化)               │
│  ┌──────────────────────────────────┐  │
│  │ 布局组件 (layout/)               │  │
│  │  - NavigatorView                 │  │
│  └──────────────────────────────────┘  │
│  ┌──────────────────────────────────┐  │
│  │ 面板组件 (panels/)               │  │
│  │  - ViewContainer                 │  │
│  └──────────────────────────────────┘  │
│  ┌──────────────────────────────────┐  │
│  │ 工具栏 (bars/)                   │  │
│  │  - Toolbar (容器 + 悬浮)         │  │
│  │  - TimeBar, MarkBar, ViewBar...  │  │
│  └──────────────────────────────────┘  │
│  ┌──────────────────────────────────┐  │
│  │ 业务视图 (views/)                │  │
│  │  - InboxView, TodayView...       │  │
│  └──────────────────────────────────┘  │
│  ┌──────────────────────────────────┐  │
│  │ 通用组件 (components/)           │  │
│  │  - task-list, kanban, gantt...   │  │
│  └──────────────────────────────────┘  │
└────────────────────────────────────────┘
                 │
┌────────────────▼───────────────────────┐
│           数据层 (tasks/)               │
│  - read/ (数据读取)                    │
│  - process/ (筛选、排序、统计)         │
│  - write/ (文件写入)                   │
└────────────────────────────────────────┘
```

## 程序(模块)划分

```yaml
组件:
  名称: Store
  描述: 全局状态管理，发布/订阅模式，持久化
  接口:
    - getState(): AppState
    - update(partial: Partial<AppState>): void
    - subscribe(listener: Listener): () => void
    - getActivePreset(): Preset | undefined
  依赖:
    - types.ts

组件:
  名称: Toolbar
  描述: 工具栏容器，管理各功能栏的显隐、拖动排序、悬浮切换
  接口:
    - render(): void
    - updatePreset(changes): void
  依赖:
    - Store
    - TimeBar, MarkBar, ExcutBar, ViewBar, SortBar, HideBar, SearchBar, ConfigBar

组件:
  名称: BaseTaskView
  描述: 业务视图基类，订阅 Store，生命周期管理
  接口:
    - render(): Promise<void>
    - destroy(): void
    - filterTasks(tasks, filter): any[]
    - getDefaultFilter(): GlobalFilter
  依赖:
    - Store

组件:
  名称: TaskCard
  描述: 统一任务卡片组件，支持详细/简洁两种模式
  接口:
    - createTaskCard(task): HTMLElement
  依赖:
    - CONFIG, TooltipManager

组件:
  名称: FilterTaskProcess
  描述: 纯函数任务筛选，按日期/状态/标记/搜索文本过滤
  接口:
    - filterTasks(tasks, filter): any[]
  依赖:
    - types.ts
```

## 程序(模块)层次结构关系

```
src/
├── main.ts                         # 插件入口：初始化 Store、注册所有视图/命令
├── settings.ts                     # 插件设置面板
├── types.ts                        # 全局类型定义 (TaskItem, GlobalFilter, Preset, AppState)
├── store/
│   ├── store.ts                    # Store 类（发布/订阅 + 持久化）
│   └── preset-manager.ts          # 方案增删改查
├── commands/
│   └── index.ts                    # 命令注册
├── configs/
│   └── configs.ts                  # 全局常量、默认筛选、工具函数 (formatDisplayDate等)
├── tasks/
│   ├── read/
│   │   └── read-tasks.ts           # 统一任务读取 (RX 正则、getAllTasks)
│   ├── process/
│   │   ├── common-process.ts       # DateUtils 日期工具集
│   │   ├── filter-task-process.ts  # 通用任务筛选
│   │   ├── calcul-chart-process.ts # 图表统计计算
│   │   ├── task-query-process.ts   # Tasks API 查询封装
│   │   ├── organize-task-process.ts# 整理箱编辑操作 (Op)、快照管理
│   │   ├── inbox-task-process.ts
│   │   ├── kanban-task-process.ts
│   │   ├── matrix-task-process.ts
│   │   └── recurring-task-process.ts
│   └── write/
│       └── write-tasks.ts          # 任务写入、快照生成与恢复
├── ui/
│   ├── layout/
│   │   ├── navigator-layout.ts     # NavigatorView (ItemView)
│   │   └── navigator-layout-impl.ts# NavigatorLayout 实现
│   ├── panels/
│   │   └── view-container.ts       # 视图容器 (根据方案动态加载业务视图)
│   ├── bars/
│   │   ├── bars.ts                 # Toolbar (按钮条 + 悬浮面板容器)
│   │   ├── time-bar.ts             # 任务时间：动态日期、级联日期、自定义日期、计划~截止切换
│   │   ├── excut-bar.ts            # 任务状态：执行状态筛选
│   │   ├── search-bar.ts           # 任务搜索：文本输入过滤
│   │   ├── mark-bar.ts             # 任务标记：优先级、循环等标记筛选
│   │   ├── view-bar.ts             # 任务视图：分组展示通用视图样式按钮
│   │   ├── hide-bar.ts             # 视图隐藏：显示/隐藏循环/完成/取消/文件夹
│   │   ├── sort-bar.ts             # 视图排序：排序方式切换
│   │   ├── config-bar.ts           # 视图配置：导入/导出、图标自定义、保存/重置/删除
│   │   └── side-bar.ts             # 侧边栏：视图方案管理、折叠/展开
│   ├── views/
│   │   ├── base-view.ts            # 业务视图基类 (BaseTaskView)
│   │   ├── all-tasks-view.ts       # 所有任务
│   │   ├── inbox-view.ts           # 收集箱
│   │   ├── today-view.ts           # 今天任务
│   │   ├── important-view.ts       # 重要任务
│   │   ├── recurring-view.ts       # 循环任务
│   │   ├── future-view.ts          # 未来任务
│   │   ├── overdue-view.ts         # 逾期任务
│   │   ├── tag-view.ts             # 标签任务
│   │   ├── depends-view.ts         # 依赖任务
│   │   └── organize-view.ts        # 整理处
│   ├── components/
│   │   ├── cards/
│   │   │   └── task-card.ts        # 任务卡片 (详细/简洁)
│   │   ├── lists/
│   │   │   ├── task-list.ts        # 任务列表
│   │   │   └── task-tree.ts        # 任务树
│   │   ├── tables/
│   │   │   └── task-table.ts       # 任务表格
│   │   ├── boards/
│   │   │   ├── kanban.ts           # 看板
│   │   │   └── matrix.ts           # 四象限矩阵
│   │   ├── timeline/
│   │   │   └── task-timeline.ts    # 时间轴
│   │   ├── calendar/
│   │   │   ├── day.ts
│   │   │   ├── week.ts
│   │   │   ├── month.ts
│   │   │   ├── quarter.ts
│   │   │   └── year.ts             # 日历系列
│   │   ├── gantt/
│   │   │   └── gantt.ts            # 甘特图 (Canvas)
│   │   ├── charts/
│   │   │   ├── echarts.ts          # ECharts 封装
│   │   │   ├── statistics.ts       # 基础统计图
│   │   │   └── detail.ts           # 详细统计图
│   │   ├── editors/
│   │   │   ├── single-edit.ts      # 单个编辑
│   │   │   └── bulk-edit.ts        # 批量编辑
│   │   └── tooltip/
│   │       └── tooltip.ts          # TooltipManager (单例)
│   └── ui.ts                        # UI 统一入口 (createNavigatorLayout)
└── utils/
    └── logger.ts                    # 日志工具（生产环境静默）
```

## 全局数据结构说明

#### 核心类型定义

```yaml
状态:
  - 变量:
      名称: AppState
      类型: interface
      默认值: 见 main.ts 初始状态
      描述: 全局应用状态，包含所有方案、UI 状态、草稿筛选
      字段:
        - activePresetId: string | null
        - presets: Preset[]
        - presetGroups: PresetGroup[]
        - sidebarCollapsed: boolean
        - sidebarWidth: number (默认160)
        - draftFilter: GlobalFilter | null

  - 变量:
      名称: Preset (视图方案)
      类型: interface
      描述: 保存一个视图的完整配置
      字段:
        - id: string
        - name: string
        - groupId: string
        - businessView: string (业务视图类型)
        - viewStyle: string (默认视图样式)
        - icon: string (侧边栏按钮图标，默认取名称首字符)
        - filter: GlobalFilter
        - sort: { type: string, order: 'asc' | 'desc' }
        - showToolbar: boolean (是否显示工具栏)
        - toolbarEverShown: boolean (是否至少展开过一次工具栏)
        - toolbarOrder: string[] (功能栏排序)
        - barVisibility: Record<string, boolean> (各栏显隐状态)
        - viewIcons: Record<string, string> (通用视图自定义图标)

  - 变量:
      名称: GlobalFilter
      类型: interface
      描述: 全局筛选条件
      字段:
        - dateRange: { start: number | null, end: number | null, isAll: boolean }
        - statuses: string[]
        - includeMarks: string[]
        - excludeMarks: string[]
        - hideRepeat: boolean
        - hideCompleted: boolean
        - hideCancelled: boolean
        - rootPath: string | null
        - hideFolders: boolean
        - searchText: string (任务内容搜索关键词)
```

## 常量

#### 任务标记设计

##### 任务标记格式

本插件使用自定义的任务行标记语法：

执行状态 任务描述 优先级 循环周期 创建日期 计划日期 开始日期 截止日期 完成日期 取消日期 唯一ID 依赖ID 标签

各标记的 Emoji、说明和示例如下表：

| 标记     | Emoji        | 说明                   | 示例              |
| -------- | ------------ | ---------------------- | ----------------- |
| 执行状态 | 自定义       | 见下方状态映射         | `- [ ]` (未开始)  |
| 任务描述 | -            | 纯文本                 | `制作初步音乐库`  |
| 优先级   | 🔺⏫🔼🔽⏬   | 六个等级               | `🔺` (最高)       |
| 循环周期 | 🔁 every ... | 重复规则               | `🔁 every week`   |
| 创建日期 | ➕           | 任务创建日             | `➕ 2025-09-06`   |
| 计划日期 | ⏳           | 计划执行日             | `⏳ 2025-09-06`   |
| 开始日期 | 🛫           | 实际开始日             | `🛫 2025-09-06`   |
| 截止日期 | 📅           | 截止日                 | `📅 2026-04-06`   |
| 完成日期 | ✅           | 实际完成日             | `✅ 2023-04-17`   |
| 取消日期 | ❌           | 取消日                 | `❌ 2023-04-18`   |
| 唯一 ID  | 🆔           | 任务唯一任务ID         | `🆔 dcf64c`       |
| 依赖 ID  | ⛔           | 依赖的其他任务 ID 列表 | `⛔ dcf64c,h17ye` |
| 标签     | 🏁           | 自定义标签             | `🏁 keep`         |

任务`id`一个或多个允许字符的数值一致:

- `abcdefghijklmnopqrstuvwxyz`
- `ABCDEFGHIJKLMNOPQRSTUVWXYZ`
- `0123456789`
- 下划线(`_`)
- 短横线(`-`)

任务实例：

- 任务描述 🔼 🔁 every week ➕ 2025-09-06 ⏳ 2025-09-06 🛫 2025-09-06 📅 2026-04-06 ✅ 2023-04-17 🆔 dcf64c ⛔ dcf64c,h17ye 🏁 keep
- 任务描述 🔼 🔁 every week ➕ 2025-09-06 ⏳ 2025-09-06 🛫 2025-09-06 📅 2026-04-06 ❌ 2023-04-18 🆔 dcf64c ⛔ dcf64c,h17ye 🏁 keep

```yaml
算法:
    名称: 任务标记解析
    复杂度: O(n)
    伪代码: |
        1. 读取任务行文本
        2. 按固定顺序解析各标记字段
        3. 执行状态：自定义Emoji，底层保留Markdown符号
        4. 优先级：🔺=1最高, ⏫=2, 🔼=3, 🔽=4, ⏬=5, 无=6
        5. 日期约束：创建≤计划≤开始≤截止
        6. 返回结构化Task对象

关键条件:
    描述: 补全日期时需保持 创建日期 ≤ 计划日期 ≤ 开始日期 ≤ 截止日期
    相关函数:
        - validateTaskDates
        - parseTaskLine
    边界条件:
        - 日期字段缺失时留空，不触发排序
        - 格式错误的行返回null
```

##### 任务标记顺序

当需要自动重排一个任务行的所有标记时，应遵循以下顺序：

1. 执行状态 🔲|❔|⏩|✅|❎|⬛
2. 任务描述 纯文本
3. 优先级 🔺|⏫|🔼|🔽|⏬
4. 循环周期 🔁
5. 创建日期 ➕
6. 计划日期 ⏳
7. 开始日期 🛫
8. 截止日期 📅
9. 完成日期 ✅
10. 取消日期 ❌
11. 唯一 ID 🆔
12. 依赖 ID ⛔
13. 标签 🏁

同类内部排序规则：

- 执行状态：未开始 🔲 → 计划中 ❔ → 进行中 ⏩ → 已完成 ✅ → 已取消 ❎ → 非任务 ⬛
- 优先级：🔺 → ⏫ → 🔼 → 🔽 → ⏬ → 普通（无优先级）
- 循环周期：`🔁 every day` → `🔁 every week` → `🔁 every month` → `🔁 every year` → `🔁 every <n> days/weeks/months`
- 日期标记：➕ 创建日期 → ⏳ 计划日期 → 🛫 开始日期 → 📅 截止日期 → ❌ 取消日期 → ✅ 完成日期

```yaml
算法:
    名称: 任务标记自动排序
    复杂度: O(n log n)
    伪代码: |
        1. 按固定顺序重排任务行中的所有标记
        2. 同类内部排序：
           - 执行状态：🔲→❔→⏩→✅→❎→⬛
           - 优先级：🔺→⏫→🔼→🔽→⏬→普通
           - 循环周期：day→week→month→year→自定义间隔
           - 日期：创建≤计划≤开始≤截止
        3. 返回排序后的任务行

事件流:
    步骤:
        - 触发: 用户选择自动排序
          动作: 调用 autoReorderTaskLine()
          下一步: 刷新当前视图
```

#### 共用颜色

- 颜色必须使用 Obsidian CSS 变量（如 `--background-primary`）。
- 深色模式自动适配，Canvas 中动态获取颜色。
- 任务卡片左侧颜色条：
    - 未开始 `#2e333b`
    - 计划中 `#4b525b`
    - 进行中 `#7fb8f0`
    - 已完成 `#47852f`
    - 已取消 `#c3393e`

## 变量

#### 核心变量

```yaml
状态:
    - 变量:
          名称: sidebarCollapsed
          类型: boolean
          默认值: false
          描述: 侧边栏是否折叠

    - 变量:
          名称: sidebarWidth
          类型: number
          默认值: 160
          描述: 侧边栏展开时的宽度（像素）

    - 变量:
          名称: showToolbar
          类型: boolean
          默认值: true
          描述: 当前视图是否显示工具栏

    - 变量:
          名称: toolbarEverShown
          类型: boolean
          默认值: false
          描述: 当前视图的工具栏是否至少展开过一次

    - 变量:
          名称: intervalMode
          类型: string
          默认值: "scheduled-due"
          值列表: ["scheduled-due", "starts-done"]
          描述: 任务时间计算方式
```

## 数据结构

```yaml
状态:
    - 变量:
          名称: presets
          类型: Preset[]
          默认值: 见 main.ts 默认预设
          描述: 所有视图方案列表

    - 变量:
          名称: toolbarOrder
          类型: string[]
          默认值:
              [
                  "time",
                  "excut",
                  "search",
                  "mark",
                  "view",
                  "hide",
                  "sort",
                  "config",
              ]
          值列表: time/excut/search/mark/view/hide/sort/config 的排列
          描述: 工具栏功能栏排序

    - 变量:
          名称: barVisibility
          类型: Record<string, boolean>
          默认值:
              {
                  time: true,
                  excut: true,
                  search: true,
                  mark: true,
                  view: true,
                  hide: true,
                  sort: true,
                  config: true,
              }
          描述: 各功能栏显隐状态
```

# CSCI部件

## 工具栏 (Toolbar)

```yaml
组件:
  名称: Toolbar
  描述: 管理所有功能栏的容器，提供按钮条（可拖动排序）和面板区域。在页面滚动被遮挡时自动变为固定悬浮状态。
  接口:
    - render(): void
    - handleScroll(): void
    - updatePreset(changes: Partial<any>): void
  依赖:
    - Store
    - TimeBar, MarkBar, ExcutBar, ViewBar, SortBar, HideBar, SearchBar, ConfigBar
  关键行为:
    - 按钮条默认正常流式布局
    - 当按钮条顶部被遮挡时自动 fixed 悬浮
    - 悬浮时眼睛按钮可同时显示多个面板
    - 面板保持 toolbarOrder 顺序
```

## 侧边栏 (SideBar)

```yaml
组件:
    名称: SideBar
    描述: 视图方案管理面板，支持折叠/展开、自定义图标、新建视图、工具栏显隐切换。
    接口:
        - render(): void
        - equalizeButtonWidths(): void
    依赖:
        - Store
    关键行为:
        - 展开宽度默认160px，折叠宽度40px
        - 折叠时仅显示 Emoji 图标
        - 展开时显示 Emoji + 视图名称
        - 折叠/展开按钮与设置按钮纵向排列，与视图按钮样式一致
        - 首次点击视图按钮时自动展开工具栏
```

## 业务视图 (Business Views)

```yaml
组件:
  名称: BaseTaskView
  描述: 所有业务视图的抽象基类，订阅 Store 并在状态变化时自动重新渲染。
  接口:
    - render(): Promise<void>
    - destroy(): void
    - filterTasks(tasks: any[], filter: GlobalFilter): any[]
    - getDefaultFilter(): GlobalFilter
  子类:
    - AllTasksView, InboxView, TodayView, ImportantView, RecurringView,
    - FutureView, OverdueView, TagView, DependsView, OrganizeView
  依赖:
    - Store
    - filterTasks (数据层)
    - 通用视图组件
```

## 通用视图组件 (Components)

```yaml
组件:
  名称: task-card
  描述: 统一任务卡片，支持详细两行（状态图标 + 描述 / 元数据行）和简洁一行（仅状态图标 + 描述）模式。
  接口:
    - createTaskCard(task: any): HTMLElement
  依赖:
    - CONFIG
    - TooltipManager

组件:
  名称: task-list
  描述: 任务列表渲染器，接收数据数组和配置选项（紧凑模式、点击回调）。
  接口:
    - renderTaskList(container: HTMLElement, tasks: any[], options?: TaskListOptions): void
```

# 执行概念

## 工具栏悬浮机制

当页面滚动导致工具栏按钮条顶部超出视口时，`Toolbar.handleScroll()` 检测到 `buttonBar.getBoundingClientRect().top <= 0`，将按钮条和面板容器切换为 `position: fixed`，并附加阴影样式。当页面回滚到按钮条完全可见时，恢复普通流式布局。

## 方案切换流程

1. 用户点击侧边栏视图按钮 → `store.update({ activePresetId: preset.id })`
2. Store 通知所有订阅者 → `ViewContainer.refresh()` 加载对应业务视图
3. 业务视图根据 `preset.viewStyle` 和筛选条件渲染内容
4. 工具栏根据 `preset.toolbarOrder` 和 `preset.barVisibility` 渲染按钮条和面板

# 接口设计

## Store 接口

```yaml
接口:
    名称: Store
    方向: 双向
    类型: 函数调用 + 发布/订阅
    数据元素:
        - 名称: state
          类型: AppState
          范围: 全局唯一
          精度: N/A
    协议: subscribe(listener) 注册回调，update(partial) 更新状态并通知
    错误码: 无
```

## GlobalFilter 接口

```yaml
接口:
    名称: GlobalFilter
    方向: 输入
    类型: 数据流
    数据元素:
        - 名称: dateRange
          类型: { start: number | null, end: number | null, isAll: boolean }
          范围: 任意有效时间戳或 null
          精度: 毫秒
        - 名称: statuses
          类型: string[]
          范围: ["todo", "planned", "in-progress", "completed", "cancelled"]
        - 名称: searchText
          类型: string
          范围: 任意文本
    协议: 通过 store.draftFilter 或 preset.filter 传递
```

## Preset 接口

```yaml
接口:
    名称: Preset
    方向: 双向
    类型: 数据流
    数据元素:
        - 名称: businessView
          类型: string
          范围:
              [
                  "inbox",
                  "today",
                  "important",
                  "recurring",
                  "future",
                  "overdue",
                  "tag",
                  "depends",
                  "allTasks",
                  "organize",
              ]
        - 名称: viewStyle
          类型: string
          范围:
              [
                  "list",
                  "table",
                  "kanban",
                  "matrix",
                  "timeline",
                  "tree",
                  "calendar",
                  "gantt",
                  "statistics",
                  "detail",
              ]
        - 名称: toolbarOrder
          类型: string[]
          范围: 功能栏键的排列
    协议: 存储在 store.presets 数组中，通过 store.update 修改
```

# 注解

## 当前版本已知限制

- 级联日期联动逻辑尚未实现（目前为独立按钮）
- 甘特图完整交互（左侧任务树同步滚动、依赖箭头优化）待增强
- 移动端适配未充分测试
- "计划~截止/开始~完成"切换按钮已添加，但部分视图（如甘特图）可能需要进一步适配 intervalMode

## 未来规划

- 工作区 (Workspace) 功能：保存/切换整套视图配置
- 级联日期联动选择逻辑
- 甘特图拖拽编辑任务时间
- 批量创建/删除任务
- 配置文件导入/导出扩展
- 移动端优化
- 多语言支持

# CSCI详细设计

{在以下每个模块的自然语言描述末尾，根据需要嵌入算法、事件流、关键条件 YAML 块，可嵌入多个}

## 侧边栏模块详细设计

### 1. 模块标识

| 属性       | 内容                      |
| ---------- | ------------------------- |
| 模块名称   | 侧边栏 (Sidebar)          |
| 模块标识符 | `ui.bars.sidebar`         |
| 版本号     | 1.0.0                     |
| 开发者     | -                         |
| 最后更新   | 2026-05-30                |
| 所属CSCI   | Obsidian Task Manage 插件 |

### 2. 功能描述

侧边栏是插件的**主导航和控制中枢**，位于界面最左侧，承载视图方案管理、折叠/展开、工具栏全局设置等功能。用户通过侧边栏切换不同的业务视图方案，管理视图的创建与删除，控制工具栏的整体显隐。

本章从侧边栏的整体定位出发，介绍其架构关系与核心能力，然后逐一说明侧边栏的按钮组成、交互行为、折叠展开机制和样式规范。

#### 2.1 整体定位与架构关系

侧边栏固定在插件布局的最左侧，与右侧的视图配置面板和通用视图区域协同工作。侧边栏的每个按钮代表一个**视图方案（Preset）**，点击按钮切换激活方案，右侧视图内容随之刷新。侧边栏顶部提供折叠/展开按钮和全局设置按钮，底部提供新建视图按钮。

侧边栏的业务视图按钮支持自定义分组，用户可将不同类型的视图归类管理。侧边栏的显示状态（展开/折叠、宽度）和方案列表均通过 Store 持久化，重启后自动恢复。

#### 2.2 核心能力概述

| 能力         | 说明                                                                   |
| ------------ | ---------------------------------------------------------------------- |
| 视图方案切换 | 按钮从上到下排列，点击切换右侧视图内容和配置栏状态                     |
| 折叠与展开   | 整体宽度可收缩至 40px（仅显示图标）或展开至默认 200px（显示图标+文字） |
| 宽度调整     | 展开模式下，右侧边缘可拖拽调整宽度，最小 48px                          |
| 视图管理     | 底部提供新建按钮，创建后默认激活                                       |
| 全局设置     | 顶部设置按钮控制当前激活视图的工具栏显隐                               |

#### 2.3 侧边栏按钮排列

侧边栏按钮从上到下依次排列：

| 序号 | 按钮名称      | 说明                              |
| ---- | ------------- | --------------------------------- |
| 1    | 展开/折叠按钮 | ◀ 或 ▶ 图标，切换侧边栏整体宽度   |
| 2    | 视图设置按钮  | ⚙️ 图标，控制当前视图的工具栏显隐 |
| 3    | 任务收集箱    | 对应预设 `inbox`                  |
| 4    | 重要任务      | 对应预设 `important`              |
| 5    | 循环任务      | 对应预设 `recurring`              |
| 6    | 今天任务      | 对应预设 `today`                  |
| 7    | 未来任务      | 对应预设 `future`                 |
| 8    | 逾期任务      | 对应预设 `overdue`                |
| 9    | 依赖任务      | 对应预设 `depends`                |
| 10   | 标签任务      | 对应预设 `tag`                    |
| —    | 新建视图按钮  | 底部，➕ 图标，创建新方案         |

> 业务视图按钮顺序和数量可根据 `presets` 数组动态渲染，以上为默认配置。

### 3. 接口定义

本章定义侧边栏模块对外暴露的方法签名及依赖的外部接口。

#### 3.1 外部接口（Store 交互）

| 方法/操作                    | 方向 | 说明                                                            |
| ---------------------------- | ---- | --------------------------------------------------------------- |
| `store.getState(): AppState` | 输入 | 获取全局状态，读取预设列表、激活预设 ID、侧边栏折叠状态、宽度等 |
| `store.update(partial)`      | 输出 | 更新侧边栏折叠状态、宽度、激活预设 ID                           |
| `store.subscribe(listener)`  | 输入 | 订阅状态变化，自动重渲染侧边栏                                  |

#### 3.2 内部接口（SideBar 组件）

| 方法签名                                                            | 说明                                          |
| ------------------------------------------------------------------- | --------------------------------------------- |
| `constructor(container: HTMLElement, store: Store, app: any): void` | 创建侧边栏，渲染按钮列表，订阅 Store          |
| `render(): void`                                                    | 重新渲染侧边栏内容（按钮列表、折叠/展开状态） |
| `createNewPreset(): void`                                           | 创建新的视图方案，添加到预设列表并设为激活    |
| `adjustSidebarWidth(): void`                                        | 根据按钮内容自适应侧边栏宽度                  |

### 4. 数据描述

本章列出侧边栏模块依赖的关键状态字段。

#### 4.1 模块内部数据结构

| 变量名             | 类型             | 说明                                 |
| ------------------ | ---------------- | ------------------------------------ |
| `container`        | `HTMLElement`    | 侧边栏的 DOM 容器                    |
| `app`              | `any`            | Obsidian 应用实例                    |
| `lastSidebarWidth` | `number \| null` | 上次自适应计算的宽度值，用于避免抖动 |

#### 4.2 关键数据结构（来自 Store）

| 字段               | 类型             | 说明                                                          |
| ------------------ | ---------------- | ------------------------------------------------------------- |
| `presets`          | `Preset[]`       | 所有视图方案列表，每个包含 `id`、`name`、`icon`、`groupId` 等 |
| `activePresetId`   | `string \| null` | 当前激活的视图方案 ID                                         |
| `sidebarCollapsed` | `boolean`        | 侧边栏是否折叠                                                |
| `sidebarWidth`     | `number`         | 侧边栏展开时的宽度（像素，默认 200）                          |
| `presetGroups`     | `PresetGroup[]`  | 方案分组定义（`id`、`name`、`order`）                         |

### 5. 处理逻辑

本章以伪代码形式描述侧边栏核心交互的处理流程。

#### 5.1 折叠/展开切换逻辑

```
输入：点击折叠/展开按钮
处理：
  1. 获取当前 sidebarCollapsed 状态
  2. 反转 sidebarCollapsed 值
  3. 若折叠：设置侧边栏宽度为 40px
  4. 若展开：设置侧边栏宽度为保存的 sidebarWidth（默认 200px）
  5. 调用 store.update({ sidebarCollapsed: newValue, sidebarWidth: newWidth }) 持久化
输出：侧边栏宽度动画切换，按钮内容相应变化（图标或图标+文字）
```

#### 5.2 宽度自适应逻辑

```
输入：侧边栏展开状态，按钮列表已渲染
处理：
  1. 查询侧边栏内所有 .preset-btn 元素
  2. 遍历按钮，重置 width 为 auto，获取实际内容宽度
  3. 取最大宽度作为统一按钮宽度
  4. 将所有按钮宽度设为该最大值
  5. 设置容器右内边距为 0，使按钮右边缘紧贴容器
  6. 计算容器宽度 = 按钮最大宽度 + 左内边距（4px）
  7. 若新旧宽度差超过 1px，更新容器宽度并记录 lastSidebarWidth
输出：侧边栏宽度自适应按钮内容，无多余留白
```

#### 5.3 视图切换逻辑

```
输入：点击某个业务视图按钮（preset.id）
处理：
  1. 调用 store.update({ activePresetId: preset.id })
  2. Store 触发订阅通知，ViewContainer 加载对应业务视图
  3. 工具栏通过 syncState() 同步新预设的配置状态
输出：右侧视图内容刷新，工具栏状态恢复为该预设的配置
```

#### 5.4 新建视图逻辑

```
输入：点击底部新建按钮
处理：
  1. 生成唯一 ID（如时间戳）
  2. 创建新 Preset 对象，包含默认的 toolbarOrder、barVisibility、filter 等配置
  3. 将新 Preset 追加到 presets 数组
  4. 调用 store.update({ presets: newPresets, activePresetId: newPreset.id })
输出：侧边栏新增一个视图按钮，自动激活新视图
```

### 6. 界面设计

本章描述侧边栏的布局、按钮样式、折叠展开行为和交互细节。

#### 6.1 整体布局

侧边栏位于插件界面最左侧，高度铺满父容器，宽度根据折叠/展开状态动态变化：

| 状态 | 宽度                              | 显示内容                                                |
| ---- | --------------------------------- | ------------------------------------------------------- |
| 展开 | 默认 200px，可拖拽调整，最小 48px | 顶部操作按钮 + 视图按钮（emoji + 文字） + 新建按钮      |
| 折叠 | 固定 40px                         | 顶部操作按钮 + 视图按钮（仅 emoji） + 新建按钮（仅 ➕） |

侧边栏内部采用垂直布局，从上到下依次为：顶部按钮行、视图按钮列表、底部新建按钮。

#### 6.2 顶部按钮行

**展开时**：折叠按钮（◀）与设置按钮（⚙️）水平排列。折叠按钮自适应填满剩余空间，设置按钮固定宽度 32px。

**折叠时**：两个按钮垂直排列，宽度均为 100%。折叠按钮显示 ▶，表示可展开。

| 按钮          | 功能                   | 图标               |
| ------------- | ---------------------- | ------------------ |
| 折叠/展开按钮 | 切换侧边栏折叠状态     | 展开时 ◀，折叠时 ▶ |
| 设置按钮      | 控制当前视图工具栏显隐 | ⚙️                 |

#### 6.3 视图按钮列表

- **展开时**：每个按钮显示 `emoji + 视图名称`，采用标准按钮样式。激活的按钮添加 `.active` 类，背景色为 `var(--background-modifier-active)`。
- **折叠时**：每个按钮仅显示 emoji 图标（若无则取名称首字符），按钮宽度为 100%，内边距自动适配。
- **分组**：按 `presetGroups` 定义的分组顺序排列，同一分组内的按钮聚合显示。
- **宽度自适应**：展开时，所有按钮宽度统一为内容最宽按钮的宽度，容器右内边距清零，使按钮右边缘紧贴容器。

#### 6.4 新建按钮

- **展开时**：显示“➕ 新建视图”，位于视图列表底部。
- **折叠时**：仅显示“➕”，位于侧边栏底部。
- **功能**：点击后在 `presets` 末尾追加一个新方案，自动设为激活状态。

#### 6.5 按钮样式规范

侧边栏按钮遵循以下样式：

| 属性        | 规范                                        |
| ----------- | ------------------------------------------- |
| 内边距      | `4px 6px`                                   |
| 字体族/字号 | `var(--font-text)` / `var(--font-ui-small)` |
| 行高        | `var(--line-height-normal)`                 |
| 文字颜色    | `var(--text-normal)`                        |
| 背景        | 透明                                        |
| 悬停背景    | `var(--background-modifier-hover)`          |
| 激活背景    | `var(--background-modifier-active)`         |
| 外边距      | `2px 0`                                     |
| 排列        | 垂直排列，可上下滚动                        |

#### 6.6 交互行为

- **折叠/展开**：点击 ◀/▶ 按钮切换侧边栏宽度，带动画过渡。状态通过 Store 持久化。
- **视图切换**：点击业务视图按钮，更新 `activePresetId`，右侧视图和工具栏同步刷新。
- **设置切换**：点击 ⚙️ 按钮，切换当前激活视图的 `showToolbar` 状态，配置栏整体显示或隐藏。
- **新建视图**：点击底部 ➕ 按钮，创建新方案并自动激活。
- **宽度调整**：展开模式下拖拽右侧边缘可调整宽度，释放时持久化到 `sidebarWidth`。

### 7. 约束与假设

- **运行环境**：Obsidian 0.15.0+，需启用 Dataview 和 Obsidian Tasks 插件。
- **CSS 变量依赖**：假定 Obsidian 主题提供 `--font-text`、`--font-ui-small`、`--text-normal`、`--background-modifier-hover`、`--background-modifier-active` 等 CSS 变量。
- **Store 依赖**：假定 Store 已初始化并传入，支持 `update`、`subscribe`、`getState` 方法。`presets` 数组至少包含一个元素。
- **浏览器兼容性**：假定运行环境为 Chromium（Electron），支持 ES2020+、CSS Flexbox 等特性。
- **性能假设**：预设数量通常不超过 20 个，重渲染性能可接受。
- **移动端适配**：当前未充分测试移动端，侧边栏在窄屏设备上可能挤压内容区。

### 8. 测试要点

- 点击折叠/展开按钮，侧边栏宽度正确切换，按钮内容相应变化（图标 vs 图标+文字）。
- 折叠状态下侧边栏固定 40px，展开状态下宽度可拖拽调整且不小于 48px。
- 点击视图按钮，右侧视图内容和工具栏状态正确切换。
- 点击设置按钮，当前视图工具栏整体显示或隐藏。
- 点击新建按钮，侧边栏新增视图按钮并自动激活。
- 展开时按钮宽度自适应，所有按钮对齐一致，无多余留白。
- 切换预设时，工具栏智能继承逻辑正确触发。
- 插件重启后，侧边栏折叠状态、宽度、激活视图正确恢复。

### 附录：涉及文件

| 文件                      | 职责                                                     |
| ------------------------- | -------------------------------------------------------- |
| `src/ui/bars/side-bar.ts` | SideBar 类：视图列表渲染、折叠展开、新建视图、宽度自适应 |
| `src/ui/ui.ts`            | 主布局入口，创建侧边栏容器                               |
| `src/store/store.ts`      | Store：预设管理、激活切换、状态持久化                    |
| `src/main.ts`             | 插件入口：默认预设配置、侧边栏初始状态                   |

## 视图配置面板模块详细设计

### 1. 模块标识

| 属性       | 内容                            |
| ---------- | ------------------------------- |
| 模块名称   | 视图配置面板 (Toolbar & Panels) |
| 模块标识符 | `ui.bars.toolbar`               |
| 版本号     | 2.0.0                           |
| 开发者     | -                               |
| 最后更新   | 2026-06-02                      |
| 所属CSCI   | Obsidian Task Manage 插件       |

### 2. 功能描述

视图配置面板是插件工具栏的核心配置区域，位于每个业务视图顶部，由标题栏按钮条和可展开的功能面板组成。其职责是提供筛选、排序、视图切换等配置能力，自身不展示任务内容，而是将用户的配置作用于下方的通用视图区域。

本章从整体定位出发，先介绍模块的架构关系（与侧边栏、视图内容的交互方式），再逐一说明 8 个子功能栏的具体能力，最后概述配置的持久化机制。

#### 2.1 整体定位与架构关系

配置栏固定悬浮于视图顶部，不随内容滚动。下方通用视图区域根据配置栏高度自动调整上边距，两者各自独立滚动，互不重叠。配置栏的显示或隐藏通过动态调整内容区边距实现，不改变文档流。

业务视图可自定义筛选条件并保存为配置。全部视图配置的组合称为**方案（Preset）**，每个侧边栏按钮对应一个方案，保存完整的筛选条件、视图样式、排序、工具栏显示状态等信息。多个方案组合在一起，形成用户的**工作区（Workspace）**。

标题栏包含 8 个可拖拽排序的功能按钮，默认顺序为：任务状态、任务描述、任务标记、任务时间、任务视图、视图隐藏、视图排序、视图配置。每个按钮旁的眼睛图标控制对应功能面板的显隐。所有操作即时生效并通过 Store 持久化，相关 UI 通过 Store 订阅自动更新，无需手动刷新。

#### 2.2 子功能栏能力概述

| 功能栏   | 核心能力                                                                                                                                                   |
| -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 任务状态 | 按执行状态（未开始/计划中/进行中/已完成/已取消）多选筛选，选中高亮，逻辑为"或"，默认全选                                                                   |
| 任务描述 | 输入关键词实时过滤任务描述文本，支持多段关键字（空格分隔），逻辑为"且"。具备输入保护机制，避免重渲染时丢失焦点                                             |
| 任务标记 | 按标记类型筛选，支持优先级和循环的具体值多选。主按钮控制全选/全不选，任意子项选中即高亮。所有标记默认全选，全选时不过滤                                    |
| 任务时间 | 动态时间滑动条（年/季/月/周/日，以今天为中点）+ 静态时间滑动条（年/季/月/周/日）。支持"计划~截止"和"开始~完成"两种时间计算模式切换。"使用动态"按钮控制联动 |
| 任务视图 | 分组展示 19 种视图样式按钮，多选一，当前激活视图高亮，纯文字标签                                                                                           |
| 视图隐藏 | 控制循环/已完成/已取消/文件夹及表格列的显示或隐藏。多选，隐藏状态下高亮（文字"显示xx"），默认全部隐藏                                                      |
| 视图排序 | 提供 14 种排序选项，多选一，支持正序/逆序切换，当前排序按钮追加"↑"或"↓"                                                                                    |
| 视图配置 | 导入/导出配置、恢复出厂默认（含标记栏全选状态）、删除视图、设置视图名称和图标                                                                              |

#### 2.3 配置持久化概要

每个预设独立保存完整的工具栏状态（`showToolbar`、`toolbarOrder`、`barVisibility`、面板高度/折叠、`tableColumns`、筛选/排序/视图样式等）。切换预设时若新预设从未打开过工具栏而当前已打开，则自动开启（智能继承）。重启通过 `wasViewOpen` 恢复视图，配置合并默认值保证升级兼容。导入/导出为 JSON 文件。

### 3. 接口定义

本章定义模块对外暴露的方法签名及依赖的外部接口，作为模块间协作的契约。调用方应遵循以下接口规范进行集成。

#### 3.1 外部接口（Store 交互）

| 方法/操作                         | 方向 | 说明                                              |
| --------------------------------- | ---- | ------------------------------------------------- |
| `store.getState(): AppState`      | 输入 | 获取全局状态，读取当前预设、筛选条件、UI 状态等   |
| `store.update(partial)`           | 输出 | 更新全局状态（预设、筛选、UI 状态），触发订阅通知 |
| `store.subscribe(listener)`       | 输入 | 订阅状态变化，返回取消订阅函数                    |
| `store.getActivePreset(): Preset` | 输入 | 获取当前激活的视图方案                            |

#### 3.2 内部接口（ToolbarManager）

| 方法签名                                                                | 说明                                                                                                                                                     |
| ----------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `init(store: Store, viewEl: HTMLElement, container: HTMLElement): void` | 初始化工具栏，创建宿主容器、标题栏、面板、手柄，注入样式，订阅 Store                                                                                     |
| `syncState(): void`                                                     | 从 Store 读取当前预设状态，同步更新面板显隐、高度、折叠等                                                                                                |
| `applyVisibility(): void`                                               | 根据 `isVisible` 和 `isPanelsHidden` 设置各元素的 CSS 显示属性                                                                                           |
| `refreshContent(): void`                                                | 刷新面板内容，复用已缓存面板或创建新面板并注入对应 Bar 组件。检测输入框聚焦状态，若聚焦则跳过面板内容重建。已存在的面板不重新创建 Bar 实例，避免状态丢失 |
| `updatePreset(changes: Partial<any>): void`                             | 更新当前预设的部分字段到 Store                                                                                                                           |
| `togglePanels(): void`                                                  | 切换面板的折叠/展开状态                                                                                                                                  |
| `showPanels(): void`                                                    | 若面板当前折叠，则展开面板                                                                                                                               |
| `cleanupAll(): void`                                                    | 清理所有 DOM 元素、事件监听、样式标签、面板缓存，销毁所有 Bar 实例                                                                                       |

#### 3.3 内部接口（各 Bar 组件）

各功能栏组件统一遵循以下构造接口：

```typescript
new BarComponent(container: HTMLElement, store: Store)
```

其中 `container` 为面板内用于渲染内容的容器元素，`store` 为全局状态管理器。组件内部通过 `store.subscribe()` 监听变化并自动重渲染。Bar 组件实例被 ToolbarManager 缓存，不会因 Store 更新而重复创建。

#### 3.4 事件接口

| 事件名           | 触发时机                         | 说明                                       |
| ---------------- | -------------------------------- | ------------------------------------------ |
| `toolbar-expand` | 点击眼睛按钮或需要确保面板可见时 | 通知 ToolbarManager 展开面板（若当前折叠） |

### 4. 数据描述

本章列出模块内部的关键变量，以及从 Store/Preset 中读取的核心配置字段，供实现和调试时参照。

#### 4.1 模块内部数据结构

| 变量名            | 类型                       | 说明                                          |
| ----------------- | -------------------------- | --------------------------------------------- |
| `barPanels`       | `Map<string, HTMLElement>` | 缓存各功能栏的面板 DOM 元素，key 为功能栏标识 |
| `barInstances`    | `Map<string, any>`         | 缓存各功能栏的 Bar 组件实例，避免重复创建     |
| `buttonBarEl`     | `HTMLElement \| null`      | 标题栏按钮条的 DOM 引用                       |
| `panelsContainer` | `HTMLElement \| null`      | 功能面板容器的 DOM 引用                       |
| `resizeHandle`    | `HTMLElement \| null`      | 拖拽手柄的 DOM 引用                           |
| `toolbarHost`     | `HTMLElement`              | 工具栏宿主容器                                |
| `styleEl`         | `HTMLStyleElement \| null` | 注入的样式标签引用                            |
| `isVisible`       | `boolean`                  | 工具栏整体是否可见                            |
| `isPanelsHidden`  | `boolean`                  | 功能面板是否折叠隐藏                          |
| `panelHeight`     | `number`                   | 面板当前高度（默认 300）                      |

#### 4.2 关键数据结构（来自 Store/Preset）

| 字段                     | 类型                                       | 说明                                             |
| ------------------------ | ------------------------------------------ | ------------------------------------------------ |
| `showToolbar`            | `boolean`                                  | 工具栏整体显示或隐藏                             |
| `toolbarOrder`           | `string[]`                                 | 标题栏按钮排序（8个键的排列）                    |
| `barVisibility`          | `Record<string, boolean>`                  | 各功能栏面板的显示或隐藏状态                     |
| `toolbarPanelsCollapsed` | `boolean`                                  | 面板是否折叠                                     |
| `toolbarPanelsHeight`    | `number`                                   | 面板高度                                         |
| `toolbarEverShown`       | `boolean`                                  | 是否至少展开过一次工具栏                         |
| `tableColumns`           | `Record<string, boolean>`                  | 表格列显隐状态                                   |
| `filter`                 | `GlobalFilter`                             | 筛选条件（日期范围、状态、标记、搜索文本等）     |
| `sort`                   | `{ type: string; order: 'asc' \| 'desc' }` | 排序方式和方向                                   |
| `viewStyle`              | `string`                                   | 当前视图样式                                     |
| `name`                   | `string`                                   | 视图名称                                         |
| `icon`                   | `string`                                   | 视图图标（Emoji）                                |
| `intervalMode`           | `string`                                   | 时间计算模式（'scheduled-due' 或 'starts-done'） |
| `useDynamic`             | `boolean`                                  | 是否启用"使用动态"联动                           |

### 5. 处理逻辑

本章以伪代码形式描述核心交互的处理流程，覆盖拖拽排序、面板高度调整、眼睛按钮显隐、面板复用和智能继承五个关键逻辑。伪代码明确了条件判断和状态变更的精确步骤，消除实现歧义。

#### 5.1 拖拽排序逻辑

```
输入：拖拽起始按钮的 key（fromKey），拖拽目标按钮的 key（toKey）
处理：
  1. 获取当前预设的 toolbarOrder 数组
  2. 查找 fromKey 的索引 fromIndex，toKey 的索引 toIndex
  3. 若 fromIndex === toIndex，结束
  4. 从 toolbarOrder 中移除 fromIndex 位置的元素
  5. 将该元素插入到 toIndex 位置
  6. 调用 updatePreset({ toolbarOrder: newOrder }) 持久化
输出：标题栏按钮顺序及面板排列顺序更新
```

#### 5.2 面板高度调整逻辑

```
输入：鼠标移动事件（mousemove），起始 Y 坐标 startY，起始高度 startHeight
处理：
  1. 计算 dy = event.clientY - startY
  2. 计算新高度 newHeight = startHeight + dy
  3. 将 newHeight 限制在 [30, window.innerHeight * 0.85] 范围内
  4. 更新 panelsContainer 的 style.height
  5. 更新本地 panelHeight 变量
  6. 调用 updateViewPadding() 调整视图上边距
  7. 鼠标释放时调用 updatePreset({ toolbarPanelsHeight: newHeight }) 持久化
输出：面板高度实时变化，视图内容区上边距同步调整
```

#### 5.3 眼睛按钮显隐逻辑

```
输入：点击眼睛按钮的 barKey
处理：
  1. 触发 document.dispatchEvent('toolbar-expand')，确保面板展开
  2. 获取当前 barVisibility 对象
  3. 反转 barVisibility[barKey] 的值
  4. 调用 updatePreset({ barVisibility: newVisibility }) 持久化
  5. syncState() 自动触发 refreshContent()，移除或新建对应面板
输出：对应功能面板显示或隐藏，标题按钮眼睛图标透明度变化
```

#### 5.4 面板复用逻辑

```
输入：当前预设的 barVisibility 和 toolbarOrder
处理：
  1. 计算 visibleKeys = toolbarOrder.filter(key => barVisibility[key])
  2. 若存在输入框聚焦，仅移除/创建面板容器，不清空已有面板内容
  3. 遍历 barPanels（Map<string, HTMLElement>）：
     a. 若 key 不在 visibleKeys 中，移除面板 DOM，从 Map 中删除，销毁对应 Bar 实例
  4. 遍历 visibleKeys：
     a. 若 barPanels 中已有对应面板，保持不动（Bar 组件通过自身 store.subscribe 更新）
     b. 若 barPanels 中无对应面板，创建新 div，加入 panelsContainer，存入 barPanels
     c. 实例化对应的 Bar 组件（new BAR_COMPONENTS[key](panel, store)），存入 barInstances
输出：面板容器内容更新，无闪烁，Bar 实例不被重复创建
```

> 示例：用户从"所有任务"视图切换到"待办任务"视图时，两个视图都显示"任务状态"面板，则面板 DOM 和 Bar 实例均被复用，通过 store.subscribe 自动更新内容，而非销毁再创建。

#### 5.5 智能继承逻辑（Store 中实现）

```
输入：切换激活预设时的 oldActiveId 和 newActiveId
处理：
  1. 查找 oldPreset 和 targetPreset
  2. 若 oldPreset.showToolbar === true
     && targetPreset.showToolbar === false
     && targetPreset.toolbarEverShown !== true：
     a. 将 targetPreset.showToolbar 设为 true
     b. 将 targetPreset.toolbarEverShown 设为 true
输出：新预设自动继承工具栏打开状态
```

> 示例：用户在"所有任务"视图中打开了工具栏，然后切换到从未打开过工具栏的"待办任务"视图。此时"待办任务"会自动显示工具栏，而不是保持默认的关闭状态。

### 6. 界面设计

本章是模块的 UI 规格说明，涵盖整体架构关系、标题栏与面板的样式规范、8 个子功能栏的具体布局，以及核心交互流程和样式管理机制。

#### 6.1 整体架构

##### 与侧边栏的关系

- **侧边栏视图按钮**：每个按钮代表一个预设方案，可自定义图标和名称。侧边栏视图按钮可自定义显隐，默认全部显示。底部提供新建按钮，创建后默认激活。
- **侧边栏设置按钮**：所有视图共用一个，根据当前激活的侧边栏视图判断配置目标。点击可整体显示或隐藏配置栏。
- 切换侧边栏视图时，配置栏自动切换到对应预设的配置。

##### 与视图内容的关系

- 每个业务视图顶部均包含统一的视图工具栏，配置栏悬浮于上方，不占用文档流。
- 下方通用视图区域根据工具栏高度自动调整上边距。
- 两者各自独立滚动，互不重叠。

##### 对齐策略

工具栏所有元素以主内容区（`.navigator-main`）左边缘为基准定位，天然对齐侧边栏右边缘。侧边栏宽度变化时通过尺寸监听自动调整。

#### 6.2 标题栏设计

每个标题按钮由**文字标签**和**眼睛图标**组成，组成可拖拽排序的按钮条。

| 元素     | 说明                                                       |
| -------- | ---------------------------------------------------------- |
| 文字标签 | 显示功能栏名称，如"任务状态"                               |
| 眼睛图标 | 点击切换对应面板显隐。可见时 opacity:1，隐藏时 opacity:0.4 |

| 功能栏键 | 标题文字 |
| -------- | -------- |
| `excut`  | 任务状态 |
| `search` | 任务描述 |
| `mark`   | 任务标记 |
| `time`   | 任务时间 |
| `view`   | 任务视图 |
| `hide`   | 视图隐藏 |
| `sort`   | 视图排序 |
| `config` | 视图配置 |

**交互行为**：

- **眼睛图标**：点击切换面板显隐。若面板处于折叠状态，先自动展开再显示面板。隐藏时标题按钮保留原位，面板不渲染；再次点击恢复。状态实时持久化。
- **拖拽排序**：按住按钮拖动改变顺序，面板排列同步更新。排序状态在显隐时均保持。首次打开某个视图时全显示，按默认顺序确保用户看到完整功能。
- **智能继承**：切换侧边栏预设时，若新预设从未打开过工具栏而当前预设已打开，则自动将新预设设为打开状态。

**样式规范**：

| 属性        | 规范                                                                                                                          |
| ----------- | ----------------------------------------------------------------------------------------------------------------------------- |
| 内边距      | `6px 6px`                                                                                                                     |
| 字体族/字号 | `var(--font-text)` / `var(--font-ui-small)`                                                                                   |
| 行高        | `var(--line-height-normal)`                                                                                                   |
| 文字颜色    | `var(--text-normal)`                                                                                                          |
| 背景        | 透明；悬停 `var(--background-modifier-hover)`，激活 `var(--background-modifier-active)`                                       |
| 边框        | `1px solid transparent`                                                                                                       |
| 容器        | `display:flex; background:var(--background-secondary); border:1px solid var(--background-modifier-border); border-radius:6px` |

#### 6.3 功能面板设计

**面板容器**：

| 属性       | 规范                                                         |
| ---------- | ------------------------------------------------------------ |
| 定位       | 绝对定位，铺满宿主容器                                       |
| 背景       | `var(--background-primary)`                                  |
| 边框与圆角 | `1px solid var(--background-modifier-border)`，`0 0 6px 6px` |
| 内边距     | `4px 4px 16px 4px`                                           |
| 排列       | `flex-direction:column; gap:4px`                             |
| 溢出       | `overflow-y:auto`                                            |
| 高度       | 默认 300px，可拖拽调整，范围 30px~视口 85%                   |

**折叠与展开**：

- **拖拽手柄**：位于按钮条下方，鼠标悬停显示，高度 8px，背景 `rgba(128,128,128,0.4)`。点击箭头（▲/▼）切换折叠，拖拽手柄调整高度，极低高度（≤30px）自动折叠。
- 折叠后面板隐藏仅留手柄，展开时刷新面板内容。

**面板复用**：

- 各功能栏面板通过 `Map<string, HTMLElement>` 缓存。
- 切换预设或显隐时，仅移除不需要的面板，保留的容器不清空内容。
- Bar 组件实例通过 `Map<string, any>` 缓存，已存在的面板不重新创建 Bar 实例。
- 检测输入框聚焦状态，若聚焦则跳过面板内容重建，保护用户输入。

#### 6.4 通用 UI 规范

以下规范适用于所有子功能栏，确保视觉一致性。

**按钮规范**：

| 属性        | 规范                                        |
| ----------- | ------------------------------------------- |
| 内边距      | 上下左右 `6px`                              |
| 字体族/字号 | `var(--font-text)` / `var(--font-ui-small)` |
| 行高        | `var(--line-height-normal)`                 |
| 对齐方式    | 文字左对齐                                  |
| 尺寸        | 由内容自适应，不拉伸收缩                    |
| 外边距      | `2px 4px 2px 0`                             |
| 显示方式    | `inline-flex; align-items:center`           |

**说明文字规范**：

| 属性        | 规范                                                                                    |
| ----------- | --------------------------------------------------------------------------------------- |
| 宽度        | 固定 `4em`                                                                              |
| 字体族/字号 | `var(--font-text)` / `var(--font-ui-small)`                                             |
| 粗细/颜色   | `normal` / `var(--text-normal)`                                                         |
| 对齐方式    | 两端对齐（`text-align:justify; text-align-last:justify; text-justify:inter-character`） |
| 后缀        | 无冒号                                                                                  |
| 外边距      | 右侧 `8px`，其余 `0`；无内边距/边框                                                     |

**行容器规范**：

| 属性   | 规范                                                           |
| ------ | -------------------------------------------------------------- |
| 排列   | `display:flex; align-items:center; justify-content:flex-start` |
| 行间距 | `margin-bottom:4px`                                            |
| 换行   | `flex-wrap:wrap`                                               |

#### 6.5 子功能栏详细设计

##### 任务状态栏

- **功能**：按执行状态筛选，多选。默认全选。
- **按钮**：从左到右依次为"未开始""计划中""进行中""已完成""已取消"。选中高亮，点击切换。逻辑为"或"。
- **标签**："任务状态"，标准样式。

##### 任务描述栏

- **功能**：按关键词实时过滤任务描述文本。支持多段关键字（空格分隔），逻辑为"且"。
- **组件**：一个文本输入框，占位文字"输入任务描述关键词，多个用空格分隔，如：xxx xxx"，输入即更新筛选。
- **输入保护**：维护 `currentValue` 缓存输入值，在 Store 触发重渲染时恢复；检测已有输入框时仅同步值不重建 DOM；工具栏刷新时检测输入框聚焦状态，若聚焦则跳过面板内容重建。
- **标签**："任务描述"，标准样式。

##### 任务标记栏

- **功能**：按标记筛选，支持优先级和循环的具体值多选。默认所有标记参与筛选。全选时不过滤。

- **分组**（五行）：

    | 标签   | 按钮内容                                          |
    | ------ | ------------------------------------------------- |
    | 优先级 | 主按钮"优先级" + 子按钮🔺⏫🔼🔽⏬（逆序）         |
    | 循环   | 主按钮"循环" + 子按钮🔁 every day/week/month/year |
    | 日期   | 创建、计划、开始、截止、完成、取消                |
    | 标签   | "标签"按钮                                        |
    | 依赖   | "唯一ID"按钮、"引用ID"按钮                        |

- **优先级组**：主按钮控制子按钮的全选/全不选。任意子项选中即高亮，所有子项取消才取消高亮。子按钮始终可见，多选，选中高亮，逆序排列。选中的值存入 `priorityValues`。

- **循环组**：主按钮控制子按钮的全选/全不选。任意子项选中即高亮，所有子项取消才取消高亮。子按钮始终可见，多选，选中高亮，顺序排列。选中的值存入 `repeatCycles`。

- **其他组（日期、标签、依赖）**：多选，选中高亮，逻辑为"或"，通过 `includeMarks` 控制。

- **标签**：所有行标签均采用标准样式。

##### 任务时间栏

任务时间栏由动态时间滑动条和静态时间滑动条组成，用户通过拖动滑动条来设置任务筛选的时间范围。

###### 数据模型

| 变量                          | 用途                  | 说明                                           |
| ----------------------------- | --------------------- | ---------------------------------------------- |
| `dynamicStart` / `dynamicEnd` | 动态滑动条            | 相对今天的偏移日期，纯手动控制                 |
| `dynamicUnit`                 | 动态单位              | `"day"\|"week"\|"month"\|"quarter"\|"year"`    |
| `staticStart` / `staticEnd`   | 静态滑动条 + 筛选条件 | 从 `filter.dateRange` 恢复，受动态时间单向同步 |
| `useDynamic`                  | 模式标志              | `true` 时动态时间单向同步到静态时间            |
| `intervalMode`                | 时间计算模式          | `"scheduled-due"` 或 `"starts-done"`           |
| `currentMinYear`              | 基准年份              | 滑动条范围和格式化基于此年份                   |
| `currentMaxYear`              | 最大年份              | 同 `currentMinYear` 相同时为单一年份           |
| `childSlidersDrivenByYear`    | 年驱动标志            | `true` 时下级滑块由年级别驱动                  |

###### 状态保存（取消"使用动态"时恢复）

| 变量                            | 说明                       |
| ------------------------------- | -------------------------- |
| `savedStaticStart`              | 点击"使用动态"前的静态起始 |
| `savedStaticEnd`                | 点击"使用动态"前的静态结束 |
| `savedCurrentMinYear`           | 保存的基准年份             |
| `savedCurrentMaxYear`           | 保存的最大年份             |
| `savedChildSlidersDrivenByYear` | 保存的年驱动标志           |

###### 联动矩阵

| 场景                        | 动态→静态 | 静态→动态 |
| --------------------------- | --------- | --------- |
| 选中"使用动态" + 拖动动态   | ✅ 同步   | -         |
| 选中"使用动态" + 拖动静态   | -         | ❌ 不影响 |
| 未选中"使用动态" + 拖动动态 | ❌ 不影响 | -         |
| 未选中"使用动态" + 拖动静态 | -         | ❌ 不影响 |
| 点击"使用动态"按钮          | ✅ 同步   | -         |
| 取消"使用动态"按钮          | 恢复保存  | ❌ 不影响 |

###### 布局结构

```
模式    [计划~截止]

动态    年 季 月 周 日  [使用动态]
        [========||========] 本日 ~ 后3天

静态
年      [========||========] 2021 ~ 2031
季      [========||========] 2季 ~ 4季
月      [========||========] 5月 ~ 12月
周      [========||========] 22周 ~ 53周
日      [========||========] 2026/5/31日 ~ 2026/12/31日
```

###### 模式切换

- **计划~截止 / 开始~完成**：切换时间计算模式。`scheduled-due`：起始=`_scheduled`，结束=`_due`（无`_due`回退到`_done`）。`starts-done`：起始=`_starts`，结束=`_done`（无`_done`回退到`_due`）。按钮始终高亮，状态持久化到 `intervalMode`。

- **使用动态**：未选中时动态和静态滑动条独立操作，互不影响。选中时动态滑动条影响静态滑动条，静态滑动条不影响动态滑动条。状态持久化到 `useDynamic`。按钮位于动态单位切换按钮右侧，选中高亮。

###### 动态滑动条

- 单位切换按钮：年/季/月/周/日，选中高亮。切换单位时只重建动态滑动条 DOM，静态滑动条不受影响。
- 范围：日/周/月/季不允许跨年，范围根据今天到年初/年末的距离动态计算。年允许跨年，范围固定为前后5年。
- 中点标记：偏移为0的位置（今天）用强调色重点标记。
- 说明文字：偏移为0时显示"本日/本周/本月/本季/本年"。非0时显示"前/后N日/周/月/季/年"。范围格式：`本日~后5日`。文字宽度 160px，不换行。
- 默认状态：两个手柄在"本日"位置重合。

###### 静态滑动条

- 范围：年固定为当前年±10。季/月/周/日同年为全范围（1~4、1~12、1~52/53、1~365/366）。跨年时范围累加所有涉及年份的单位总数。
- 跨年值计算：使用年份缓存表累加各年份的实际值（季+4、月+12、周+weeksInYear、日+daysInYear）。
- 格式化：使用 `while` 循环逐年减去单位数来确定所属年份，确保不出现0值。
- 级联更新：拖动任一静态滑动条后，所有级别（年/季/月/周/日）同步刷新。
- 标记线：今天所在位置用强调色标记。
- 说明文字：单值格式如 `2026年`、`2026/2季`、`2026/6月`、`2026/23周`、`2026/6/1日`。文字宽度 160px，不换行。

###### 滑动条通用设计

- 手柄：对称设计。起始手柄向左突出（`border-radius:3px 0 0 3px`，`translateX(-100%)`），结束手柄向右突出（`border-radius:0 3px 3px 0`，`translateX(0)`）。宽度 6px，高度 16px。
- 轨道：高度 4px，填充条颜色 `var(--interactive-accent)`。
- 刻度标记：最多 20 个。普通刻度 1px×8px 灰色半透明。今天刻度 2px×16px 强调色。如果 step 跳过了 todayVal，单独添加今天刻度。
- 交互：拖动单个手柄只移动该手柄。点击两个手柄之间的线段整体拖动（仅当间距≥step）。点击范围外轨道就近移动一个手柄。
- 钳制：所有手柄值始终为整数（`Math.round`），统一钳制到 `[min, max]` 范围内。
- 精度：所有日期计算基于年份缓存表（`ensureYearCache`），避免 ISO 8601 边界问题。年初/年末特殊处理（1月1日周数强制为1，12月31日周数强制为最后一周）。

###### 持久化

- `filter.dateRange`：存储 `staticStart`/`staticEnd` 的时间戳
- `useDynamic`：是否启用动态联动
- `intervalMode`：时间计算模式
- 首次渲染时从 `preset.filter.dateRange` 恢复 `staticStart`/`staticEnd`
- TimeBar 不订阅 Store，通过 `updatePreset` 一次性写入
- 恢复默认时通过 `ToolbarManager.refreshContent` 重建 TimeBar

###### 跨天检测

- 每 60 秒定时检查日期变化
- 监听 Obsidian 工作区 `active-leaf-change` 和 `layout-change` 事件
- 日期跨天后自动更新"今天"标记位置
- 使用 `requestAnimationFrame` 防抖

##### 任务视图栏

- **功能**：切换通用视图样式，多选一。共 19 种视图，分 4 组展示。

- **分组**：

    | 组标签   | 视图列表                                         |
    | -------- | ------------------------------------------------ |
    | 基础视图 | 列表、卡片、表格                                 |
    | 标记视图 | 状态、优先级、循环、日期、标签、唯一ID、引用ID   |
    | 管理视图 | 看板、矩阵、逾期、时间轴、任务树、甘特图、日历图 |
    | 统计视图 | 基础统计、详细统计                               |

- **按钮**：仅显示文字，无 emoji。当前激活视图高亮。

- **标签**：标准样式。

##### 视图隐藏栏

- **功能**：控制特定类型任务/文件夹/表格列的显隐，多选。隐藏状态下高亮（按钮文字为"显示xx"）。

- **隐藏控制行**：标签"隐藏"，四个按钮（动态文字）：

    | 按钮                  | 功能                         |
    | --------------------- | ---------------------------- |
    | 隐藏循环/显示循环     | 切换循环任务显隐，默认隐藏   |
    | 隐藏已完成/显示已完成 | 切换已完成任务显隐，默认隐藏 |
    | 隐藏已取消/显示已取消 | 切换已取消任务显隐，默认隐藏 |
    | 隐藏文件夹/显示文件夹 | 切换文件夹节点显隐           |

- **表格列控制行**：标签"表格列"，各列按钮，点击切换显隐。

- **标签**：标准样式。

##### 视图排序栏

- **功能**：按指定字段排序，正逆序切换，多选一。
- **排序选项**（14 个）：状态、描述、优先级、循环、创建、计划、开始、截止、取消、完成、标签、唯一ID、引用ID、文件名。
- **当前排序**：激活按钮追加"↑"或"↓"。
- **标签**："排序"，标准样式。

##### 视图配置面板

- **功能**：管理视图的名称、图标，以及配置的导入、导出、恢复和删除。

- **操作按钮**：

    | 按钮        | 功能                                 |
    | ----------- | ------------------------------------ |
    | 📥 导入配置 | 从 JSON 文件导入并合并至当前预设     |
    | 📤 导出配置 | 导出当前预设为 JSON 文件             |
    | 🔄 恢复默认 | 重置所有状态为出厂默认               |
    | 🗑️ 删除视图 | 删除当前视图，自动切至剩余第一个视图 |

- **恢复默认**：将当前视图所有状态重置为 `PRESET_DEFAULTS` 中的出厂默认值。

#### 6.6 核心交互流程

- **打开/关闭配置栏**：侧边栏设置按钮切换 `showToolbar`，同步调整内容区上边距。
- **折叠/展开面板**：点击手柄箭头或拖拽至 30px 以下自动折叠，状态持久化。
- **调整高度**：拖拽手柄实时生效并保存。
- **眼睛按钮**：切换面板显隐，若折叠先展开，触发 `toolbar-expand` 事件。
- **拖拽排序**：拖动标题按钮改变顺序，面板排列同步更新并持久化。
- **视图管理**：侧边栏底部新建（以 `all-tasks` 预设为模板），配置栏删除视图。

#### 6.7 样式管理

所有自定义样式通过 `ToolbarManager.injectStyles()` 注入 `<style>` 标签，选择器带 `.toolbar-panels` 或 `.toolbar-buttons` 前缀，作用域隔离。插件卸载时移除样式标签。

### 7. 约束与假设

- **运行环境**：Obsidian 0.15.0+，需启用 Dataview 和 Obsidian Tasks 插件。
- **CSS 变量依赖**：假定 Obsidian 主题提供 `--font-text`、`--font-ui-small`、`--text-normal`、`--background-primary`、`--background-secondary`、`--background-modifier-border`、`--background-modifier-hover`、`--background-modifier-active` 等 CSS 变量。
- **Store 依赖**：假定 Store 已在插件加载时完成初始化并传入。
- **浏览器兼容性**：假定运行环境为 Chromium（Electron），支持 ES2020+、ResizeObserver、CSS Flexbox 等特性。
- **性能假设**：面板数量固定（8个），面板复用机制已保证切换时无明显性能问题。
- **移动端适配**：当前未充分测试移动端。

### 8. 测试要点

- 切换侧边栏视图按钮时，配置栏状态正确恢复。
- 拖拽标题栏按钮后，面板排列顺序同步更新。
- 点击眼睛按钮显隐面板，折叠状态下面板不渲染。
- 拖拽手柄调整面板高度，释放后持久化。
- 点击"恢复默认"后，所有状态重置为出厂默认。
- 切换预设时，工具栏智能继承逻辑正确触发。
- 搜索框输入时，面板不闪烁，输入焦点不丢失。
- 动态滑动条和静态滑动条联动正确（"使用动态"按钮控制）。
- 取消"使用动态"后静态状态恢复。
- 时间计算模式切换后，筛选结果相应变化。
- 切换动态单位时只重建动态滑动条。
- 跨年时静态滑动条范围和值正确。
- 手柄紧贴时不弹开，互不影响。
- 滑块只在整数位置停留。
- 新建视图配置与"所有任务"默认状态一致。

### 附录：涉及文件

| 文件                                 | 职责                                                       |
| ------------------------------------ | ---------------------------------------------------------- |
| `src/ui/bars/bars.ts`                | ToolbarManager：容器管理、样式注入、面板复用、Bar 实例缓存 |
| `src/ui/bars/head-bar.ts`            | 标题栏按钮条：渲染、眼睛图标、拖拽排序                     |
| `src/ui/bars/time-bar.ts`            | 任务时间栏：动态/静态滑动条、模式切换、联动逻辑            |
| `src/ui/bars/excut-bar.ts`           | 任务状态栏：状态多选按钮                                   |
| `src/ui/bars/search-bar.ts`          | 任务描述栏：文本输入过滤、输入保护                         |
| `src/ui/bars/mark-bar.ts`            | 任务标记栏：分组、主按钮全选/全不选、子按钮多选            |
| `src/ui/bars/view-bar.ts`            | 任务视图栏：4 组 19 种视图                                 |
| `src/ui/bars/hide-bar.ts`            | 视图隐藏栏：任务/文件夹显隐、表格列控制                    |
| `src/ui/bars/sort-bar.ts`            | 视图排序栏：14 种排序、升降序                              |
| `src/ui/bars/config-bar.ts`          | 视图配置面板：名称/图标、导入导出、恢复默认、删除          |
| `src/ui/bars/side-bar.ts`            | 侧边栏：视图列表、折叠展开、新建                           |
| `src/ui/components/slider/slider.ts` | 通用双滑块组件                                             |
| `src/process/bars/set-bar.ts`        | 日期计算、格式化、年份缓存                                 |
| `src/process/process.ts`             | 日期工具 `DateUtils`                                       |
| `src/store/store.ts`                 | Store：智能继承、持久化                                    |
| `src/main.ts`                        | 插件入口：默认预设                                         |
| `src/types.ts`                       | 类型定义                                                   |

## 通用视图模块详细设计

### 1. 模块标识

| 属性       | 内容                                  |
| ---------- | ------------------------------------- |
| 模块名称   | 通用视图组件 (Common View Components) |
| 模块标识符 | `ui.components`                       |
| 版本号     | 1.0.0                                 |
| 开发者     | -                                     |
| 最后更新   | 2026-06-05                            |
| 所属CSCI   | Obsidian Task Manage 插件             |

---

### 2. 功能描述

通用视图模块是插件中所有可复用视图组件的集合，它们不包含任何业务筛选逻辑，仅负责数据呈现与基础交互。每个组件通过接收数据数组和配置选项返回 DOM，与业务视图完全解耦。

本章从整体定位出发，介绍各组件的分类与核心能力，然后逐一说明每个已设计完成的通用视图的详细设计。

#### 2.1 整体定位与架构关系

通用视图组件位于 `src/ui/components/` 目录下，按功能分为以下类别：

```
components/
├── cards/          # 卡片组件
├── lists/          # 列表组件
├── tables/         # 表格组件
├── boards/         # 面板组件
├── bar/            # 进度条组件
├── tooltip/        # 提示框组件
└── charts/         # 图表组件（基础统计图、详细统计图暂不展开）
```

所有通用组件通过 `BaseTaskView.renderByStyle()` 根据当前视图样式动态选择调用。

#### 2.2 核心能力概述

| 组件       | 能力                                                    |
| ---------- | ------------------------------------------------------- |
| 任务卡片   | 统一任务信息展示，支持详细/简洁模式，tooltip 和点击跳转 |
| 任务列表   | 按配置渲染任务列表，支持紧凑模式和点击回调              |
| 任务表格   | 可排序、可自定义列显隐的任务表格                        |
| 状态列表   | 按执行状态分组展示任务                                  |
| 优先级列表 | 按优先级分组展示任务                                    |
| 循环列表   | 按循环周期分组展示任务                                  |
| 时间列表   | 按计划日期分组展示任务                                  |
| 标签列表   | 按标签分组展示任务                                      |
| 唯一ID列表 | 展示带唯一ID的任务                                      |
| 依赖列表   | 展示带依赖关系的任务                                    |
| 逾期列表   | 按逾期天数分组展示任务                                  |
| 时间轴列表 | 按截止日期分组展示任务                                  |
| 看板       | 三列横向布局，按执行状态分列                            |
| 矩阵       | 四象限布局，按优先级分象限                              |
| 任务树     | 树形结构展示文件、标题、列表任务                        |
| 进度条     | 按状态分段的彩色进度条，支持 tooltip 和百分比           |
| Tooltip    | 单例管理器，全局复用                                    |

---

### 3. 接口定义

#### 3.1 任务卡片 (TaskCard)

| 函数签名                                                                      | 说明             |
| ----------------------------------------------------------------------------- | ---------------- |
| `createTaskCard(task: any, options?: { showTooltip?: boolean }): HTMLElement` | 创建统一任务卡片 |

**options**：

| 字段          | 类型      | 说明                         |
| ------------- | --------- | ---------------------------- |
| `showTooltip` | `boolean` | 是否显示 tooltip，默认 false |

#### 3.2 任务列表 (TaskList)

| 函数签名                                                                                | 说明         |
| --------------------------------------------------------------------------------------- | ------------ |
| `renderTaskList(container: HTMLElement, tasks: any[], options?: TaskListOptions): void` | 渲染任务列表 |

**TaskListOptions**：

| 字段      | 类型                  | 说明                   |
| --------- | --------------------- | ---------------------- |
| `onClick` | `(task: any) => void` | 点击回调               |
| `compact` | `boolean`             | 紧凑模式，隐藏元数据行 |

#### 3.3 任务表格 (TaskTable)

| 函数签名                                                                                  | 说明         |
| ----------------------------------------------------------------------------------------- | ------------ |
| `renderTaskTable(container: HTMLElement, tasks: any[], options?: TaskTableOptions): void` | 渲染任务表格 |

**TaskTableOptions**：

| 字段                | 类型                      | 说明       |
| ------------------- | ------------------------- | ---------- |
| `onClick`           | `(task: any) => void`     | 点击回调   |
| `columnsVisibility` | `Record<string, boolean>` | 列显隐状态 |

#### 3.4 分组卡片 (GroupCard)

| 函数签名                                                  | 说明         |
| --------------------------------------------------------- | ------------ |
| `createGroupCard(options: GroupCardOptions): HTMLElement` | 创建分组卡片 |

**GroupCardOptions**：

| 字段      | 类型                  | 说明       |
| --------- | --------------------- | ---------- |
| `title`   | `string`              | 标题       |
| `count`   | `number`              | 任务数量   |
| `tasks`   | `any[]`               | 任务列表   |
| `onClick` | `(task: any) => void` | 点击回调   |
| `color`   | `string`              | 左侧颜色条 |

#### 3.5 进度条 (ProgressBar)

| 函数签名                                                      | 说明       |
| ------------------------------------------------------------- | ---------- |
| `createProgressBar(options: ProgressBarOptions): HTMLElement` | 创建进度条 |

**ProgressBarOptions**：

| 字段          | 类型                     | 说明                   |
| ------------- | ------------------------ | ---------------------- |
| `counts`      | `Record<string, number>` | 各状态数量             |
| `total`       | `number`                 | 总任务数               |
| `height`      | `string`                 | 进度条高度，默认 "6px" |
| `showPercent` | `boolean`                | 是否显示百分比         |

#### 3.6 Tooltip 管理器

| 方法                                               | 说明         |
| -------------------------------------------------- | ------------ |
| `tooltip.show(html: string, x: number, y: number)` | 显示 tooltip |
| `tooltip.move(x: number, y: number)`               | 移动 tooltip |
| `tooltip.hide()`                                   | 隐藏 tooltip |

#### 3.7 统计函数

| 函数签名                                                                             | 说明               |
| ------------------------------------------------------------------------------------ | ------------------ |
| `countTaskStatuses(tasks: any[]): { counts: Record<string, number>; total: number }` | 统计各状态任务数量 |

#### 3.8 状态列表 (StatusList)

| 函数签名                                                                                                | 说明               |
| ------------------------------------------------------------------------------------------------------- | ------------------ |
| `renderStatus(container: HTMLElement, tasks: any[], options?: { onClick?: (task: any) => void }): void` | 按执行状态分组渲染 |

#### 3.9 优先级列表 (PriorityList)

| 函数签名                                                                                                  | 说明             |
| --------------------------------------------------------------------------------------------------------- | ---------------- |
| `renderPriority(container: HTMLElement, tasks: any[], options?: { onClick?: (task: any) => void }): void` | 按优先级分组渲染 |

#### 3.10 循环列表 (RecurringList)

| 函数签名                                                                                                   | 说明               |
| ---------------------------------------------------------------------------------------------------------- | ------------------ |
| `renderRecurring(container: HTMLElement, tasks: any[], options?: { onClick?: (task: any) => void }): void` | 按循环周期分组渲染 |

#### 3.11 时间列表 (TimeList)

| 函数签名                                                                                                  | 说明               |
| --------------------------------------------------------------------------------------------------------- | ------------------ |
| `renderTimeList(container: HTMLElement, tasks: any[], options?: { onClick?: (task: any) => void }): void` | 按计划日期分组渲染 |

#### 3.12 标签列表 (TagList)

| 函数签名                                                                                             | 说明           |
| ---------------------------------------------------------------------------------------------------- | -------------- |
| `renderTag(container: HTMLElement, tasks: any[], options?: { onClick?: (task: any) => void }): void` | 按标签分组渲染 |

#### 3.13 唯一ID列表 (UniqueIdList)

| 函数签名                                                                                                  | 说明               |
| --------------------------------------------------------------------------------------------------------- | ------------------ |
| `renderUniqueId(container: HTMLElement, tasks: any[], options?: { onClick?: (task: any) => void }): void` | 渲染带唯一ID的任务 |

#### 3.14 依赖列表 (DependsList)

| 函数签名                                                                                                 | 说明                 |
| -------------------------------------------------------------------------------------------------------- | -------------------- |
| `renderDepends(container: HTMLElement, tasks: any[], options?: { onClick?: (task: any) => void }): void` | 渲染带依赖关系的任务 |

#### 3.15 逾期列表 (OverdueList)

| 函数签名                                                                                                     | 说明               |
| ------------------------------------------------------------------------------------------------------------ | ------------------ |
| `renderOverdueList(container: HTMLElement, tasks: any[], options?: { onClick?: (task: any) => void }): void` | 按逾期天数分组渲染 |

#### 3.16 时间轴列表 (TimelineList)

| 函数签名                                                     | 说明               |
| ------------------------------------------------------------ | ------------------ |
| `renderTimeline(container: HTMLElement, tasks: any[]): void` | 按截止日期分组渲染 |

#### 3.17 看板 (Kanban)

| 函数签名                                                   | 说明         |
| ---------------------------------------------------------- | ------------ |
| `renderKanban(container: HTMLElement, tasks: any[]): void` | 三列看板渲染 |

#### 3.18 矩阵 (Matrix)

| 函数签名                                                   | 说明           |
| ---------------------------------------------------------- | -------------- |
| `renderMatrix(container: HTMLElement, tasks: any[]): void` | 四象限矩阵渲染 |

#### 3.19 任务树 (TaskTree)

| 函数签名                                                                                | 说明           |
| --------------------------------------------------------------------------------------- | -------------- |
| `renderTaskTree(container: HTMLElement, tasks: any[], options?: TreeListOptions): void` | 渲染任务树视图 |

**TreeListOptions**：

| 字段          | 类型      | 说明               |
| ------------- | --------- | ------------------ |
| `hideFolders` | `boolean` | 是否隐藏文件夹节点 |
| `dv`          | `any`     | Dataview API 实例  |
| `pages`       | `any[]`   | 任务文件页面列表   |

---

### 4. 数据描述

#### 4.1 统一任务数据结构

所有通用组件接收的任务数据共享统一的数据结构：

| 字段            | 类型     | 说明                                                   |
| --------------- | -------- | ------------------------------------------------------ |
| `_status`       | `string` | 执行状态：todo/planned/in-progress/completed/cancelled |
| `_cleanText`    | `string` | 清理标记后的描述文本                                   |
| `_priorityIcon` | `string` | 优先级图标：🔺⏫🔼🔽⏬                                 |
| `_created`      | `string` | 创建日期                                               |
| `_scheduled`    | `string` | 计划日期                                               |
| `_starts`       | `string` | 开始日期                                               |
| `_due`          | `string` | 截止日期                                               |
| `_done`         | `string` | 完成日期                                               |
| `_cancel`       | `string` | 取消日期                                               |
| `_tag`          | `string` | 标签                                                   |
| `_id`           | `string` | 唯一ID                                                 |
| `_forbid`       | `string` | 引用ID                                                 |
| `_repeat`       | `string` | 循环周期                                               |
| `path`          | `string` | 文件路径                                               |
| `line`          | `number` | 行号                                                   |

#### 4.2 状态颜色

| 状态        | 颜色    | 图标 |
| ----------- | ------- | ---- |
| todo        | #2e333b | 🔲   |
| planned     | #4b525b | ❔   |
| in-progress | #7fb8f0 | ⏩   |
| completed   | #47852f | ✅   |
| cancelled   | #c3393e | ❎   |

#### 4.3 优先级颜色

| 优先级 | 图标 | 颜色    |
| ------ | ---- | ------- |
| 最高   | 🔺   | #c3393e |
| 高     | ⏫   | #e06c75 |
| 中     | 🔼   | #d19a66 |
| 低     | 🔽   | #61afef |
| 最低   | ⏬   | #98c379 |

---

### 5. 处理逻辑

#### 5.1 卡片渲染逻辑

```
输入：任务数据 task
处理：
  1. 提取执行状态 → statusIcon + statusName
  2. 提取优先级 → priorityIcon + label
  3. 提取日期字段 → 格式化日期
  4. 构建元数据 HTML
  5. 创建 li 元素
  6. 若 showTooltip，构建 tooltip 内容并绑定事件
  7. 绑定 click 事件跳转到源文件
输出：完整卡片 DOM
```

**tooltip 构建规则**：

- 只显示有值的字段
- 日期字段使用 `hasValue` 函数判断：`null`、`undefined`、空字符串不显示
- 顺序：状态 → 优先级 → 循环 → 创建 → 计划 → 开始 → 截止 → 完成 → 取消 → ID → 依赖 → 标签

#### 5.2 进度条渲染逻辑

```
输入：counts, total, height, showPercent
处理：
  1. 按顺序遍历状态：todo → planned → in-progress → completed → cancelled
  2. 计算每段宽度百分比 = count / total * 100
  3. 创建对应颜色的 div 段
  4. 若 showPercent，计算完成百分比并添加标签
  5. 构建 tooltip 内容（各状态名称+百分比+数量）
  6. 绑定 tooltip 事件
输出：完整进度条 DOM
```

**tooltip 顺序**：未开始 → 计划中 → 进行中 → 已取消 → 已完成

#### 5.3 分组卡片渲染逻辑

```
输入：title, count, tasks, color
处理：
  1. 创建卡片容器，设置背景、边框、圆角
  2. 若提供 color，设置左侧 4px 颜色条
  3. 创建标题栏：flex 布局，左侧标题，右侧数量
  4. 遍历 tasks，调用 createTaskCard 创建卡片
  5. 绑定点击回调
输出：分组卡片 DOM
```

#### 5.4 Tooltip 管理逻辑

```
输入：html 内容，鼠标坐标 (x, y)
处理：
  1. 确保 tooltip div 已创建（单例模式）
  2. 设置 innerHTML 为传入内容
  3. 设置 display: block
  4. 定位在鼠标右下方 (x+15, y+15)
  5. 鼠标移动时更新位置
  6. 鼠标离开时隐藏
输出：tooltip 显示在正确位置
```

---

### 6. 界面设计

#### 6.1 任务卡片

##### 详细模式（两行）

```
┌──────────────────────────────────────────┐
│ 🔲 任务描述文本                           │
│ 🔲 未开始  🔼 中  📅 2026-01-01  🏁 tag │
└──────────────────────────────────────────┘
```

| 属性       | 规范                                       |
| ---------- | ------------------------------------------ |
| 内边距     | 8px 10px                                   |
| 圆角       | 8px                                        |
| 左侧边框   | 3px solid var(--interactive-accent)        |
| 背景       | var(--background-primary)                  |
| 描述行     | font-weight: 500, margin-bottom: 4px       |
| 元数据行   | font-size: 0.8em, color: var(--text-muted) |
| 元数据布局 | display:flex, gap:8px, flex-wrap:wrap      |

##### 简洁模式（单行）

仅显示描述行，元数据通过 tooltip 展示。用于任务树视图：

| 属性     | 规范                                  |
| -------- | ------------------------------------- |
| 边框     | none                                  |
| 背景     | transparent                           |
| 内边距   | 1px 0                                 |
| 描述行   | font-weight: normal, margin-bottom: 0 |
| 元数据行 | display: none                         |

#### 6.2 卡片网格视图

```
┌──────────┐ ┌──────────┐ ┌──────────┐
│ 任务卡片1 │ │ 任务卡片2 │ │ 任务卡片3 │
└──────────┘ └──────────┘ └──────────┘
```

| 属性 | 规范                                        |
| ---- | ------------------------------------------- |
| 布局 | grid, repeat(auto-fill, minmax(280px, 1fr)) |
| 间距 | 12px                                        |

#### 6.3 任务列表

每个任务渲染为一张完整卡片，纵向排列，间距 6px。

#### 6.4 任务表格

| 属性     | 规范                                                                  |
| -------- | --------------------------------------------------------------------- |
| 宽度     | 100%                                                                  |
| 边框合并 | collapse                                                              |
| 表头     | padding: 4px 8px, font-size: var(--font-ui-smaller), font-weight: 600 |
| 数据行   | padding: 4px 8px, font-size: var(--font-ui-smaller)                   |
| 底边框   | 1px solid var(--background-modifier-border)                           |
| 描述列   | white-space: normal, word-break: break-word, width: 66%               |
| 其他列   | white-space: nowrap, width: 1px                                       |
| 悬停     | cursor: pointer                                                       |

**默认可见列**：状态、描述、优先级、计划、开始、取消、截止

#### 6.5 进度条

| 属性       | 规范                                                        |
| ---------- | ----------------------------------------------------------- |
| 容器       | display:flex, align-items:center, gap:4px                   |
| 进度条容器 | flex:1, height: 6px/8px, border-radius:3px, overflow:hidden |
| 段颜色     | 按状态使用 STATUS_COLORS                                    |
| 段顺序     | 未开始 → 计划中 → 进行中 → 已完成 → 已取消                  |
| 百分比     | font-size: var(--font-ui-smaller), flex-shrink:0            |
| Tooltip    | 各状态：图标 + 名称 + 百分比 + 数量                         |

#### 6.6 分组卡片

| 属性         | 规范                                                           |
| ------------ | -------------------------------------------------------------- |
| 背景         | var(--background-primary)                                      |
| 边框         | 1px solid var(--background-modifier-border)                    |
| 圆角         | 8px                                                            |
| 阴影         | 0 1px 4px rgba(0,0,0,0.08)                                     |
| 左侧颜色条   | 4px solid (根据分组类型)                                       |
| 标题栏       | padding: 8px 12px, display:flex, justify-content:space-between |
| 标题栏底边框 | 1px solid var(--background-modifier-border)                    |
| 标题字体     | font-weight: 600                                               |
| 数量字体     | color: var(--text-muted)                                       |
| 内容区       | padding: 8px 0                                                 |

#### 6.7 看板

三列横向布局：

| 列     | 标题   | 颜色                   |
| ------ | ------ | ---------------------- |
| 未开始 | 未开始 | rgba(180,180,180,0.25) |
| 计划中 | 计划中 | rgba(97,175,239,0.25)  |
| 进行中 | 进行中 | rgba(224,108,117,0.25) |

| 属性 | 规范                                           |
| ---- | ---------------------------------------------- |
| 布局 | display:flex, gap:12px, align-items:flex-start |
| 列宽 | flex:1, min-width:0                            |

#### 6.8 矩阵

四象限网格布局：

| 象限         | 优先级 | 标签           | 颜色                   |
| ------------ | ------ | -------------- | ---------------------- |
| 紧急重要     | 🔺     | 紧急与重要     | rgba(255,130,130,0.25) |
| 不紧急重要   | ⏫     | 不紧急但重要   | rgba(255,180,100,0.25) |
| 紧急不重要   | 🔼     | 紧急但不重要   | rgba(200,200,200,0.15) |
| 不紧急不重要 | 🔽⏬   | 不紧急也不重要 | rgba(100,180,255,0.2)  |

| 属性 | 规范                   |
| ---- | ---------------------- |
| 布局 | grid, 2列2行, gap:12px |

#### 6.9 状态列表

按执行状态分组：未开始 → 计划中 → 进行中 → 已完成 → 已取消。

每组使用分组卡片渲染，颜色使用对应状态色。

#### 6.10 优先级列表

按优先级从高到低分组：🔺 → ⏫ → 🔼 → 🔽 → ⏬ → 无优先级。

每组使用分组卡片渲染，颜色使用对应优先级色。

#### 6.11 循环列表

按循环周期分组：every day → every week → every month → every year。

2列2行网格布局，每组使用分组卡片。

| 周期        | 颜色                   |
| ----------- | ---------------------- |
| every day   | rgba(100,150,200,0.25) |
| every week  | rgba(100,180,150,0.25) |
| every month | rgba(180,150,100,0.25) |
| every year  | rgba(170,130,160,0.25) |

#### 6.12 时间列表

按计划日期分组，日期升序排列。无计划日期的排最后。

每组使用分组卡片，颜色使用统一蓝色：rgba(97,175,239,0.25)。

#### 6.13 标签列表

按标签分组，每个标签使用分组卡片渲染。

颜色循环使用：rgba(255,180,100,0.25) → rgba(180,220,120,0.25) → rgba(150,180,240,0.25) → rgba(240,130,130,0.25) → rgba(200,170,220,0.25)。

#### 6.14 唯一ID列表

筛选带唯一ID的任务，使用分组卡片渲染。

颜色：rgba(140,120,200,0.25)。

#### 6.15 依赖列表

筛选带引用ID的任务，使用分组卡片渲染。

颜色：rgba(224,108,117,0.25)。

#### 6.16 逾期列表

按逾期天数分组，天数降序排列。

每组使用分组卡片，颜色：rgba(224,108,117,0.25)。

逾期判断规则：

- 未完成任务：截止日期 < 今天
- 已完成任务：截止日期 < 完成日期

#### 6.17 时间轴列表

按截止日期分组，日期升序排列。无截止日期的排最后。

每组使用分组卡片，颜色：rgba(97,175,239,0.25)。

#### 6.18 任务树

任务树视图是插件的核心视图之一，以树形结构展示任务文件之间的层级关系。它从文件系统的 YAML 元数据和 Markdown 内容中解析任务结构，支持文件任务、标题任务和列表任务三种节点类型。

##### 6.18.1 整体定位与架构关系

任务树视图作为通用视图组件，通过 `BaseTaskView.renderByStyle()` 中的 `case "tree"` 分支调用。它接收经过筛选的任务数据和从 `loadTaskPages()` 加载的文件内容数据，构建完整的任务树结构并渲染。

与其他通用视图的关系：

- 复用 `createTaskCard` 组件实现统一的提示框和点击跳转
- 复用 `createProgressBar` 组件显示任务完成进度
- 通过 `BaseTaskView` 基类订阅 Store，响应筛选条件变化

##### 6.18.2 数据流

```
Obsidian Vault
    │
    ▼
BaseTaskView.render()
    ├── getAllTasks() → 获取所有任务数据
    ├── filterTasks() → 应用筛选条件
    └── loadTaskPages() → 加载文件内容
    │
    ▼
renderByStyle() → case "tree"
    │
    ▼
renderTaskTree(container, filteredTasks, { dv, pages })
    ├── buildNodeMap(pages, fileMap, dv)
    │   ├── parseFileContent(content, path) → ContentNode[]
    │   ├── pageToTaskData(page, path) → TreeNode._task
    │   └── mergeContentWithTasks(contentRoots, fileTasks)
    │
    ├── resolveRelations(nodeMap) → TreeNode[]
    │
    └── renderFileNodeInline(root, 0, tree)
        ├── 渲染文件任务卡片
        ├── renderContentNode() → 标题/列表任务
        └── 递归渲染子节点
```

##### 6.18.3 数据结构

**TreeNode**：

| 字段           | 类型                                                          | 说明                  |
| -------------- | ------------------------------------------------------------- | --------------------- |
| `path`         | `string`                                                      | 文件路径              |
| `name`         | `string`                                                      | 文件名称（去除 .md）  |
| `relPath`      | `string`                                                      | 相对路径              |
| `folderParts`  | `string[]`                                                    | 文件夹层级            |
| `metaParent`   | `string \| null`                                              | YAML 元数据中的父任务 |
| `linkParent`   | `string \| null`                                              | Wiki 链接指向的父任务 |
| `children`     | `TreeNode[]`                                                  | 子文件节点            |
| `tasks`        | `any[]`                                                       | 任务列表              |
| `conflict`     | `"meta_mismatch" \| "meta_missing" \| "link_missing" \| null` | 冲突类型              |
| `missingLinks` | `string[]`                                                    | 缺失的链接            |
| `contentRoots` | `ContentNode[]`                                               | 文件内容解析的根节点  |
| `_task`        | `any`                                                         | 文件任务数据          |

**ContentNode**：

| 字段            | 类型                  | 说明           |
| --------------- | --------------------- | -------------- |
| `type`          | `"heading" \| "task"` | 节点类型       |
| `level`         | `number`              | 标题级别 (1-6) |
| `text`          | `string`              | 显示文本       |
| `raw`           | `string`              | 原始文本       |
| `line`          | `number`              | 行号           |
| `children`      | `ContentNode[]`       | 子节点         |
| `parent`        | `ContentNode \| null` | 父节点         |
| `_task`         | `any`                 | 关联的任务数据 |
| `yamlStartLine` | `number`              | YAML 块起始行  |
| `yamlEndLine`   | `number`              | YAML 块结束行  |

##### 6.18.4 节点类型

| 节点类型 | 来源                                | 显示格式     | 标记                   |
| -------- | ----------------------------------- | ------------ | ---------------------- |
| 文件任务 | 页面 YAML frontmatter 解析          | `📄 文件名`  | `_isFileTask: true`    |
| 标题任务 | `# 任务行动` 下以"任务"结尾的子标题 | `H2 标题名`  | `_isHeadingTask: true` |
| 列表任务 | `# 任务行动` 下的任务行             | `● 任务描述` | 无特殊标记             |

所有节点类型共享统一的任务数据结构，包含执行状态、优先级、日期、ID、标签等字段。

##### 6.18.5 排序规则

同一节点下的子任务按以下顺序排列：

1. **列表任务**（`type: "task"`，order = 0）
2. **标题任务**（`type: "heading"`，order = 1）
3. **文件任务**（order = 2）

实现函数：`sortChildContentNodes()`，使用 `getNodeOrder()` 确定排序权重。

##### 6.18.6 缩进规则

- **统一缩进宽度**：`INDENT_WIDTH = 24px`
- 文件任务使用 `depth * INDENT_WIDTH` 作为 `margin-left`
- 标题任务在文件任务基础上 `depth + 1`
- 列表任务在所属标题基础上 `depth + 1`
- 嵌套列表任务在父列表任务基础上 `depth + 1`

##### 6.18.7 行容器结构

所有节点使用统一的行容器结构：

```
rowWrapper (margin-left: depth*24px, display:flex, align-items:center)
  ├── toggleBtn/spacer (width:16px)
  ├── contentContainer (display:flex, gap:4px, flex-shrink:0)
  │   ├── 文字内容 (flex:0 1 auto, padding:2px 4px)
  │   ├── 进度条 (width:60px, height:8px)
  │   ├── 百分比 (font-size:var(--font-ui-smaller))
  │   └── 数量徽章 (总数)
  └── rightSpacer (flex:1)
```

##### 6.18.8 渲染流程

```
renderTaskTree()
    │
    ├── 构建 fileMap
    ├── buildNodeMap() + resolveRelations() → roots
    │
    ├── roots.length > 0
    │   └── roots.forEach → renderFileNodeInline(root, 0, tree)
    │       ├── 渲染文件任务行
    │       ├── contentRoots 存在 → 渲染 contentRoots
    │       │   └── 收集已渲染行号，避免重复渲染
    │       ├── node.tasks 存在 → 渲染未在 contentRoots 中的任务
    │       └── node.children → 递归 renderFileNodeInline(child, depth+1)
    │
    ├── pages 存在但 roots 为空
    │   └── renderSimpleTree(fileMap)  // 回退方案
    │
    └── pages 为空
        └── 显示默认根节点 "📄 任务系统"
```

##### 6.18.9 交互行为

| 交互             | 行为                                         |
| ---------------- | -------------------------------------------- |
| 点击折叠按钮     | 切换子节点显示/隐藏，按钮文字在 ▼/▶ 之间切换 |
| 鼠标悬停节点文字 | 显示浅色背景，提示框显示完整任务信息         |
| 鼠标悬停进度条   | 提示框显示各状态的数量和百分比               |
| 点击文件任务     | 打开对应文件                                 |
| 点击标题任务     | 打开文件并跳转到标题行                       |
| 点击列表任务     | 打开文件并跳转到任务行                       |

##### 6.18.10 数据处理规则

**parseFileContent 解析规则**：

1. 找到 `# 任务行动` 区域
2. 提取以"任务"结尾的子标题 → 标题任务
3. 提取子标题下的任务行 → 列表任务
4. 使用 `TASK_REGEX` 匹配任务行，支持所有执行状态符号
5. 通过缩进级别（制表符/空格）确定嵌套关系
6. 过滤纯列表项（非任务格式）

**任务行动外任务的处理**：

- `contentRoots` 中的任务和 `node.tasks` 中的任务通过行号去重
- 不在 `# 任务行动` 区域内的任务也会被渲染

**去重计数**：

- 使用路径+行号作为唯一键：`path:lineNumber`
- `collectAllTasksFromNode()` 和 `collectNodeTasks()` 都使用此去重逻辑

**标题序号去除**：

- 支持 number headings 插件的各种序号格式
- 使用 `removeHeadingNumber()` 函数处理

##### 6.18.11 样式规范

| 元素       | 样式                                                        |
| ---------- | ----------------------------------------------------------- |
| 缩进宽度   | 24px                                                        |
| 折叠按钮   | 16px × 22px, font-size: 10px                                |
| 文字内容   | padding: 2px 4px, font-size: var(--font-ui-small)           |
| 字体       | var(--font-text)                                            |
| 颜色       | var(--text-normal)                                          |
| 悬停背景   | var(--background-modifier-hover)                            |
| 进度条宽度 | 60px                                                        |
| 进度条高度 | 8px                                                         |
| 百分比     | font-size: var(--font-ui-smaller)                           |
| 数量徽章   | font-size: var(--font-ui-smaller), color: var(--text-muted) |

##### 6.18.12 配置依赖

**TASK_ELEMENTS** 中的 `yaName` 字段用于 YAML 属性映射：

| TASK_ELEMENTS key | yaName     | Emoji      |
| ----------------- | ---------- | ---------- |
| status            | 任务状态   | 🔲❔⏩✅❎ |
| description       | 任务名称   | -          |
| priority          | 任务优先级 | 🔺⏫🔼🔽⏬ |
| repeat            | 任务周期   | 🔁         |
| created           | 任务创建   | ➕         |
| scheduled         | 任务计划   | ⏳         |
| starts            | 任务开始   | 🛫         |
| due               | 任务截止   | 📅         |
| done              | 任务完成   | ✅         |
| cancel            | 任务取消   | ❌         |
| tag               | 任务标签   | 🏁         |
| id                | 任务唯一ID | 🆔         |
| forbid            | 任务引用ID | ⛔         |

**STATUS_ALL_SYMBOLS** 执行状态与 Markdown 符号映射：

```typescript
{
    "todo": [" "],
    "planned": ["?"],
    "in-progress": [">", "/", "\\"],
    "completed": ["x", "X"],
    "cancelled": ["-"],
}
```

##### 6.18.13 关键文件

| 文件                                          | 职责                                             |
| --------------------------------------------- | ------------------------------------------------ |
| `src/process/components/tree-task-process.ts` | 数据处理：解析文件内容、构建节点树、解析父子关系 |
| `src/ui/components/lists/tree-list.ts`        | 渲染层：递归渲染树节点、处理交互事件             |
| `src/ui/components/cards/card.ts`             | 卡片组件：tooltip 和点击跳转                     |
| `src/ui/components/bar/progress-bar.ts`       | 进度条组件：进度显示和 tooltip                   |
| `src/ui/views/base-view.ts`                   | 视图基类：筛选、排序、视图切换                   |
| `src/configs/configs.ts`                      | 统一配置：任务元素定义、符号映射                 |

---

### 7. 约束与假设

- **运行环境**：Obsidian 0.15.0+，需启用 Dataview 和 Obsidian Tasks 插件
- **CSS 变量依赖**：假定主题提供 `--font-text`、`--font-ui-small`、`--font-ui-smaller`、`--text-normal`、`--text-muted`、`--background-primary`、`--background-modifier-border`、`--background-modifier-hover`、`--interactive-accent` 等变量
- **数据依赖**：任务数据需包含 `_status`、`_cleanText`、`_priorityIcon` 等标准字段
- **移动端适配**：当前未充分测试
- **甘特图和日历图**：暂未纳入本文档范围

---

### 8. 测试要点

- 卡片详细模式和简洁模式正确渲染
- Tooltip 在鼠标悬停时正确显示和隐藏，空字段不显示
- 点击卡片跳转到正确的文件位置
- 进度条各段比例正确
- 进度条 Tooltip 显示各状态详情，顺序正确
- 分组卡片排序正确，颜色正确
- 表格列显隐切换正确
- 看板三列分拣正确
- 矩阵四象限分拣正确
- 空数据时各组件的空状态显示
- 任务树三种节点类型正确显示
- 标题任务去除 number headings 序号
- 任务树折叠展开功能正常
- 任务树进度条统计正确（去重）
- 任务树排序和缩进正确
- 任务行动外的任务正确显示

---

### 附录：涉及文件

| 文件                                          | 职责                   |
| --------------------------------------------- | ---------------------- |
| `src/ui/components/cards/card.ts`             | 统一任务卡片           |
| `src/ui/components/cards/cards.ts`            | 卡片网格视图           |
| `src/ui/components/lists/list.ts`             | 任务列表               |
| `src/ui/components/lists/status-list.ts`      | 状态分组列表           |
| `src/ui/components/lists/priority-list.ts`    | 优先级分组列表         |
| `src/ui/components/lists/recurring-list.ts`   | 循环分组列表           |
| `src/ui/components/lists/time-list.ts`        | 时间分组列表           |
| `src/ui/components/lists/tag-list.ts`         | 标签分组列表           |
| `src/ui/components/lists/uniqueId-list.ts`    | 唯一ID分组列表         |
| `src/ui/components/lists/depends-list.ts`     | 依赖分组列表           |
| `src/ui/components/lists/overdue-list.ts`     | 逾期分组列表           |
| `src/ui/components/lists/timeline-list.ts`    | 时间轴分组列表         |
| `src/ui/components/lists/tree-list.ts`        | 任务树视图             |
| `src/ui/components/tables/table.ts`           | 任务表格               |
| `src/ui/components/boards/kanban.ts`          | 看板                   |
| `src/ui/components/boards/matrix.ts`          | 四象限矩阵             |
| `src/ui/components/bar/progress-bar.ts`       | 进度条                 |
| `src/ui/components/tooltip/tooltip.ts`        | Tooltip 管理器         |
| `src/ui/components/charts/statistics.ts`      | 基础统计图（暂不展开） |
| `src/ui/components/charts/detail.ts`          | 详细统计图（暂不展开） |
| `src/process/components/tree-task-process.ts` | 任务树数据处理         |
| `src/ui/views/base-view.ts`                   | 视图基类               |
| `src/configs/configs.ts`                      | 统一配置               |



## 业务视图模块详细设计

### 模块标识

| 属性       | 内容                      |
| ---------- | ------------------------- |
| 模块名称   | 业务视图 (Business Views) |
| 模块标识符 | `ui.views`                |
| 版本号     | 1.0.0                     |
| 开发者     | -                         |
| 最后更新   | 2026-06-05                |
| 所属CSCI   | Obsidian Task Manage 插件 |

---

### 功能描述

业务视图模块是插件的视图层核心，负责根据用户的预设方案加载对应的业务视图，协调数据获取、筛选、排序和渲染。每个业务视图继承统一的基类，组合通用视图组件实现特定的业务场景。

本章从整体定位出发，介绍业务视图的架构关系与核心能力，然后逐一说明基类和各业务视图的详细设计。

#### 整体定位与架构关系

业务视图位于 `src/ui/views/` 目录下，通过 `ViewContainer` 根据当前预设方案的 `businessView` 字段动态加载对应的视图类。

```
ViewContainer
    │
    ├── preset.businessView = "allTasks" → AllTasksView
    ├── preset.businessView = "inbox" → InboxView
    ├── preset.businessView = "important" → ImportantView
    ├── preset.businessView = "today" → TodayView
    ├── preset.businessView = "future" → FutureView
    └── preset.businessView = "organize" → OrganizeView
```

所有业务视图继承 `BaseTaskView` 基类，基类负责：

- 订阅 Store 状态变化
- 获取和筛选任务数据
- 根据 `viewStyle` 调用对应的通用视图组件
- 管理视图生命周期

#### 核心能力概述

| 视图          | 能力                                                       |
| ------------- | ---------------------------------------------------------- |
| BaseTaskView  | 抽象基类，提供数据获取、筛选、排序、视图切换、生命周期管理 |
| AllTasksView  | 展示所有任务的默认视图                                     |
| InboxView     | 展示未开始和计划中的任务                                   |
| ImportantView | 展示高优先级的重要任务                                     |
| TodayView     | 展示与今天相关的任务                                       |
| FutureView    | 展示未来15天内的任务                                       |
| OrganizeView  | 批量编辑任务标记                                           |

---

### 接口定义

#### BaseTaskView

| 方法签名                                                                | 说明                 |
| ----------------------------------------------------------------------- | -------------------- |
| `constructor(container: HTMLElement, store: Store, app: any): void`     | 构造函数，订阅 Store |
| `getDefaultFilter(): GlobalFilter`                                      | 获取默认筛选条件     |
| `render(): Promise<void>`                                               | 渲染视图             |
| `destroy(): void`                                                       | 销毁视图             |
| `applySort(tasks: any[], sort: { type: string; order: string }): any[]` | 应用排序             |
| `openTask(task: any): void`                                             | 打开任务对应文件     |

#### 筛选条件接口 (GlobalFilter)

| 字段             | 类型                                                             | 说明           |
| ---------------- | ---------------------------------------------------------------- | -------------- |
| `dateRange`      | `{ start: number \| null, end: number \| null, isAll: boolean }` | 日期范围       |
| `statuses`       | `string[]`                                                       | 执行状态列表   |
| `includeMarks`   | `string[]`                                                       | 包含的标记     |
| `excludeMarks`   | `string[]`                                                       | 排除的标记     |
| `hideRepeat`     | `boolean`                                                        | 隐藏循环任务   |
| `hideCompleted`  | `boolean`                                                        | 隐藏已完成任务 |
| `hideCancelled`  | `boolean`                                                        | 隐藏已取消任务 |
| `rootPath`       | `string \| null`                                                 | 根路径         |
| `hideFolders`    | `boolean`                                                        | 隐藏文件夹     |
| `searchText`     | `string`                                                         | 搜索文本       |
| `priorityValues` | `string[]`                                                       | 优先级筛选值   |
| `repeatCycles`   | `string[]`                                                       | 循环周期筛选值 |

#### 具体业务视图

| 视图类          | 父类           | 覆写方法                                       |
| --------------- | -------------- | ---------------------------------------------- |
| `AllTasksView`  | `BaseTaskView` | 无                                             |
| `InboxView`     | `BaseTaskView` | `getDefaultFilter()`, `renderEmpty()`          |
| `ImportantView` | `BaseTaskView` | `getDefaultFilter()`, `renderEmpty()`          |
| `TodayView`     | `BaseTaskView` | `getDefaultFilter()`, `renderEmpty()`          |
| `FutureView`    | `BaseTaskView` | `getDefaultFilter()`, `renderEmpty()`          |
| `OrganizeView`  | `BaseTaskView` | `getDefaultFilter()`, `render()`, 批量编辑方法 |

#### ViewContainer

| 方法签名                                                            | 说明                           |
| ------------------------------------------------------------------- | ------------------------------ |
| `constructor(container: HTMLElement, store: Store, app: any): void` | 构造函数                       |
| `refresh(): Promise<void>`                                          | 根据当前预设加载对应的业务视图 |

**视图加载映射**：

```
VIEW_LOADERS = {
    allTasks: () => import("./all-view"),
    inbox: () => import("./inbox-view"),
    important: () => import("./important-view"),
    today: () => import("./today-view"),
    future: () => import("./future-view"),
}
```

---

### 数据描述

#### 视图状态变量

| 变量              | 类型          | 说明                         |
| ----------------- | ------------- | ---------------------------- |
| `container`       | `HTMLElement` | 视图容器                     |
| `store`           | `Store`       | 全局状态管理器               |
| `app`             | `any`         | Obsidian 应用实例            |
| `unsub`           | `() => void`  | 取消 Store 订阅的函数        |
| `calendarSubView` | `string`      | 日历子视图类型，默认 "month" |

#### 筛选数据流

```
Store.getActivePreset()
    │
    ├── preset.filter → GlobalFilter
    │   ├── dateRange → 日期筛选
    │   ├── statuses → 状态筛选
    │   ├── includeMarks → 标记筛选
    │   ├── hideRepeat → 隐藏循环
    │   ├── hideCompleted → 隐藏已完成
    │   ├── hideCancelled → 隐藏已取消
    │   ├── searchText → 文本搜索
    │   ├── priorityValues → 优先级筛选
    │   └── repeatCycles → 循环筛选
    │
    ├── preset.viewStyle → 视图样式
    └── preset.sort → 排序方式
```

#### 视图样式映射

| viewStyle    | 渲染组件            | 说明       |
| ------------ | ------------------- | ---------- |
| `table`      | `renderTaskTable`   | 任务表格   |
| `list`       | `renderTaskList`    | 任务列表   |
| `cards`      | `renderCards`       | 卡片网格   |
| `status`     | `renderStatus`      | 状态分组   |
| `priority`   | `renderPriority`    | 优先级分组 |
| `kanban`     | `renderKanban`      | 看板       |
| `matrix`     | `renderMatrix`      | 矩阵       |
| `recurring`  | `renderRecurring`   | 循环分组   |
| `time`       | `renderTimeList`    | 时间分组   |
| `overdue`    | `renderOverdueList` | 逾期分组   |
| `timeline`   | `renderTimeline`    | 时间轴     |
| `tag`        | `renderTag`         | 标签分组   |
| `uniqueId`   | `renderUniqueId`    | 唯一ID分组 |
| `depends`    | `renderDepends`     | 依赖分组   |
| `tree`       | `renderTaskTree`    | 任务树     |
| `calendar`   | `renderCalendar*`   | 日历系列   |
| `statistics` | `renderStatistics`  | 基础统计图 |
| `detail`     | `renderDetail`      | 详细统计图 |

---

### 处理逻辑

#### BaseTaskView 渲染流程

```
输入：Store 状态变化触发
处理：
  1. 清空容器
  2. 获取当前预设方案
  3. 获取筛选条件（preset.filter 或 getDefaultFilter()）
  4. 获取视图样式（preset.viewStyle）和排序方式（preset.sort）
  5. 检查 Dataview API 可用性
  6. 调用 getAllTasks() 获取所有任务
  7. 调用 filterTasks() 应用筛选
  8. 调用 applySort() 应用排序
  9. 调用 loadTaskPages() 加载任务文件内容
  10. 若筛选后无任务，调用 renderEmpty()
  11. 创建 view-content 容器
  12. 调用 renderByStyle() 根据 viewStyle 渲染
输出：视图内容渲染完成
```

#### 视图切换流程

```
输入：侧边栏点击视图按钮 → store.update({ activePresetId })
处理：
  1. Store 通知所有订阅者
  2. ViewContainer.refresh() 执行
  3. 获取当前预设的 businessView
  4. 通过 VIEW_LOADERS 动态加载对应视图类
  5. 销毁当前视图实例
  6. 创建新视图实例
  7. 调用新视图的 render() 方法
输出：视图内容切换完成
```

#### 排序逻辑

```
输入：任务数组 tasks，排序配置 sort
处理：
  1. 复制数组避免修改原数据
  2. 根据 sort.type 确定排序字段
  3. 根据 sort.order 确定升序/降序（asc=1, desc=-1）
  4. 对空值特殊处理：空值排最后
  5. 字符串字段使用 localeCompare
  6. 数字字段使用减法比较
输出：排序后的任务数组
```

**排序字段映射**：

| sort.type     | 排序依据        | 类型         |
| ------------- | --------------- | ------------ |
| `status`      | `_status`       | 状态顺序映射 |
| `description` | `_cleanText`    | 字符串比较   |
| `priority`    | `_priorityIcon` | 优先级索引   |
| `created`     | `_created`      | 日期字符串   |
| `scheduled`   | `_scheduled`    | 日期字符串   |
| `starts`      | `_starts`       | 日期字符串   |
| `due`         | `_due`          | 日期字符串   |
| `cancel`      | `_cancel`       | 日期字符串   |
| `done`        | `_done`         | 日期字符串   |
| `tag`         | `_tag`          | 字符串比较   |
| `id`          | `_id`           | 字符串比较   |
| `forbid`      | `_forbid`       | 字符串比较   |
| `filename`    | `path`          | 文件名提取   |

#### 任务页面加载流程

```
输入：无
处理：
  1. 获取所有以 "任务.md" 结尾的文件
  2. 筛选路径以 "pages/A 系统/A 任务系统" 开头的文件
  3. 逐个读取文件内容（app.vault.cachedRead）
  4. 构建包含 file.path, file.name, file.content 的页面对象
  5. 单个文件读取失败不影响整体
输出：任务文件页面数组
```

---

### 各业务视图详细设计

#### BaseTaskView

##### 功能描述

`BaseTaskView` 是所有业务视图的抽象基类，提供统一的数据获取、筛选、排序、视图切换和生命周期管理。

##### 关键方法

**render()**

核心渲染方法，订阅 Store 状态变化后自动调用：

```typescript
async render() {
    this.container.empty();
    const state = this.store.getState();
    const preset = this.store.getActivePreset();
    const activeFilter = preset?.filter ?? this.getDefaultFilter();
    const currentStyle = preset?.viewStyle ?? "table";
    const intervalMode = preset?.intervalMode ?? "scheduled-due";

    // 获取 Dataview API
    const dv = this.app.plugins?.plugins?.dataview?.api;

    // 获取所有任务
    const allTasks = getAllTasks(false, dv, cacheState);

    // 筛选
    let filtered = filterTasks(allTasks, activeFilter, intervalMode);

    // 排序
    filtered = this.applySort(filtered, sort);

    // 加载任务文件
    const taskPages = await this.loadTaskPages();

    // 渲染
    if (filtered.length === 0) { this.renderEmpty(); return; }

    const viewContainer = this.container.createDiv({ cls: "view-content" });
    this.renderByStyle(viewContainer, filtered, currentStyle, ...);
}
```

**renderByStyle()**

根据 `viewStyle` 调用对应的通用视图组件：

| viewStyle    | 调用的渲染函数                                 |
| ------------ | ---------------------------------------------- |
| `table`      | `renderTaskTable(container, tasks, options)`   |
| `list`       | `renderTaskList(container, tasks, options)`    |
| `cards`      | `renderCards(container, tasks, options)`       |
| `status`     | `renderStatus(container, tasks, options)`      |
| `priority`   | `renderPriority(container, tasks, options)`    |
| `kanban`     | `renderKanban(container, tasks)`               |
| `matrix`     | `renderMatrix(container, tasks)`               |
| `recurring`  | `renderRecurring(container, tasks, options)`   |
| `time`       | `renderTimeList(container, tasks, options)`    |
| `overdue`    | `renderOverdueList(container, tasks, options)` |
| `timeline`   | `renderTimeline(container, tasks)`             |
| `tag`        | `renderTag(container, tasks, options)`         |
| `uniqueId`   | `renderUniqueId(container, tasks, options)`    |
| `depends`    | `renderDepends(container, tasks, options)`     |
| `tree`       | `renderTaskTree(container, tasks, options)`    |
| `calendar`   | `renderCalendar*(container, tasks, options)`   |
| `statistics` | `renderStatistics(container, tasks)`           |
| `detail`     | `renderDetail(container, tasks)`               |

**openTask()**

```typescript
protected openTask(task: any) {
    const file = this.app.vault.getAbstractFileByPath(task.path);
    if (file)
        this.app.workspace.getLeaf().openFile(file, { eState: { line: task.line } });
}
```

##### 默认筛选条件

```typescript
getDefaultFilter(): GlobalFilter {
    return {
        dateRange: { start: null, end: null, isAll: true },
        statuses: ["todo", "planned", "in-progress", "completed", "cancelled"],
        includeMarks: [],
        excludeMarks: [],
        hideRepeat: true,
        hideCompleted: true,
        hideCancelled: true,
        rootPath: null,
        hideFolders: true,
        priorityValues: ["⏬", "🔽", "🔼", "⏫", "🔺"],
        repeatCycles: ["every day", "every week", "every month", "every year"],
    };
}
```

##### 设计要点

- 使用 `try/catch` 包裹渲染逻辑，失败时显示错误信息
- Dataview API 不可用时显示 "请先安装并启用 Dataview 插件"
- 通过 Store 订阅自动响应状态变化
- 子类可覆写 `getDefaultFilter()` 和 `renderEmpty()` 实现定制

---

#### AllTasksView

##### 功能描述

展示所有任务的默认视图。使用基类的默认筛选条件。

##### 默认筛选

```typescript
getDefaultFilter(): GlobalFilter {
    return super.getDefaultFilter();
}
```

等同于基类默认值：全部状态、全部标记、隐藏循环/已完成/已取消。

##### 空状态

显示 "没有符合条件的任务"。

---

#### InboxView

##### 功能描述

展示待办任务（未开始和计划中），用于任务收集。

##### 默认筛选

```typescript
getDefaultFilter(): GlobalFilter {
    const filter = super.getDefaultFilter();
    filter.statuses = ["todo", "planned"];
    return filter;
}
```

| 筛选项        | 默认值        |
| ------------- | ------------- |
| statuses      | todo, planned |
| hideRepeat    | true          |
| hideCompleted | true          |
| hideCancelled | true          |

##### 空状态

显示 "📭 暂无待办任务"。

---

#### ImportantView

##### 功能描述

展示重要任务，筛选高优先级（🔺、⏫、🔼）的未完成状态任务。

##### 默认筛选

```typescript
getDefaultFilter(): GlobalFilter {
    const filter = super.getDefaultFilter();
    filter.statuses = ["todo", "planned", "in-progress"];
    filter.priorityValues = ["🔺", "⏫", "🔼"];
    return filter;
}
```

| 筛选项         | 默认值                     |
| -------------- | -------------------------- |
| statuses       | todo, planned, in-progress |
| priorityValues | 🔺, ⏫, 🔼                 |
| hideRepeat     | true                       |
| hideCompleted  | true                       |
| hideCancelled  | true                       |

##### 空状态

显示 "⭐ 暂无重要任务"。

---

#### TodayView

##### 功能描述

展示与今天相关的任务。

**日期匹配规则**：

- 创建日期、计划日期、开始日期、截止日期、完成日期、取消日期任一等于今天
- 或计划-截止、开始-完成、开始-取消时间段包含今天

##### 默认筛选

```typescript
getDefaultFilter(): GlobalFilter {
    const filter = super.getDefaultFilter();
    filter.statuses = ["todo", "planned", "in-progress"];
    const today = new Date();
    filter.dateRange = {
        start: new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime(),
        end: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999).getTime(),
        isAll: false,
    };
    return filter;
}
```

| 筛选项        | 默认值                        |
| ------------- | ----------------------------- |
| statuses      | todo, planned, in-progress    |
| dateRange     | 今天 00:00:00 ~ 今天 23:59:59 |
| hideRepeat    | true                          |
| hideCompleted | true                          |
| hideCancelled | true                          |

##### 空状态

显示 "📅 今天没有符合条件的任务"。

---

#### FutureView

##### 功能描述

展示未来15天内的未完成状态任务。

##### 默认筛选

```typescript
getDefaultFilter(): GlobalFilter {
    const filter = super.getDefaultFilter();
    filter.statuses = ["todo", "planned", "in-progress"];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const futureEnd = new Date(today);
    futureEnd.setDate(futureEnd.getDate() + 15);
    futureEnd.setHours(23, 59, 59, 999);
    filter.dateRange = {
        start: today.getTime(),
        end: futureEnd.getTime(),
        isAll: false,
    };
    return filter;
}
```

| 筛选项        | 默认值                     |
| ------------- | -------------------------- |
| statuses      | todo, planned, in-progress |
| dateRange     | 今天 ~ 今天+15天           |
| hideRepeat    | true                       |
| hideCompleted | true                       |
| hideCancelled | true                       |

##### 空状态

显示 "🔜 暂无未来任务"。

---

#### OrganizeView

##### 功能描述

批量编辑任务标记的视图。支持：

- 按任务完成状态和标记完整性筛选
- 批量添加/删除/修改标记
- 预览修改内容
- 确定修改并写入文件
- 快照撤回

##### 筛选模式

四种筛选模式（四选一）：

| 模式                | 条件                                                   |
| ------------------- | ------------------------------------------------------ |
| 未完成&缺失必需标记 | (todo 或 planned) 且缺失优先级/创建/计划/开始/截止任一 |
| 未完成&格式完整     | (todo 或 planned) 且不缺失必需标记                     |
| 已完成&缺失必需标记 | (in-progress/completed/cancelled) 且缺失必需标记       |
| 已完成&格式完整     | (in-progress/completed/cancelled) 且不缺失必需标记     |

##### 编辑操作

支持的标记编辑操作：

| 编辑目标 | 操作                         |
| -------- | ---------------------------- |
| 优先级   | 修改/删除                    |
| 循环周期 | 修改（预设+自定义）/删除     |
| 创建日期 | 设为今天/删除                |
| 计划日期 | 设为今天/删除                |
| 开始日期 | 设为今天/删除                |
| 截止日期 | 设为今天/删除                |
| 完成日期 | 设为今天/删除                |
| 取消日期 | 设为今天/删除                |
| 标签     | 修改（预设+自定义）/删除     |
| 唯一ID   | 生成/自定义/删除             |
| 引用ID   | 删除                         |
| 补全时间 | 自动补全（基于完成日期前推） |
| 排序标记 | 按指定顺序排序               |

##### 界面设计

| 区域     | 内容                         |
| -------- | ---------------------------- |
| 筛选按钮 | 四选一模式切换               |
| 编辑按钮 | 分组显示各类标记编辑按钮     |
| 任务列表 | 复选框 + 原文 + 预览         |
| 底部按钮 | 清空预览、确定修改、快照撤回 |

---

### 空状态显示

| 视图     | 空状态文本                  |
| -------- | --------------------------- |
| 所有任务 | "没有符合条件的任务"        |
| 待办任务 | "📭 暂无待办任务"           |
| 重要任务 | "⭐ 暂无重要任务"           |
| 今天任务 | "📅 今天没有符合条件的任务" |
| 未来任务 | "🔜 暂无未来任务"           |

---

### 约束与假设

- **运行环境**：Obsidian 0.15.0+，需启用 Dataview 和 Obsidian Tasks 插件
- **Store 依赖**：假定 Store 已在插件加载时完成初始化并传入
- **数据依赖**：任务数据通过 `getAllTasks()` 获取，依赖 Tasks 插件和 Dataview API
- **文件路径**：任务文件默认路径为 `pages/A 系统/A 任务系统/`
- **移动端适配**：当前未充分测试

---

### 测试要点

- Store 状态变化时视图自动刷新
- 预设切换时视图正确切换
- 筛选条件变化时视图内容正确过滤
- 排序切换后任务列表正确排序
- 各种 viewStyle 正确渲染对应组件
- 空数据时显示正确的空状态文本
- 点击任务跳转到正确的文件位置
- Dataview 不可用时显示提示信息
- 任务文件加载失败不影响其他文件
- 各业务视图的默认筛选条件正确
- 插件重载后视图状态正确恢复

---

### 附录：涉及文件

| 文件                             | 职责                          |
| -------------------------------- | ----------------------------- |
| `src/ui/views/base-view.ts`      | 业务视图抽象基类              |
| `src/ui/views/all-view.ts`       | 所有任务视图                  |
| `src/ui/views/inbox-view.ts`     | 待办任务视图                  |
| `src/ui/views/important-view.ts` | 重要任务视图                  |
| `src/ui/views/today-view.ts`     | 今天任务视图                  |
| `src/ui/views/future-view.ts`    | 未来任务视图                  |
| `src/ui/views/organize-view.ts`  | 整理处视图（批量编辑）        |
| `src/ui/ui.ts`                   | ViewContainer：视图动态加载   |
| `src/store/store.ts`             | Store：状态管理、预设切换     |
| `src/types.ts`                   | GlobalFilter、Preset 类型定义 |
| `src/process/bars/set-bar.ts`    | filterTasks 筛选函数          |
| `src/process/tasks/read-task.ts` | getAllTasks 任务读取          |



## 持久化模块详细设计

将用户配置存储在本地文件中，再次打开时还原配置

## 插件设置面板模块详细设计

变量可以提供给用户，进行插件配置

插件在 Obsidian 设置中提供专属设置面板，当前可配置项包括：

- 任务文件夹路径（可多行）
- 根路径
- 每日工时（用于时长计算）

未来可增加更多自定义选项，如默认日期范围、颜色主题等。

#### 新架构中的持久化与配置

- 所有视图方案（`presets`）和全局状态（`sidebarCollapsed`、`sidebarWidth` 等）通过 `Store` 的 `saveFn` 自动序列化到 Obsidian 插件数据中，重启后恢复。
- 插件设置面板（`settings.ts`）提供任务文件夹路径、根路径、每日工时等全局配置。
- 单个视图方案的配置导入/导出通过“视图配置”栏实现，可保存为 JSON 文件，便于备份和分享。

## 插件命令面板模块详细设计



## {模块名称}

### {模块的自然语言描述}

### 算法描述

```yaml
算法:
    名称: { 算法名称 }
    复杂度: { 时间或空间复杂度 }
    伪代码: |
        {算法的伪代码或步骤化自然语言描述}
```

### 事件流

```yaml
事件流:
    步骤:
        - 触发: { 触发事件 }
          动作: { 系统执行的动作 }
          下一步: { 动作完成后的流转 }
        - 触发: { 触发事件 }
          动作: { 系统执行的动作 }
          下一步: { 动作完成后的流转 }
    伪代码: |
        {事件处理的可执行伪代码}
```

### 关键条件

```yaml
关键条件:
    描述: { 核心业务逻辑或判断规则 }
    相关函数:
        - { 受此条件影响的函数名 }
    伪代码: |
        {条件逻辑的可执行伪代码}
    边界条件:
        - { 边界情况说明 }
```

# 需求的可追踪性

# 注解

# 附录
