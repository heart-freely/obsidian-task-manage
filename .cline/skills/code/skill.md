---
name: 任务管理插件开发架构
description: 插件整体架构、数据流、开发规范、命名规则等全局信息。所有视图 Skill 的顶层参考。
triggers:
  - 了解架构
  - 修改核心数据流
  - 添加新模块
> ⚠️ 关键文件：对本文件的任何修改（包括同步工具自动更新）均视为关键操作。  
> 执行前会展示变更详情，需人工确认后才会写入。
---

# 项目总览
本插件为 Obsidian 提供统一的任务管理面板，基于 **Tasks 插件 API** 与 **Dataview** 双数据源，采用 ItemView 架构，内置 20+ 个专业视图，并复用全局筛选、排序、左侧任务树导航。

## 技术栈与依赖
- **运行环境**：Obsidian 插件（`ItemView`）
- **数据源**：优先使用 Tasks 插件 API（`fetchTasks`）；复杂自定义标记（🆔、⛔、🏁）通过 Dataview 解析
- **UI 渲染**：原生 DOM API + Canvas（甘特图） + ECharts（日历/统计图）
- **状态管理**：`panel.js` 全局 state + Obsidian `loadData/saveData` + `localStorage`（用于编辑快照）
- **构建工具**：esbuild；Docker 容器编译

## 架构分层与关键文件职责

```
src/
├── main.js # 插件入口：注册所有视图，加载数据
├── configs/plugin-configs.js # 集中配置常量（路径、颜色、分页大小等）
├── panel/
│ ├── panel.js # 导航中心：维护全局 state，管理视图切换
│ ├── bars/ # 各类按钮栏组件（日期筛选/标记筛选/排序/侧边导航）
│ ├── components/ # 可复用组件（树视图、任务卡片）
│ ├── interacts/ # 交互逻辑（图表 tooltip 等）
│ └── views/ # 所有子视图（继承 BaseTaskView）
├── tasks/
│ ├── read/read-tasks.js # 统一任务读取：调用 Tasks API + 正则解析自定义标记
│ ├── process/ # 业务处理：筛选、分组、统计、整理补全
│ └── write/write-tasks.js # 任务修改：文件写入、快照生成与恢复
├── storage/persist-storage.js # 持久化工具（Plugin data / localStorage）
└── utils/logger.js # 日志工具
```



## 项目架构与关键目录
```
root/
├── main.js                         # 构建产物
├── manifest.json                   # 插件清单
├── styles.css                      # 全局样式
├── esbuild.config.mjs              # esbuild 打包配置
├── jest.config.cjs                 # Jest 配置
├── babel.config.js                 # Babel 配置
├── src/
│   ├── main.js                     # 插件入口：注册所有视图、命令，启动数据加载
│   ├── configs/
│   │   └── plugin-configs.js       # 全局常量：文件夹路径、状态图标映射、优先级映射、颜色、分页大小等
│   ├── panel/
│   │   ├── panel.js                # 导航中心 ItemView：头部固定栏、左侧任务树、全局 state 维护、视图切换逻辑
│   │   ├── bars/                   # UI 按钮栏组件
│   │   │   ├── control-botton-bar.js  # 控制栏（刷新、间隔模式、循环/完成/取消任务显隐开关）
│   │   │   ├── date-botton-bar.js     # 日期级联选择器（年/季/月/周/日）
│   │   │   ├── hide-botton-bar.js     # 筛选面板与任务树的显示/隐藏
│   │   │   ├── mark-botton-bar.js     # 执行状态筛选、标记包含/排除面板
│   │   │   ├── quick-botton-bar.js    # 快捷日期范围按钮 + 执行查询按钮
│   │   │   ├── side-botton-bar.js     # 左侧视图切换图标按钮（分组显示）
│   │   │   └── sort-botton-bar.js     # 排序栏（全局排序键 ALL_SORT_KEYS）
│   │   ├── components/
│   │   │   └── tree-view-components.js # 可复用的任务树组件（buildTree、flat、sort）
│   │   ├── interacts/
│   │   │   ├── chart-interact.js      # 图表缩放/拖拽交互
│   │   │   └── tooltip-interact.js    # 通用 Tooltip 管理器
│   │   └── views/                     # 所有子视图（均继承 BaseTaskView）
│   │       ├── base-task-view.js      # 视图基类 + createTaskCard + normalizeTaskCardData
│   │       ├── base-list-view.js      # 通用列表工厂函数
│   │       ├── inbox-task-view.js     # 收集箱
│   │       ├── kanban-task-view.js    # 看板
│   │       ├── matrix-task-view.js    # 四象限矩阵
│   │       ├── calendar-task-view.js  # 日历
│   │       ├── gantt-task-view.js     # 甘特图
│   │       ├── data-tasks-view.js     # 统计分析
│   │       ├── organize-task-view.js  # 整理箱（复杂编辑视图）
│   │       ├── tree-task-view.js      # 任务树
│   │       ├── important-task-view.js # 重要任务
│   │       ├── recurring-task-view.js # 循环任务
│   │       ├── today-task-view.js     # 今天任务
│   │       ├── overdue-task-view.js   # 逾期任务
│   │       ├── future-task-n-view.js  # 未来 15 天任务
│   │       ├── future-task-all-view.js# 全部未来任务
│   │       ├── timeline-task-view.js  # 时间线
│   │       ├── table-task-view.js     # 所有任务表
│   │       ├── tag-task-view.js       # 标签聚合
│   │       ├── depends-task-view.js   # 依赖任务
│   │       ├── pomodoro-task-view.js  # 番茄钟
│   │       └── ...                    # 其他辅助视图
│   ├── tasks/
│   │   ├── read/
│   │   │   └── read-tasks.js          # 统一任务读取：调用 Tasks API + 正则提取自定义标记（RX 对象）
│   │   ├── process/                   # 业务处理模块
│   │   │   ├── common-process.js      # 日期工具集（DateUtils）
│   │   │   ├── filter-task-process.js # 通用任务筛选（日期/状态/标记）
│   │   │   ├── calcul-chart-process.js# 图表统计计算
│   │   │   ├── task-query-process.js  # Tasks API 查询封装
│   │   │   ├── organize-task-process.js # 整理箱编辑操作与快照管理
│   │   │   ├── inbox-task-process.js
│   │   │   ├── kanban-task-process.js
│   │   │   ├── matrix-task-process.js
│   │   │   ├── recurring-task-process.js
│   │   │   └── tree-task-process.js
│   │   └── write/
│   │       └── write-tasks.js         # 任务写入：文件修改、快照生成与恢复
│   ├── storage/
│   │   └── persist-storage.js         # 导航中心状态持久化（createInitialState / PersistenceManager）
│   ├── echarts/
│   │   └── echarts.js                 # ECharts 本地封装
│   └── utils/
│       └── logger.js                  # 日志工具（生产环境静默）
└── skills/                            # AI 开发引用文件（本项目知识库）
```
# 数据流全景

```
用户交互（筛选/排序）
→ panel.js 更新全局 state（日期、标记筛选、隐藏选项等）
→ readTasks.getAllTasks(force, dv, state) 被调用
├── 优先使用 Tasks API 获取任务列表
└── 必要时用 Dataview 遍历文件，解析自定义标记（🆔, ⛔, 🏁 等）
→ state.filterCache.tasks 存储全量结果
→ 左侧导航树、统计面板更新
→ 当前激活视图通过 globalState 获取任务列表
├── 若跟随全局筛选：直接使用 filterCache.tasks，内部再按视图模式过滤
└── 若独立筛选：自行调用 getAllTasks 并构建独立筛选条件
→ 视图根据排序状态渲染 UI
```



# 核心数据流伪代码（全局）
1. state ← createInitialState()
2. panel.js 监听用户筛选/排序事件 → 更新 state
3. tasks ← readTasks.getAllTasks(forceRefresh, dv, state)
4. state.filterCache.tasks ← tasks
5. filterTasks(tasks, state) → 更新左侧树、统计
6. currentView.render(tasks, state)



# 视图开发规范

## 基类契约

所有视图必须继承 BaseTaskView 并实现：


```javascript
export const VIEW_TYPE_XXX = 'xxx-view';
export class XxxView extends BaseTaskView {
  getViewType() { return VIEW_TYPE_XXX; }
  getDisplayText() { return '视图显示名称'; }
  getIcon() { return 'icon-name'; }

  async _startCore(dv, app, storageAdapter) {
    // 构建 UI，必须返回 { cleanup, updateSort }
    return {
      cleanup: () => { /* 释放资源 */ },
      updateSort: (key, asc) => { /* 响应全局排序 */ }
    };
  }
}
```

## ## 注册与激活流程

    在 main.js 中注册视图：registerView(VIEW_TYPE_XXX, (leaf) => new XxxView(leaf));
    在 panel.js 的 activateSubView 中添加分支，动态 import 视图，并传入 { dv, app, viewPanel, state }
    在 side-botton-bar.js 中添加对应的侧边栏按钮



# 错误处理与边界情况约定
## 全局原则

    所有 API 调用（如 fetchTasks）必须包裹 try‑catch，失败时显示 Obsidian notice 并返回空数组或缓存。
    文件读写操作失败时，必须保留原始内容，不执行任何部分写入。
    数据为空时，视图应显示友好空状态文案（如“暂无符合条件的任务”），而非空白或报错。
    日期解析失败时，将该日期字段置为 null，不中断整体流程。

## 视图级常见边界

    日历/甘特图：若无日期任务，提示“所有任务均无日期信息”。
    整理箱：若无完成日期，自动补全日期逻辑跳过。
    统计：统计计算中分母为 0 时，显示“无数据”或“0%”。
    树视图：若父任务 YAML 与 Wiki 链接均缺失，标记该任务为根节点并提示“缺失父任务信息”。

# 样式与主题适配细节
## CSS 变量

所有颜色必须使用 Obsidian CSS 变量，禁止硬编码。常用变量：

```css
--background-primary / --background-secondary
--text-normal / --text-muted
--interactive-accent
--color-red, --color-green, --color-orange, --color-blue
--font-text-size, --font-ui-size
```

## 深色模式适配

    所有视图自动通过 CSS 变量适配，无需额外 @media prefers-color-scheme。
    Canvas 视图中，填充颜色须通过 getComputedStyle(document.body) 动态获取后传入。

## 响应式布局

    网格列（.view-grid）最小列宽 320px，自动换行。
    甘特图/日历画布宽度随容器变化，监听 ResizeObserver 触发重绘。

## 任务卡片颜色条（左侧 3px）

    未开始 #2e333b → 计划中 #4b525b → 进行中 #7fb8f0 → 已完成 #47852f → 已取消 #c3393e

# 测试要点
## 单元测试覆盖

    filter-task-process.js：各筛选组合的正确性（状态、日期范围、标记包含/排除）
    
    read-tasks.js：自定义标记正则提取准确性
    
    日期工具函数：边界日期处理、周范围计算

## 视图级关键测试场景
视图	测试场景
收集箱	验证：仅显示 TODO 状态、非循环、优先级降序
逾期任务	验证：due < today、未完成、非循环
日历	验证：任务在正确的日期格子中，线条连接首尾
甘特图	验证：依赖箭头从完成时间指向开始时间，虚拟滚动不出界
整理箱	验证：编辑预览累积、快照撤回恢复原文、分页正确
统计	验证：下钻统计数据准确，饼图与柱状图数据一致
任务树	验证：YAML/Wiki 双源父任务解析结果，缺失提示



# 命名规则与注释规范

## 命名规则
| 元素           | 规则                                   | 示例                                          |
| -------------- | -------------------------------------- | --------------------------------------------- |
| 文件名         | kebab-case，模块前缀一致               | `base-task-view.js`, `filter-task-process.js` |
| 视图类型常量   | UPPER_SNAKE_CASE，以 `VIEW_TYPE_` 开头 | `VIEW_TYPE_CALENDAR`                          |
| 类名           | PascalCase                             | `BaseTaskView`, `CalendarTaskView`            |
| 函数/方法/变量 | camelCase                              | `getAllTasks`, `taskList`                     |
| CSS 类名       | kebab-case，视图专属用前缀             | `.task-list`, `.cal-header`                   |

##  源文件头部注释（必须）
```javascript
/**
 * 文件：src/panel/views/xxx-view.js
 * 描述：一句话说明文件作用
 * 所属模块：panel/views
 * 依赖：
 *   - BaseTaskView: 视图基类
 *   - ECharts: 图表库
 * 对外导出：VIEW_TYPE_XXX, XxxView
 * 注意事项：如有性能敏感或特殊逻辑需注明
 */
```

# 全局样式约定
- **卡片列表**：`ul.task-list > li.task-item`（背景圆角、左侧彩色条、flex 列布局）
- **网格布局**：`.view-grid.cols-2` / `.cols-3`，列容器 `.view-col`
- **按钮**：`quick-btn`、`sort-btn`、`cascade-btn`，激活态添加 `-active` 后缀
- **日历专属**：`cal-` 前缀
- **整理箱专属**：`.organize-` 前缀（列表复用 `.task-list`）
- **任务卡片内容**：第一行状态图标 + 描述；第二行元信息（优先级、循环、日期、标签、ID、文件）

# 性能与编码约束
- **分页**：任务数 > 100 时分页，`PAGE_SIZE = 50`
- **虚拟滚动**：甘特图强制 Canvas + 虚拟滚动；大列表/日历应避免全量 DOM 渲染
- **DOM 操作**：禁止 `innerHTML`，统一使用 `createElement` 或 `dv.el()`
- **全局污染**：除必要的模块级变量（如 `ganttState`）外，不向 `window` 添加自定义属性
- **ESLint**：代码必须通过 `eslint-plugin-obsidianmd` 检查

# 任务标记格式参考
标准任务行示例：
```
- [ ] 任务描述 🔼 🔁 every week ➕ 2025-09-06 ⏳ 2025-09-06 🛫 2025-09-06 📅 2026-04-06 ✅ 2023-04-17 ❌ 2023-04-18 🆔 dcf64c ⛔ dcf64c,h17ye 🏁 keep
```
所有自定义标记的正则解析位于 `read-tasks.js`。  
**完整的状态映射、优先级自定义、标记顺序设计请参见 `skills/tasks-插件设计参考.md`。**

# archive/ 与 trash/ 目录

.cline/skills/
├── archive/ # 存放已归档的 Skill（源码已删除但临时保留 design）
├── trash/ # 存放标记为删除的 Skill（确认后可物理删除）

**规则**：

- `references/` 中的文件**只读不写**，仅作为参考，不参与同步更新。
- 全量同步时，若 Skill 对应的源码已删除：
  1. 询问用户：移至 `trash/` 或 `archive/`。
  2. 若选择 `trash`，文件放入 `trash/`，之后可手动清理。
  3. 若选择 `archive`，文件放入 `archive/`，保留以备将来恢复。

**当前状态**：两个目录已创建，均为空，等待下次同步时使用。

**此主 Skill 包含插件的整体架构、基础规范和通用流程，开发具体功能时请结合 `skills/` 目录下对应的视图 Skill 和设计参考文件。**

# 快速开发指引

| 任务目标             | 操作指引                                                     |
| -------------------- | ------------------------------------------------------------ |
| 新增简单列表视图     | 复制 `inbox-task-view.js`，修改 `_startCore` 中的数据获取函数和视图名称，并在 `main.js`、`panel.js`、`side-botton-bar.js` 注册 |
| 增加新的筛选维度     | 修改 `state` 结构 → 更新 `filterTasks()` → 添加对应按钮栏组件 |
| 扩展任务卡片显示字段 | 修改 `createTaskCard()` 和 `normalizeTaskCardData()`，同步调整 `styles.css` |
| 开发复杂编辑逻辑     | 参照 `organize-task-view` 专属 Skill，遵循预览累积、快照与撤回机制 |
| 接入全局排序         | 在视图的 `updateSort` 中实现排序，并在 `sort-botton-bar.js` 的 `ALL_SORT_KEYS` 中注册 |
| 创建图形化视图       | 参照 `gantt-task-view` 或 `calendar-task-view` 的 Canvas/ECharts 初始化模式 |
| 修改标记解析规则     | 编辑 `read-tasks.js` 中的 `RX` 对象                          |
| 调整全局常量和配置   | 修改 `configs/plugin-configs.js`                             |

---




# 自动更新区（由全量同步自动维护）

> 以下章节由 `update-skill` 的全量同步根据源码自动更新，请勿手动修改。

## 全局状态（`state`）

由 `createInitialState()` 在 `persist-storage.js` 中创建，使用 `Plugin.loadData/saveData` 持久化，主要字段：



```javascript
state = {
  dateFilterState: { start, end, isAll },
  markFilterState: { statuses: [], includeMarks: [], excludeMarks: [] },
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



## Task 对象结构定义

| 字段             | 类型     | 说明                                                       |
| ---------------- | -------- | ---------------------------------------------------------- |
| `id`             | string   | 任务唯一标识（来自 🆔 标记）                                |
| `description`    | string   | 纯文本任务描述                                             |
| `status`         | object   | `{ type: 'TODO'|'DONE'|..., symbol: ' '|'?'|'/'|'x'|'-' }` |
| `priority`       | number   | 优先级数值（1-5 或 null）                                  |
| `priorityEmoji`  | string   | 优先级 emoji                                               |
| `isRecurring`    | boolean  | 是否循环任务                                               |
| `recurrenceRule` | string   | 循环规则文本                                               |
| `created`        | Date?    | 创建日期                                                   |
| `scheduled`      | Date?    | 计划日期                                                   |
| `start`          | Date?    | 开始日期                                                   |
| `due`            | Date?    | 截止日期                                                   |
| `done`           | Date?    | 完成日期                                                   |
| `cancelled`      | Date?    | 取消日期                                                   |
| `dependsOn`      | string[] | 依赖的其他任务 ID 数组                                     |
| `flag`           | string?  | 标签                                                       |
| `filePath`       | string   | 文件路径                                                   |
| `line`           | number   | 任务所在行号                                               |
| `rawText`        | string   | 原始任务行文本                                             |

## 公共函数签名与返回值



```javascript
// read-tasks.js
async function getAllTasks(force, dv, state): Promise<Task[]>

// filter-task-process.js
function filterTasks(tasks, state): Task[]

// write-tasks.js
async function bulkPatch(changes): Promise<void>
function createSnapshot(originals): Snapshot

// common-process.js (DateUtils)
function formatDate(date): string
function getWeekRange(date): { start: Date, end: Date }
```



## 常用 API 与代码片段



```javascript
import { getAllTasks } from '../../tasks/read/read-tasks';
const tasks = await getAllTasks(false, dv, state);

import { filterTasks } from '../../tasks/process/filter-task-process';
const filtered = filterTasks(tasks, state);

import { createTaskCard, normalizeTaskCardData } from '../components/task-card';
const card = createTaskCard(normalizeTaskCardData(task), app);

import { writeTasks, createSnapshot } from '../../tasks/write/write-tasks';
const snapshot = createSnapshot(modifiedTasks);
await writeTasks(modifiedTasks, snapshot);

import { formatDate, getWeekRange } from '../../utils/date-utils';
```

