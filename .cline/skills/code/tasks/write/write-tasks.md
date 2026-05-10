---
name: 任务写入工具
skill-version: 4.0
description: 任务写入工具模块（预留占位），提供将任务数据写入/更新到 Obsidian 文件的功能
triggers:
  - 实现任务写入逻辑
  - 添加任务创建功能
  - 添加任务状态更新功能
---

# 任务写入工具 Skill

## 文件 <!-- @sync -->

`src/tasks/write/write-tasks.js`

## 当前状态 <!-- @sync -->

**预留占位模块** — 当前无导出函数实现。

## 关联文件 <!-- @sync -->

- 源码：`src/tasks/write/write-tasks.js`
- Skill：`.cline/skills/code/tasks/write/write-tasks.md`

## 计划功能 (@skill-sig) <!-- @sync -->

- `writeTask(taskData, file, app): Promise` - 将任务写入指定文件(预留，功能未实现)
- `updateTaskStatus(taskId, status, state, app): Promise` - 更新任务状态(预留，功能未实现)
- `deleteTask(taskId, file, app): Promise` - 删除任务(预留，功能未实现)

## 计划数据流伪代码 <!-- @sync -->

```text
writeTask → 打开文件 → 定位插入位置 → 写入markdown行 → 关闭文件(待实现)
updateTaskStatus → 查找taskId → 定位行 → 替换状态标记 → 保存文件(待实现)
```

## 计划参数 (@skill-param) <!-- @sync -->

- `taskData`: Object - 任务数据(标题/状态/优先级/日期等)
- `taskId`: string - 任务ID标记(🆔后的标识符)
- `status`: string - 目标状态(completed/in-progress/todo/planned/cancelled)
- `file`: Object - Obsidian TFile对象
- `app`: Object - Obsidian App实例
- `state`: Object - 全局状态上下文(含taskIdMap)

## 关键条件 <!-- @sync -->

- 预留模块: 当前为占位文件，无导出函数
- 依赖: 将来需要 Obsidian App API(Vault.modify/processFrontMatter)
- 关联: 与 `src/tasks/read/read-tasks.js(getAllTasks)` 的 taskIdMap 配合使用
- `writeTask` 计划支持: 创建新任务(追加到文件末尾)、创建新文件(带frontmatter)、更新子任务
- `updateTaskStatus` 计划通过 taskIdMap 快速定位任务

## 依赖 <!-- @sync -->

- `src/tasks/read/read-tasks` (taskIdMap)
- Obsidian App API (Vault.modify/processFrontMatter)

## 实现计划 <!-- @manual -->

1. `writeTask`：打开目标文件 → 定位末尾或指定位置 → 追加 Markdown 任务行
2. `updateTaskStatus`：通过 taskIdMap 查找任务 → 获取所在文件和行号 → 替换状态标记 → 保存
3. `deleteTask`：定位行 → 删除任务行 → 保存

## 测试要点 <!-- @manual -->

- 验证 writeTask 追加任务到文件末尾正确
- 验证 updateTaskStatus 正确替换状态标记
- 验证 deleteTask 正确删除任务行
- 验证 taskIdMap 快速定位能力

## 修改指南 <!-- @auto-record -->

- 2026-05-07: v4.0 从源码注释中提取计划功能定义
