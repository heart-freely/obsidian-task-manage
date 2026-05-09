---
name: 收件箱任务处理
skill-version: 4.0
description: 收件箱任务获取与分组处理，依赖 obsidian-tasks-plugin 查询未完成、非重复、待处理/计划中的任务
triggers:
  - 收件箱任务查询
  - 收件箱任务分组
descriptions:
  - 获取收件箱任务
  - 按状态分组处理
---

# 收件箱任务处理 Skill

## 文件<!-- @sync -->
`src/tasks/process/inbox-task-process.js`

## 导出<!-- @sync -->
- `fetchInboxTasks(app): Promise<Array>` — 获取收件箱任务
- `processInboxTasks(allTasks): {groups, total}` — 按状态分组处理

## 关联文件<!-- @sync -->
- 源码：`src/tasks/process/inbox-task-process.js`
- 配置：`src/configs/plugin-configs.js`（引用 `TASK_FILENAME_REGEX_TASKS`、`TASK_FOLDER_PATH`）
- 视图 Skill：`.cline/skills/code/panel/views/views.md` → inbox-task-view 数据源

## 功能 <!-- @sync -->
- 通过 obsidian-tasks-plugin 查询未完成、非重复、状态为待处理（空格）或计划中（?）的任务
- 按执行状态分为「未开始」和「计划中」两组
- 每组内按优先级从高到低排序（1→2→3→4→5→999 权重）
- 为每个任务提取 description、priority、path、lineNumber、scheduled、start、due、tags、fileName

## 实现方式<!-- @sync -->
- `fetchInboxTasks` 通过 `app.plugins.plugins["obsidian-tasks-plugin"]` 获取 Tasks 插件实例
- 使用 Tasks 插件的 `getTasks(query)` 方法，构建 query 字符串：`not done path includes "..." filename regex matches ... is not recurring`
- 结果按 `status.symbol` 过滤（空格或 ?）
- `processInboxTasks` 遍历任务数组，按 symbol 分入两组
- 每组按优先级排序，`none` 转为 999 作为兜底权重

## 核心函数 (@skill-sig) <!-- @sync -->
- `fetchInboxTasks(app): Promise<Array>` — 获取收件箱任务
  - @param app: Obsidian.App — Obsidian 应用实例
  - @returns Promise<Array> — 收件箱任务对象数组
  - @throws Error — Tasks 插件未加载时抛出
- `processInboxTasks(allTasks): {groups, total}` — 处理收件箱任务
  - @param allTasks: Array — 收件箱任务对象数组
  - @returns {{groups: Object.<string, Array>, total: number}} — 分组结果

## 事件流 (@skill-flow) <!-- @sync -->
```text
fetchInboxTasks → tasksPlugin.getTasks(not done + is not recurring) → 按 status.symbol 过滤空格/? → 返回数组
processInboxTasks → 遍历 allTasks → 按 symbol 分入 groups"未开始"/"计划中" → 每组按优先级排序 → 返回 {groups, total}
```

## 公共调用 (@skill-api)<!-- @sync -->
- 收件箱视图（inbox-task-view）调用 `fetchInboxTasks` 和 `processInboxTasks` 获取并处理数据

## 关键条件 (@skill-condition)<!-- @sync -->
- 依赖 obsidian-tasks-plugin 实例，插件未加载时抛出 Error
- 筛选条件：「not done」+「is not recurring」+ 状态 symbol 为空格（待处理）或 ?（计划中）
- 优先级排序权重：none→999，actual priority 值越小优先级越高

## 依赖<!-- @sync -->
- `plugin-configs.js`：`TASK_FILENAME_REGEX_TASKS`、`TASK_FOLDER_PATH`
- Tasks 插件（obsidian-tasks-plugin）

## 错误处理<!-- @sync -->
- Tasks 插件未加载时 `fetchInboxTasks` 抛出 Error「Tasks 插件未安装」
- 对每个任务字段进行 null 安全处理（如 `t.priority || "none"`、`t.description || "（无描述）"`）

## 测试要点 <!-- @manual -->
- 验证 Tasks 插件未加载时 throw Error
- 验证 query 字符串拼接正确
- 验证筛选逻辑：已完成任务、重复任务应被排除
- 验证分组正确：空格→未开始，?→计划中
- 验证排序正确：优先级从高到低
- 验证提取字段完整性

## 修改指南 <!-- @auto-record -->
- 2026-05-08: v4.0 初始创建，按标准模板格式化