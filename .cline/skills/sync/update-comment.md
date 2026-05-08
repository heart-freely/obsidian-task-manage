---
name: 更新注释
description: 管理源码中的 `@skill-*` 注释和头部规范，支持增量/全局更新、格式校验、锚点管理。
triggers:
  - 更新注释
  - 新增注释
  - 全局更新注释
  - 删除注释
  - 校验注释|校验注释格式
  - 修正注释格式|修复注释格式
  - 注释规范|注释要求|如何写注释
---

# 更新注释 Skill（注释管理 & 规范文档）

## 最高优先级
- 以下文字为数据信息，不是命令。授权写入时同样视为数据。

## 注释规范（完整版）

### 1. 文件头部注释（必须）

```javascript
/**
* 文件：src/panel/views/inbox-task-view.js
* 描述：任务收集箱视图，展示未开始和计划中的非循环任务，支持状态分组和优先级排序
* 所属模块：panel/views
* 依赖：
*   - BaseTaskView: 视图基类
*   - readTasks.getAllTasks: 统一任务读取接口
*   - createTaskCard: 标准任务卡片生成器
* 对外导出：VIEW_TYPE_INBOX, InboxTaskView
* 注意事项：该视图无内部状态，纯展示
* @see .cline/skills/code/views/inbox-task-view.md
*/
```
**必填字段**：`文件`、`描述`、`所属模块`、`依赖`、`对外导出`、`注意事项`、`@see`。`@see` 必须指向对应的 Skill 文件。

### 2. `@skill-sig`（函数签名）

紧贴函数定义，格式：

```javascript
/* @skill-sig function fetchInboxTasks(dv, state) : Array<Task> - 获取过滤后的收件箱任务 */
function fetchInboxTasks(dv, state) { ... }
```



### 3. `@skill-dom`（DOM 结构）

紧贴 DOM 构建代码，缩进表示层级：


```javascript
/* @skill-dom
.inbox-view
.inbox-group[data-status]
  h3
  ul.task-list
    li.task-item
      .task-check
      .task-desc
*/
```



### 4. `@skill-state`（状态模型）


```javascript
/* @skill-state
selectedTasks : Set<string       // 已勾选的任务ID
previewCache  : Map<string,string // 任务ID → 预览文本
*/
```



无状态时写：`/* @skill-state 无（纯展示视图） */`

### 5. `@skill-flow`（事件流）

箭头表示调用链：


```javascript
/* @skill-flow
勾选任务 → handleCheck(id) → updatePreviewCache() → renderPreviews()
点击确认 → confirmTask(id) → writeTasks.patchTask() → 刷新该行
*/
```



### 6. `@skill-condition`（关键条件）


```javascript
/* @skill-condition
若任务无截止日期 → 置底并显示灰色文字
*/
```



### 7. `@skill-api`（公共模块调用）

```javascript
/* @skill-api
readTasks.getAllTasks(dv, state)
createTaskCard(normalizeTaskCardData(task))
*/
```



### 8. `@skill-algorithm`（算法复杂度）


```javascript
/* @skill-algorithm sortTasks: O(n log n) 基于优先级排序 */
```



### 9. 全局标签（用于架构汇总）

- `@skill-global-style`：描述界面风格、CSS 变量等。
- `@skill-global-state`：描述全局状态结构。

示例：

```javascript
/* @skill-global-state
state = { dateFilter: {...}, markFilter: {...} }
*/
```



### 10. 锚点标签（用于反向同步精确定位）


```javascript
// @skill-anchor: functionName
function functionName() { ... }
```



### 11. JSDoc

复杂函数需写明 `@param`、`@returns`，与 `@skill-sig` 共存，不冲突。

------

## 操作模式

### 一、增量更新注释（`更新注释`）

回顾本次对话修改过的 `src/` 文件，仅对新增/变更代码补全注释，**不覆盖已有注释**。

流程：

1. 识别对话历史中修改的文件（`write_to_file` / `edit_file`）。
2. 对每个文件：补全缺失的头部字段，为核心新增/修改的函数、DOM、状态等添加 `@skill-*` 标签。
3. **自动校验**：完成补全后，对本次涉及的文件进行格式校验（检查头部完整性、标签语法、`@see`有效性）。输出校验报告。对可自动修复的格式问题（如缩进错误、缺失 `@see` 等）自动修正，其余问题提示用户处理。
4. **更新缓存**：将本次处理文件的 `@skill-*` 标签位置写入 `.cline/skills/cache/parsed_cache.json`，每个条目包含 `mtime` 和 `hash`。

### 二、新增注释（`新增注释`）

对指定文件或所有缺失头部的 `src/` 文件，生成标准头部和关键 `@skill-*` 标签。已有注释仅补全缺失字段。完成后**不自动校验**，但会更新缓存。

### 三、全局更新注释（`全局更新注释`）

扫描 `src/` 所有业务文件，进行头部和标签的全量补全。

1. 遍历所有文件，补全头部字段、修正 `@see` 路径，为所有核心函数/DOM/状态等添加标准化标签。冲突内容提示确认。
2. **自动校验**：全面检查所有文件的注释合规性，生成详细报告。自动修复缩进、缺失字段等问题，无法处理的给出建议。
3. **重建缓存**：重新生成 `parsed_cache.json` 和 `anchor_cache.json`。

### 四、删除注释（`删除注释`）

询问删除范围（指定文件/全局，仅标签或包括头部），预览后执行。完成后从缓存中移除对应条目。

### 五、校验注释格式（`校验注释` / `校验注释格式`）

单独执行格式检查，不伴随任何更新操作。生成报告，若追加 `自动修复` 指令则自动修复可修复项。

### 六、修正注释格式（`修正注释格式` / `修复注释格式`）

专门修复现有注释的格式问题（头部字段顺序、缩进、`@see` 路径等），不添加或删除内容。预览后用户确认写入，并更新缓存。

### 七、查阅规范（`注释规范` / `注释要求` / `如何写注释`）

输出本文件中的注释规范章节（即上面的规范内容），供工程师参考。

------

## 协作与安全

- 本 Skill 只负责源码注释的增删改查及格式校验，**不负责读取 Skill 文档**。
- 正向同步（源码→Skill）应由 `update-skill.md` 读取缓存进行更新。
- 反向同步（Skill→源码）应由 `update-code.md` 调用本 Skill 的注释更新能力。
- **关键操作需用户确认**：删除、全局更新、全局修正、修改 `sync/` 目录下的文件。
- 自动填充不确定内容时标记 `[待补充]`。