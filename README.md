## 概述

这是一个功能丰富的 Obsidian 任务管理插件，使用 Dataview 和 Tasks 插件 API 作为数据源，采用 ItemView 架构实现多个视图（矩阵、看板、日历、甘特图、时间线、任务表、整理箱等），并统一复用全局筛选条件、排序、左侧树导航。

---

## 开发流程

### 环境准备

通过 Docker 将项目目录映射进 Node 容器，以便在隔离环境中编译和测试：

```powershell
docker run -it --rm -v ${PWD}:/app -w /app node:20-bullseye bash
```

### 编译

- **手动编译**：`npm run build`
- **监听模式**（自动编译）：`npm run dev`（保持窗口不关闭，Docker 会实时监听文件变化并自动编译）
- **退出容器**：
    ```powershell
    exit
    ```

### 测试

- **单元测试**：`npm test`
- **代码质量检查**：`npm run lint`（使用预配置的 ESLint，包含针对 Obsidian 的 [eslint-plugin-obsidianmd](https://github.com/obsidianmd/eslint-plugin)）
    - GitHub Action 已配置，每次提交会自动进行代码检查。
- **重载插件**：在 Obsidian 中按 `Ctrl/Cmd + P`，输入“重载插件”，使修改生效。

---

## 项目结构

```text
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

---

## 核心设计原则（与原设计文档完全对齐）

1. **数据源分层**
    - 优先使用 Tasks 插件 API（如 `fetchTasks`）获取任务列表，保证状态自动更新。
    - 对于 Tasks API 无法提供的自定义标记（如 `🆔`、`⛔`、`🏁` 等），通过 Dataview 的 `dv.pages` 和文件内容解析获取。

2. **视图基类与统一接口**
    - 所有视图必须继承 `BaseTaskView`，实现 `_startCore(dv, app, storageAdapter)` 方法，并返回 `{ cleanup, updateSort }` 对象。
    - 基类负责创建 Dataview 代理、监听 `onOpen` / `onClose` 等生命周期。

3. **统一任务卡片组件**
    - `createTaskCard` 生成标准化 DOM：`<li class="task-item">` 包含任务描述和元数据行（状态图标、优先级、循环、日期、标签、ID、文件来源）。
    - 通过 `normalizeTaskCardData` 将 Tasks API 或 Dataview 结果转为统一格式，确保所有视图共享该卡片。

4. **全局筛选状态同步**
    - `panel.js` 维护全局 `state` 对象，包含日期范围、标记包含/排除、隐藏循环/已完成/取消等筛选条件。
    - 所有视图通过 `globalState` 获取当前筛选条件，筛选变更时统一调用 `refreshCurrentView` 刷新当前视图。

5. **样式复用约定**
    - 全局 CSS 中预定义 `.view-grid`（两列/三列）、`.view-col`、`.task-list`、`.task-item`、`.col-header` 等类，避免重复定义。
    - 按钮样式统一使用 `quick-btn`、`sort-btn`、`cascade-btn` 等类名，激活状态加 `-active` 后缀。

6. **状态持久化**
    - 全局筛选状态使用 Obsidian 的 `Plugin.loadData` / `saveData` 存储，确保重启后恢复。
    - 整理箱视图的编辑预览、历史快照等复杂状态采用 `localStorage` 或独立文件存储，防止视图刷新丢失。

7. **代码质量保障**
    - 强制使用 ESLint + `eslint-plugin-obsidianmd` 进行检查。
    - GitHub Action 自动运行测试和 lint，保证代码风格一致。

8. **性能与体验**
    - 任务列表超过 100 条时分页（`PAGE_SIZE=50`）；甘特图使用 Canvas 虚拟滚动。
    - 复杂视图（如日历、甘特图）在数据处理阶段预计算时间戳和排序索引，避免渲染时重复计算。
    - DOM 增量更新：骨架构建一次，后续仅替换内容部分。

9. **编辑与预览逻辑（整理箱专用）**
    - 多级筛选按钮联动：一级确定后动态显示二级/三级选项。
    - 编辑按钮分组，支持多选并行修改，预览内容累积（下一个编辑操作基于上一个预览结果，而非原始文本）。
    - 单行“确定”仅切换界面状态（显示“已修改”），批量“保存所有修改”才写入文件；提供历史快照和撤回功能。

10. **任务标记规范**

- 任务格式严格遵循：`- [状态] 描述 🔼 🔁 every week ➕ 日期 ⏳ 日期 🛫 日期 📅 日期 ✅ 日期 ❌ 日期 🆔 id ⛔ id1,id2 🏁 flag`。
- 自定义标记在 `read-tasks.js` 中通过正则解析，确保与 Tasks 插件兼容。

---

## 视图开发模式

### 1. 简单列表/网格视图

适用于收集箱、看板、矩阵、今日任务、循环任务等。

**开发步骤：**

1. 创建 `src/panel/views/xxx-view.js`，继承 `BaseTaskView`。
2. 实现 `_startCore()`，内部调用相应的 process 函数获取任务数据，并利用 `createTaskCard` 渲染列表或网格。
3. 如需独立筛选，可在视图内自行调用 `readTasks.getAllTasks` 并构建筛选 UI。
4. 如需跟随全局筛选，则在 `refreshCurrentView` 中调用该视图的 `updateSort` 方法。
5. 在 `main.js` 中注册视图，并在 `panel.js` 的 `activateSubView` 中添加分支。

**示例：**

```js
import { BaseTaskView } from "./base-task-view";
import { startListBaseView } from "./base-list-view";
import { fetchMyTasks } from "../../tasks/process/task-query-process";

export const VIEW_TYPE_MY = "my-list-view";
export class MyListView extends BaseTaskView {
	getViewType() {
		return VIEW_TYPE_MY;
	}
	getDisplayText() {
		return "我的列表";
	}
	getIcon() {
		return "list";
	}
	async _startCore(dv, app, storageAdapter) {
		return await startListBaseView(
			app,
			dv.container,
			fetchMyTasks,
			"我的列表",
			"rgba(100,149,237,0.8)",
		);
	}
}
```

### 2. 复杂编辑视图（整理箱）

侧重于任务标记的补全、修改、批量编辑与预览。

**关键实现要点：**

- 多级筛选按钮组：一级控制二/三级可见性，二/三级支持多选（状态）和互斥（标记包含/排除）。
- 编辑按钮分组：按照标记类型排列，每个分组内提供修改（含下拉选项或日期选择）和删除功能。
- 预览管理：勾选任务后显示预览行 `📝 预览:`，所有编辑操作基于上一次预览结果累积；点击“确认”后状态变为 `📝 已修改:`，不直接写文件。
- 保存与撤回：提供“保存所有修改”批量写入，并生成历史快照；单行或批量撤回可恢复至原始或快照状态。
- 自动功能：补全时间（基于完成日期逆推，可指定天数）和自动排序（按标准标记顺序重排所有标记）。

### 3. 图形化视图

包括日历、甘特图和统计分析图表。

- **日历视图**：使用 ECharts 或 Canvas 实现多级时间视图（日/周/月/季/年），根据数据动态生成时间范围，支持交集判断和首尾显示。
- **甘特图**：纯 Canvas 绘制，左侧树与右侧时间轴对齐，实现虚拟滚动、依赖箭头、缩放与平移。
- **统计视图**：左侧任务树 + 右侧多图表联动，支持点击下钻统计，图表类型可切换（饼图/堆叠柱状图）。

---

## 样式约定（补充细节）

- 任务卡片强制使用 `ul.task-list > li.task-item` 结构。
- 日历视图注入样式以 `cal-` 为前缀，避免污染全局。
- 整理箱编辑区域使用 `.organize-` 前缀，但任务列表复用 `.task-list`。
- 所有按钮尺寸和间距通过全局 CSS 变量控制，确保主题适配。

---

## 常用操作指南

- **添加新视图**：创建 view 文件 → 注册到 `main.js` → 在 `panel.js` 添加切换分支 → 添加侧边按钮。
- **扩展筛选条件**：在 `state` 中增加字段 → 修改 `filter-task-process.js` → 更新对应 UI 按钮。
- **调整任务卡片**：修改 `createTaskCard` 和 `styles.css` 中的 `.task-item` 规则。
- **修改排序**：在 `sort-botton-bar.js` 的 `ALL_SORT_KEYS` 中添加新维度。

---

## 设计约束

- 禁止污染 `window` 全局对象，模块级状态使用 `const/let` 闭包。
- 避免使用 `innerHTML`，优先使用 `createElement` 或 `dv.el`。
- 大任务量视图必须实现分页或虚拟滚动。
- 代码必须通过 `npm run lint` 检查，与 `eslint-plugin-obsidianmd` 兼容。

---
