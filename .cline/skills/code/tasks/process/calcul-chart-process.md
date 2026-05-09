---
name: 图表数据计算
skill-version: 4.0
description: 图表数据纯计算模块，提供甘特图跨度/任务时长/每日状态堆叠等统计计算，不修改入参，不涉及 Obsidian API
triggers:
  - 图表数据计算
  - 甘特图跨度计算
  - 任务时长统计
  - 每日状态堆叠
descriptions:
  - 计算时间跨度与总天数
  - 计算计划/实际时长
  - 准备堆叠图数据
---

# 图表数据计算 Skill

## 文件<!-- @sync -->
`src/tasks/process/calcul-chart-process.js`

## 导出<!-- @sync -->
- `computeTotalSpanDays(tasks, fieldStart, fieldEnd): number` — 计算时间跨度总天数
- `calcPlannedDuration(tasks): number` — 计算计划总时长（天）
- `calcActualDuration(tasks): number` — 计算实际总时长（天）
- `calcTotalSpanHours(tasks, fieldStart, fieldEnd): number` — 计算总工时
- `prepareDailyStatusStack(tasks, dateRange, formatDate, setStart, setEnd): {dates, seriesData, statusOrder}` — 准备每日状态堆叠数据

## 关联文件<!-- @sync -->
- 视图 Skill：`.cline/skills/code/panel/views/views.md` → ECharts 堆叠图数据 & 甘特图跨度计算
- 配置：`src/configs/plugin-configs.js`（引用 `CONFIG.ALLOWED_STATUSES`、`CONFIG.WORK_HOURS_PER_DAY`）

## 功能 <!-- @sync -->
- 纯计算函数集，不修改入参，不涉及 Obsidian API
- 计算任务集合的时间跨度（最早开始→最晚结束）
- 计算计划总时长（_scheduled→_due）和实际总时长（_starts→_done）
- 计算总工时（天数 × 每日工作小时数）
- 准备每日状态堆叠数据，用于 ECharts 堆叠图

## 核心函数 (@skill-sig) <!-- @sync -->
- `computeTotalSpanDays(tasks, fieldStart, fieldEnd): number`
  - @param tasks: Array — 任务对象数组
  - @param fieldStart: string — 起始日期字段名（如 '_scheduled'）
  - @param fieldEnd: string — 截止日期字段名（如 '_due'）
  - @returns number — 跨越总天数，无有效数据返回 0
- `calcPlannedDuration(tasks): number` — 基于 _scheduled→_due 计算
- `calcActualDuration(tasks): number` — 基于 _starts→_done 计算
- `calcTotalSpanHours(tasks, fieldStart, fieldEnd): number`
- `prepareDailyStatusStack(tasks, dateRange, formatDate, setStart, setEnd): {dates, seriesData, statusOrder}`

## 事件流 (@skill-flow) <!-- @sync -->
```text
computeTotalSpanDays → 遍历 tasks 取 fieldStart/fieldEnd → 计算 min->max 毫秒差 → 转天数 ceil
calcPlannedDuration → 遍历 tasks 取 _scheduled/_due → 累加 duration → Math.round
calcActualDuration → 遍历 tasks 取 _starts/_done → 累加 duration → Math.round
calcTotalSpanHours → 调用 computeTotalSpanDays → 乘以 WORK_HOURS_PER_DAY
prepareDailyStatusStack → 若 dateRange 则预填 dayMap → 遍历 tasks 按 _cachedTimeRange 逐日填充各 _status 计数 → 排序 keys → 构建 seriesData
```

## 关键条件 (@skill-condition)<!-- @sync -->
- 所有函数均为纯函数，不修改入参
- 依赖 CONFIG.ALLOWED_STATUSES / CONFIG.WORK_HOURS_PER_DAY
- 任务对象必须具有 _cachedTimeRange / _status
- prepareDailyStatusStack 在 dateRange 为 null 时自动扩展 dayMap

## 依赖<!-- @sync -->
- `src/configs/plugin-configs.js`：`CONFIG.ALLOWED_STATUSES`、`CONFIG.WORK_HOURS_PER_DAY`

## 修改指南 <!-- @auto-record -->
- 2026-05-08: v4.0 初始创建
