---
name: 插件全局配置
description: 全局常量、映射表、默认分页大小、颜色等
skill-version: 4.0
triggers:
  - 修改全局配置
  - 调整常量
---

# 插件全局配置 Skill

## 文件 <!-- @sync -->
`src/configs/plugin-configs.js`

## 导出 <!-- @sync -->
- `PAGE_SIZE`
- `PRIORITY_MAP`
- `STATUS_COLOR_MAP`
- `ALL_SORT_KEYS`
- `DEFAULT_STATE`

## 关联文件 <!-- @sync -->
- 源码：`src/configs/plugin-configs.js`
- Skill：`.cline/skills/code/configs/plugin-configs.md`

## 功能 <!-- @manual -->
- 集中管理插件所有常量配置，包括分页大小、优先级映射、状态颜色、排序键等。

## 核心常量 (@skill-sig) <!-- @sync -->
- `PAGE_SIZE: number = 50` - 默认分页每页任务数
- `PRIORITY_MAP: Map<number, string>` - 优先级数值到 emoji 的映射
- `STATUS_COLOR_MAP: Map<string, string>` - 状态符号到颜色值的映射（用于图表和进度条）
- `ALL_SORT_KEYS: string[] = ['priority', 'due', 'scheduled', 'status']` - 全局支持的排序字段
- `DEFAULT_STATE: object` - 全局状态默认值（与 `persist-storage.js` 中的 `createInitialState` 同步）

## 状态符号颜色映射示例 <!-- @sync -->
| 状态符号 | 说明   | 颜色值    |
| -------- | ------ | --------- |
| `' '`    | 未开始 | `#2e333b` |
| `'?'`    | 计划中 | `#4b525b` |
| `'/'`    | 进行中 | `#7fb8f0` |
| `'x'`    | 已完成 | `#47852f` |
| `'-'`    | 已取消 | `#c3393e` |

## 优先级映射示例 <!-- @sync -->
| 数值 | Emoji |
| ---- | ----- |
| 1    | 🔺     |
| 2    | ⏫     |
| 3    | 🔼     |
| 4    | 🔽     |
| 5    | ⏬     |

## 修改指南 <!-- @auto-record -->
- 2026-05-07: v4.0 补充常量说明