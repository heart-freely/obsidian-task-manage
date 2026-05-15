---
name: 代码注释规范
description: 提供源码注释的完整标准，使 AI 和同步工具（如 update-skill）能精准提取设计意图、函数签名、DOM结构、状态模型等。用户说“添加注释”或“注释规范”时可查阅。
triggers:
  - 添加注释
  - 代码注释规范
  - 注释要求
  - 如何写注释
---

# 代码注释规范（面向 AI 与 MCP 服务）

本规范为项目中的所有 JavaScript 源码文件定义了统一的注释格式，旨在让 AI 编程助手和自动化同步工具能够**精确理解代码的设计意图、提取实现细节**，从而在生成代码或更新 Skill 文档时保持高度一致。
“采用增量注释：新增或修改代码时，相应添加/更新注释，切勿格式化全文。这既节约 Token，也保持 Git 历史清晰。”
---

## 一、文件头部注释（必须）

每个源文件开头必须包含以下结构化注释：

```javascript
/**
 * 文件：src/panel/views/inbox-task-view.js
 * 描述：任务收集箱视图，展示未开始和计划中的非循环任务，支持状态分组和优先级排序
 * 所属模块：panel/views
 * 依赖：
 *   - BaseTaskView: 视图基类
 *   - readTasks.getAllTasks: 统一任务读取接口
 *   - createTaskCard: 标准任务卡片生成器
 *   - DateUtils: 日期工具（如需）
 * 对外导出：VIEW_TYPE_INBOX, InboxTaskView
 * 注意事项：该视图无内部状态，纯展示
 * @see .cline/skills/code/views/inbox-task-view.md
 */
```

**字段说明**：
- `文件`：相对于项目根目录的路径。
- `描述`：一句话概括文件核心功能。
- `所属模块`：在架构中的逻辑分组（对应 `src` 下的目录）。
- `依赖`：列出直接引用的外部模块/文件，并简要说明用途。
- `对外导出`：该文件 `export` 的主要符号（常量、类、函数）。
- `注意事项`：性能敏感点、特殊逻辑、已知限制等。
- `@see`：**必须准确指向对应的 Skill 文档路径**。若缺失或错误，同步工具可能无法映射正确的 Skill 文件，导致更新出错。强烈建议在创建视图时立即添加此标记。

---

## 二、同步提取专用注释（`@skill-*` 标签）

以下注释标签供 `update-skill` 等同步工具解析，应放置在关键代码块前。

### 2.1 函数签名 `@skill-sig`
用于标注模块内重要函数的签名和用途：
```javascript
/* @skill-sig function fetchInboxTasks(dv, state) : Array<Task> - 获取过滤后的收件箱任务 */
/* @skill-sig function groupByStatus(tasks) : { backlog: Task[], planned: Task[] } - 按状态分组 */
```
建议每个对外导出的函数或核心方法前添加一行。

### 2.2 DOM 结构 `@skill-dom`
描述该模块生成的关键 DOM 骨架，使用缩进表示层级：
```javascript
/* @skill-dom
  .inbox-view
    .inbox-group[data-status]
      h3
      ul.task-list
        li.task-item[data-id]
          .task-check
          .task-desc
*/
```
至少为每个视图组件标记一次，让同步工具准确记录 UI 结构。

**复杂视图示例（整理箱）**：
```javascript
/* @skill-dom
  .organize-container
    .filter-bar
      .cascade-btn-group[data-level="1"]
      .cascade-btn-group[data-level="2"]
      .cascade-btn-group[data-level="3"]
    .edit-panel
      .edit-group[data-mark="priority"]
        .edit-modify-btn
        .edit-delete-btn
        .edit-options.hidden
    .task-list-container
      ul.task-list
        li.task-item
          .task-check
          .task-desc
          .preview-row
    .action-bar
      .confirm-all-btn
      .save-all-btn
*/
```

**Canvas 视图示例（甘特图）**：
```javascript
/* @skill-dom
  无实体DOM（使用Canvas绘制），主要容器：
  .gantt-container
    canvas#gantt-canvas
    .tooltip-overlay
*/
```

### 2.3 状态模型 `@skill-state`
描述模块级状态对象（或关键内部变量）的形状：
```javascript
/* @skill-state
  selectedTasks : Set<string>        // 已勾选的任务ID
  previewCache  : Map<string,string> // 任务ID → 预览文本
  editActions   : Array<EditOp>      // 待应用的编辑操作队列
*/
```
如果视图无内部状态，可写 `/* @skill-state 无（纯展示视图） */`。

**Canvas 甘特图状态示例**：
```javascript
/* @skill-state
  scrollOffset : number              // 水平滚动偏移
  zoomLevel    : number              // 当前缩放比例
  collapsedNodes : Set<string>       // 树节点折叠状态
  hoveredTask  : string|null         // 当前悬停的任务ID
*/
```

### 2.4 事件处理流程 `@skill-flow`
描述关键交互的调用链，用箭头表示顺序：
```javascript
/* @skill-flow
  勾选任务 → handleCheck(id) → updatePreviewCache() → renderPreviews()
  点击确认 → confirmTask(id) → writeTasks.patchTask() → 刷新该行
  点击批量确认 → confirmAll() → writeTasks.bulkPatch() → createSnapshot() → 全部刷新
*/
```

**整理箱多级筛选流程示例**：
```javascript
/* @skill-flow
  选择一级模式 → updateFilterVisibility() → 显示/隐藏二三级按钮组
  点击查询 → buildFilterConditions() → applyFilters() → 重新渲染任务列表
  编辑优先级 → selectPriorityOption(value) → updatePreviewForSelected() → 刷新预览行
*/
```

### 2.5 关键条件 `@skill-condition`
描述重要的业务分支条件，方便 AI 理解规则：
```javascript
/* @skill-condition
  若任务无截止日期 → 置底并显示灰色文字
  若选择“补全时间”且 n=0 → 开始日期 = 截止日期
*/
```

### 2.6 公共模块调用 `@skill-api`
标注使用了哪些公共工具或 API：
```javascript
/* @skill-api
  readTasks.getAllTasks(dv, state)
  createTaskCard(normalizeTaskCardData(task))
  DateUtils.formatDate(date)
*/
```

---

## 三、函数级注释（推荐）

对于复杂的函数，应补充 JSDoc 风格注释，说明参数、返回值、副作用：

```javascript
/**
 * 根据任务优先级映射到四象限
 * @param {Task} task - 标准化任务对象
 * @param {Object} quadrantConfig - 象限配置（来自 CONFIG）
 * @returns {string} 象限标识（'q1'|'q2'|'q3'|'q4'）
 */
function mapToQuadrant(task, quadrantConfig) { ... }
```

工具可提取此信息补充 Skill 的“核心函数”章节。

---

## 四、复杂逻辑的内联注释

在算法或业务规则密集的区域，使用单行注释解释意图：

```javascript
// 补全时间逻辑：确保 创建日期 ≤ 计划日期 ≤ 开始日期 ≤ 截止日期 ≤ 完成日期
if (plannedDate > startDate) {
  // 若计划日期晚于开始日期，则将开始日期调整为计划日期
  task.startDate = plannedDate;
}
```

内联注释可被同步工具识别，转化为 Skill 中的“关键条件”或“实现细节”。

---

## 五、注释的通用要求

- **使用中文**：所有面向业务规则的注释使用中文，减少歧义。
- **紧跟代码**：`@skill-*` 标签必须紧贴对应的函数、变量或 DOM 操作块。
- **保持更新**：修改逻辑时，必须同步更新相关注释，否则同步工具会产生过时信息。
- **不污染生产环境**：`@skill-*` 标签仅用于开发阶段。可在 `esbuild.config.mjs` 中配置 `pure: ['@skill-sig', '@skill-dom', '@skill-state', '@skill-flow', '@skill-condition', '@skill-api']`，确保构建时自动移除这些注释，避免进入最终产出的 `main.js`。

---

## 六、ESLint 配置建议

为支持 `@skill-*` 注释语法，建议在 `.eslintrc` 或 `eslint.config.mjs` 中增加以下规则，避免因非标准注释表达式产生警告：

```json
{
  "rules": {
    "no-unused-expressions": "off",
    "no-inline-comments": "off"
  }
}
```

或针对特定标签添加全局变量声明（若 ESLint 报未定义）：
```json
{
  "globals": {
    "@skill-sig": "readonly",
    "@skill-dom": "readonly",
    "@skill-state": "readonly",
    "@skill-flow": "readonly",
    "@skill-condition": "readonly",
    "@skill-api": "readonly"
  }
}
```

推荐与 `eslint-plugin-obsidianmd` 共同使用时，测试确认无冲突。

---

## 七、与同步工具的协作

`update-skill` Skill 已内置对这些注释的解析规则：
- 扫描全部 `@skill-*` 标签，精确提取签名、DOM、状态、事件流、条件等。
- 当源码中没有这些注释时，采用启发式方法（如分析 `createElement`、`addEventListener`）生成近似内容，但**精度较低**。
- 推荐在核心模块中至少添加 `@skill-sig`、`@skill-dom`、`@skill-state` 和 `@skill-flow`，可覆盖 90% 的同步需求。

**务必保持 `@see` 注释与 Skill 文件路径的一一对应**：
- 每个源码文件头部必须通过 `@see` 指向其对应的唯一 Skill 文件。
- 同步工具依赖 `@see` 快速定位目标 Skill，若缺失则可能无法映射，尤其在全量同步时会导致重复创建或映射失败。
- 当文件重命名或移动时，必须同时更新 `@see` 和对应的 Skill 文件路径。

---

## 八、快速上手

1. 在现有源码中，从最核心的视图（如 `matrix-task-view.js`、`organize-task-view.js`）开始添加 `@skill-*` 注释。
2. 运行一次 `全局同步`，让技能文档更新至最新粒度。
3. 之后每次修改代码时，同步更新注释，再执行 `更新技能`。
4. 在新视图中，务必在文件头部添加完整的结构化注释（尤其是 `@see`），再补充 `@skill-*` 标签。

通过本规范，AI 可以在只读 Skill 文档的情况下，生成与源码结构高度一致、功能等价且可直接替换的代码，极大降低人工微调成本。

## 关键操作需人工确认

- **修改 `sync/` 目录下的任何 Skill 文件**：这些文件控制着整个同步、快照、恢复流程的行为。任何对其内容的修改（无论是通过对话指令还是自动同步触发），都必须先向用户展示完整的变更摘要，并等待用户明确同意后方可执行写入。
