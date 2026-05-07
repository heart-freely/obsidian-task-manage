---
name: 任务写入与快照
description: 批量修改任务、生成快照、恢复快照
skill-version: 4.0
triggers:
  - 修改任务写入逻辑
  - 调整快照机制
---

# 任务写入与快照 Skill

## 文件 <!-- @sync -->
`src/tasks/write/write-tasks.js`

## 导出 <!-- @sync -->
- `bulkPatch`
- `createSnapshot`
- `restoreFromSnapshot`
- `patchTask`

## 关联文件 <!-- @sync -->
- 源码：`src/tasks/write/write-tasks.js`
- Skill：`.cline/skills/code/tasks/write-tasks.md`

## 功能 <!-- @manual -->
- 批量修改任务文本并写回源文件
- 生成修改前快照（localStorage）
- 从快照恢复任务

## 实现方式 <!-- @sync -->
- 每个任务包含 `filePath`、`line`、`newText`，使用 `writeTasks.bulkPatch` 一次性写入
- 快照存储为 JSON 数组，包含原始文本、路径、行号

## 核心函数 (@skill-sig) <!-- @sync -->
- `bulkPatch(changes: Array<{filePath: string, line: number, newText: string}>): Promise<void>` - 批量写入任务
- `patchTask(filePath: string, line: number, newText: string): Promise<void>` - 单任务写入（内部调用 bulkPatch）
- `createSnapshot(tasks: Task[]): Snapshot` - 生成快照，返回包含原始数据、时间戳的对象
- `restoreFromSnapshot(snapshotId: string): Promise<void>` - 从快照恢复所有任务

## 快照结构 <!-- @sync -->
```js
Snapshot = {
  id: string,
  timestamp: number,
  tasks: Array<{
    filePath: string,
    line: number,
    originalText: string
  }>
}
```

## 数据流伪代码 <!-- @sync -->

text

```
changes = prepareChanges(confirmedTasks, previewCache)
for each change:
  读取文件内容，替换指定行
写入文件（保持原子性，失败回滚）
生成快照并存储到 localStorage
```



## 关键算法复杂度 <!-- @sync -->

批量写入 O(k) 文件操作，快照 O(k)

## 公共调用 <!-- @sync -->

- `readTasks.getAllTasks` (`.cline/skills/code/tasks/read-tasks.md`)
- `localStorage` API

## 关键条件 <!-- @sync -->

- 写入前必须验证行号有效
- 快照最多保留 20 个（自动清理）
- 写入失败时不部分提交，抛出异常

## 依赖 <!-- @sync -->

- Obsidian `Vault` API
- `localStorage`

## 错误处理 <!-- @sync -->

- 文件不存在或行号无效时跳过该任务，记录错误
- 批量写入中任一失败则整体回滚，不写入任何文件

## 测试要点 <!-- @manual -->

- 验证快照生成后能完全恢复原文
- 验证并发写入时不会损坏文件

## 修改指南 <!-- @auto-record -->

- 2026-05-07: v4.0 补充函数签名