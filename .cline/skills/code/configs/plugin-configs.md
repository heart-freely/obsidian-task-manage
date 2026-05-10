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

- 命名导出常量：
    - `TASK_FOLDERS` - 任务文件夹路径数组
    - `FILE_NAME_PATTERN` - 任务文件名匹配正则
    - `ROOT_PATH`, `TASK_FOLDER_PATH` - 任务根路径/文件夹路径
    - `TASK_FILENAME_REGEX_TASKS`, `TASK_FILENAME_REGEXP` - 文件名正则
    - `ALLOWED_STATUSES` - 允许的状态列表
    - `STATUS_NAMES`, `STATUS_ICONS`, `STATUS_SORT_ORDER`, `STATUS_SYMBOL_MAP` - 状态映射
    - `PRIORITY_ORDER`, `PRIORITY_COLORS`, `PRIORITY_ICONS`, `PRIORITY_LABELS`, `PRIORITY_NAME_MAP` - 优先级映射
    - `REPEAT_ORDER`, `REPEAT_COLORS`, `REPEAT_ICON`, `REPEAT_LABELS` - 循环映射
    - `DATE_MARK_ORDER`, `DATE_MARK_ICONS`, `DATE_MARK_NAMES`, `DATE_FIELD_SORT_ORDER` - 日期标记映射
    - `ID_ICON`, `DEPENDS_ICON`, `TAG_ICON` - 图标常量
    - `MARK_NAMES`, `ALL_MARKS` - 标记名称映射
    - `TASK_MARK_SEQUENCE` - 任务标记序列
- `CONFIG`（默认聚合对象）- 包含上述所有常量的运行时聚合配置
- `DEFAULT_SETTINGS` - 用户自定义默认设置

## 关联文件 <!-- @sync -->

- 源码：`src/configs/plugin-configs.js`
- Skill：`.cline/skills/code/configs/plugin-configs.md`

## 功能 <!-- @manual -->

- 集中管理插件所有常量配置，包括任务文件夹路径、状态、优先级、循环、日期标记等的定义、映射和排序
- 提供 `CONFIG` 运行时聚合对象和 `DEFAULT_SETTINGS` 用户默认设置

## 核心常量 (@skill-sig) <!-- @sync -->

### 任务文件夹

- `TASK_FOLDERS: string[]` - 任务文件所在文件夹路径数组，默认 `['"pages/A 系统/A 任务系统"']`
- `FILE_NAME_PATTERN: RegExp` - 任务文件名匹配正则，默认 `/任务$/`
- `ROOT_PATH: string` - 任务根路径，默认 `"pages/A 系统/A 任务系统/"`
- `TASK_FOLDER_PATH: string` - 任务文件夹路径，默认 `"pages/A 系统/A 任务系统"`

### 状态映射

- `ALLOWED_STATUSES: string[]` - 允许状态：todo/planned/in-progress/completed/cancelled
- `STATUS_NAMES: Object` - 英文→中文名称映射
- `STATUS_ICONS: Object` - 状态→图标字符映射
- `STATUS_SORT_ORDER: string[]` - 排序顺序
- `STATUS_SYMBOL_MAP: Object` - 标记符号→状态映射（' '→todo, '?'→planned, '/'→in-progress, 'x'/'X'→completed, '-'→cancelled）

### 优先级映射

- `PRIORITY_ORDER: string[]` - 排序顺序：⏬(最低)→🔽(低)→🔼(中)→⏫(高)→🔺(最高)
- `PRIORITY_COLORS: string[]` - 颜色映射
- `PRIORITY_ICONS: Object` - 数值→图标：0→🔺, 1→⏫, 2→🔼, 3→🔽, 4→⏬
- `PRIORITY_LABELS: Object` - 数值→中文/英文标签
- `PRIORITY_NAME_MAP: Object` - 数值→简短中文名称

### 循环映射

- `REPEAT_ORDER: string[]` - 排序顺序：every day/every week/every month/every year
- `REPEAT_COLORS: string[]` - 颜色映射
- `REPEAT_ICON: string` - 统一图标 🔁
- `REPEAT_LABELS: Object` - 循环类型→中文名称

### 日期标记映射

- `DATE_MARK_ORDER: string[]` - 排序顺序：created/scheduled/starts/due/done/cancel
- `DATE_MARK_ICONS: Object` - 标记类型→图标（➕/⏳/🛫/📅/✅/❌）
- `DATE_MARK_NAMES: Object` - 标记类型→带图标的中文名称
- `DATE_FIELD_SORT_ORDER: string[]` - 日期字段排序顺序

### 标记序列

- `TASK_MARK_SEQUENCE: string[]` - 任务标记解析和渲染顺序：status→description→priority→repeat→created→...→tag
- `MARK_NAMES: Object` - 标记键名→中文名称
- `ALL_MARKS: string[]` - 所有标记键名列表

### 聚合对象

- `CONFIG: Object` - 包含上述所有常量 + YEAR_LIST/WORK_HOURS_PER_DAY/SORT_TYPES/INTERVAL_MODES/DEFAULT_FILTER_STATE/SKILL_FILES
- `DEFAULT_SETTINGS: Object` - 用户默认设置（含 STATUS_COLORS, DATE_MARK_COLORS 等）

## 修改指南 <!-- @auto-record -->

- 2026-05-07: v4.0 补充常量说明
