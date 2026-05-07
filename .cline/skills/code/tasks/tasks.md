---
name: 任务数据模型
description: Task 对象的完整字段定义、类型和说明。供所有模块引用。
skill-version: 4.0
triggers:
  - 查看任务数据结构
  - 扩展任务字段
---

# 任务数据模型

## Task 对象字段定义

| 字段             | 类型       | 说明                                                       |
| ---------------- | ---------- | ---------------------------------------------------------- |
| `id`             | `string`   | 任务唯一标识（来自 🆔 标记）                                |
| `description`    | `string`   | 纯文本任务描述                                             |
| `status`         | `object`   | `{ type: 'TODO'|'DONE'|..., symbol: ' '|'?'|'/'|'x'|'-' }` |
| `priority`       | `number`   | 优先级数值（1-5 或 null）                                  |
| `priorityEmoji`  | `string`   | 优先级 emoji                                               |
| `isRecurring`    | `boolean`  | 是否循环任务                                               |
| `recurrenceRule` | `string`   | 循环规则文本                                               |
| `created`        | `Date?`    | 创建日期                                                   |
| `scheduled`      | `Date?`    | 计划日期                                                   |
| `start`          | `Date?`    | 开始日期                                                   |
| `due`            | `Date?`    | 截止日期                                                   |
| `done`           | `Date?`    | 完成日期                                                   |
| `cancelled`      | `Date?`    | 取消日期                                                   |
| `dependsOn`      | `string[]` | 依赖的其他任务 ID 数组                                     |
| `flag`           | `string?`  | 标签（🏁）                                                  |
| `filePath`       | `string`   | 文件路径                                                   |
| `line`           | `number`   | 任务所在行号                                               |
| `rawText`        | `string`   | 原始任务行文本                                             |

## 状态符号映射

| 符号         | 状态类型    | 说明   |
| ------------ | ----------- | ------ |
| `' '` (空格) | `TODO`      | 未开始 |
| `'?'`        | `TODO`      | 计划中 |
| `'/'`        | `TODO`      | 进行中 |
| `'x'`        | `DONE`      | 已完成 |
| `'-'`        | `CANCELLED` | 已取消 |

## 优先级映射

| 优先级 | 数值 | Emoji |
| ------ | ---- | ----- |
| 最高   | 1    | 🔺     |
| 高     | 2    | ⏫     |
| 中     | 3    | 🔼     |
| 低     | 4    | 🔽     |
| 最低   | 5    | ⏬     |

> 本文件由 AI 从源码自动同步（`<!-- @sync -->`），请勿手动编辑。如需修改，请调整源码中的解析逻辑。