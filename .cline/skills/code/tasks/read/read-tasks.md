---
name: 任务读取与解析
skill-version: 4.0
description: 任务读取和解析模块，提供正则标记集合(RX)、任务状态判断、属性提取等功能
triggers:
  - 修改任务读取逻辑
  - 调整任务解析规则
  - 添加新的标记类型
---

# 任务读取与解析 Skill

## 文件 <!-- @sync -->

`src/tasks/read/read-tasks.js`

## 导出 <!-- @sync -->

- `RX`
- `getTaskStatus`
- `getStatusIcon`
- `isTaskToday`
- `computeTaskTimeRange`
- `ensureTaskProperties`
- `getAllTasks`

## 关联文件 <!-- @sync -->

- 源码：`src/tasks/read/read-tasks.js`
- Skill：`.cline/skills/code/tasks/read/read-tasks.md`

## 功能 <!-- @manual -->

- 定义正则标记集合 RX，用于匹配任务行中的各种图标标记
- 从任务行文本解析任务状态
- 根据任务状态返回状态图标
- 判断任务是否为今天的任务
- 计算任务的时间范围
- 确保任务对象包含 _cleanText/_tooltip/_tooltipHtml 属性
- 从 Dataview 查询结果中获取所有配置文件夹中的任务

## 核心函数 (@skill-sig) <!-- @sync -->

- `RX : Object` - 正则标记集合，包含 priority/repeat/created/scheduled/starts/due/done/cancel/tag/id/forbid
- `getTaskStatus(line: string): string` - 从任务行文本中解析任务状态(completed/in-progress/planned/cancelled/todo)
- `getStatusIcon(task: Object): string` - 根据任务状态返回对应的状态图标(✅/⏩/❔/❎/🔲)
- `isTaskToday(task: Object): boolean` - 判断任务是否为今天的任务(基于计划/截止/开始/创建日期)
- `computeTaskTimeRange(task: Object): Object|null` - 计算任务的时间范围({start,end})或null
- `ensureTaskProperties(task: Object): void` - 确保任务对象包含 _cleanText/_tooltip/_tooltipHtml 属性(直接修改原对象)
- `getAllTasks(force: boolean, dv: Object, state: Object): Array` - 获取所有配置文件夹中的任务(从 Dataview 查询结果中解析并缓存)

## 数据流伪代码 <!-- @sync -->

```text
getAllTasks → 遍历TASK_FOLDERS → dv.pages(folder) → FILE_NAME_PATTERN过滤 → 遍历page.file.tasks → 解析状态/日期/标记 → computeTaskTimeRange → ensureTaskProperties → 缓存tasks → 构建taskIdMap → 返回tasks列表
ensureTaskProperties → 清理标记图标生成_cleanText → 组合各部分生成_tooltip → 转HTML生成_tooltipHtml
computeTaskTimeRange → 收集scheduled/due/starts/done → DateUtils.setStart/setEnd → 返回时间戳范围
getTaskStatus → 匹配"- [x]/[X]/[-]/[/]/[?]" → 映射completed/cancelled/in-progress/planned/todo
getStatusIcon → 按_status/completed判定 → 返回对应图标
isTaskToday → 取今天0点~明天0点范围 → 检查_scheduled/_due/_starts/_created是否在此范围
```

## 关键算法复杂度 <!-- @sync -->

- `getAllTasks` O(n * m)，n=文件夹数，m=每个文件夹平均任务数
- 各辅助函数 O(1)

## 公共调用 <!-- @sync -->

- `CONFIG` (`.cline/skills/code/configs/plugin-configs.md`)
- `logger` (`.cline/skills/code/utils/logger.md`)
- `DateUtils` (`.cline/skills/code/tasks/process/common-process.md`)

## 关键条件 <!-- @sync -->

- `getAllTasks` 依赖 Dataview 插件 API(dv) 和全局状态上下文(state)
- `CONFIG.TASK_FOLDERS` 和 `CONFIG.FILE_NAME_PATTERN` 决定任务搜索范围和文件名过滤
- `ensureTaskProperties` 直接修改传入的task对象(副作用)
- 状态映射表: `{"/":"in-progress","?":"planned","-":"cancelled",x:"completed",X:"completed"}`
- 正则标记集合RX的匹配优先级: priority → repeat → created → scheduled → starts → due → done → cancel → tag → id → forbid
- `_cleanText` 按顺序移除所有标记图标后trim()，若为空则使用原始task.text
- 关联视图 sync: 各视图模块通过 `getAllTasks` 获取原始任务数据

## 依赖 <!-- @sync -->

- `src/configs/plugin-configs(CONFIG)`
- `src/utils/logger`
- `src/tasks/process/common-process(DateUtils)`
- Dataview 插件 API

## 错误处理 <!-- @sync -->

- `getAllTasks` 中单任务解析失败会跳过并记录 warn 日志
- `state` 缺失时抛出 Error

## 测试要点 <!-- @manual -->

- 验证 `getTaskStatus` 对各种状态符号的映射正确性
- 验证 `isTaskToday` 在日期边界条件下的判定正确性
- 验证 `computeTaskTimeRange` 在无日期字段时返回 null
- 验证 `ensureTaskProperties` 幂等性(多次调用不改变结果)
- 验证 `getAllTasks` 中 Dataview 查询结果为空时的处理

## 修改指南 <!-- @auto-record -->

- 2026-05-07: v4.0 从源码注释中提取完整函数签名和流程
