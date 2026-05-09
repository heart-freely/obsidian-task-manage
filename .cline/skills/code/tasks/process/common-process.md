---
name: 通用任务处理
skill-version: 4.0
description: 纯工具函数集，提供日期操作(DateUtils)、帧节流(throttleByFrame)和简易 DOM 创建(createEl)
triggers:
  - 日期范围计算
  - 任务排序
  - DOM 元素创建
  - 帧节流
---

# 通用任务处理 Skill

## 文件<!-- @sync -->
`src/tasks/process/common-process.js`

## 导出<!-- @sync -->
- `DateUtils`（命名空间对象，包含`formatDate`、`setStart`、`setEnd`、`getDayRange`、`getISOWeekNumber`、`getWeekRangeByYearWeek`、`getWeekRange`、`getMonthRange`、`getMonthRangeByYearMonth`、`getQuarterRangeByYearQuarter`、`getYearRangeByYear`、`getWeekdayRange`）
- `throttleByFrame`
- `createEl`

## 关联文件<!-- @sync -->
- 源码：`src/tasks/process/common-process.js`
- Skill：`.cline/skills/code/tasks/process/common-process.md`
- 视图 Skill：`.cline/skills/code/panel/views/views.md`

## 功能 <!-- @sync -->
- 提供日期格式化、时间范围计算（日/周/月/季度/年）等静态方法
- 提供 `requestAnimationFrame` 节流函数，用于高频事件优化
- 提供简易 DOM 元素创建函数，不依赖 Obsidian API

## 实现方式<!-- @sync -->
- `DateUtils` 为命名空间对象，所有方法返回新 Date 对象，不修改入参
- `throttleByFrame` 使用 boolean `scheduled` 标志 + `requestAnimationFrame`
- `createEl` 通过 `document.createElement` 创建，通过 `textContent` 或 `Object.assign` 设置内容

## 核心函数 (@skill-sig) <!-- @sync -->
- `DateUtils.formatDate(d: Date): string` — 格式化日期为 `yyyy-MM-dd`
- `DateUtils.setStart(d: Date): Date` — 设置当天起始时刻 `00:00:00.000`
- `DateUtils.setEnd(d: Date): Date` — 设置当天结束时刻 `23:59:59.999`
- `DateUtils.getDayRange(d): {start,end}` — 获取全天范围
- `DateUtils.getISOWeekNumber(date): number` — 获取 ISO 周数（1-53）
- `DateUtils.getWeekRangeByYearWeek(year, week): {start,end}` — 根据年月获取周范围
- `DateUtils.getWeekRange(d): {start,end}` — 获取日期所在周范围
- `DateUtils.getMonthRange(d): {start,end}` — 获取日期所在月范围
- `DateUtils.getMonthRangeByYearMonth(y, m): {start,end}` — 根据年月获取月范围
- `DateUtils.getQuarterRangeByYearQuarter(y, q): {start,end}` — 根据年份季度获取季度范围
- `DateUtils.getYearRangeByYear(y): {start,end}` — 获取全年范围
- `DateUtils.getWeekdayRange(date, wd): {start,end}` — 获取下个星期几的范围
- `throttleByFrame(fn: Function): Function` — 帧节流函数
- `createEl(tag: string, textOrOpts?: string|Object, opts?: Object): HTMLElement` — 简易 DOM 元素创建

## 数据流伪代码<!-- @sync -->
```text
DateUtils.get/Day/Week/Month/Quarter/Year Range() → 调用 setStart/setEnd 统一边界
throttleByFrame(fn) → 返回节流包装函数 → 内部用 requestAnimationFrame 调度
createEl(tag, textOrOpts, opts) → 创建元素 → 设置 textContent 或 Object.assign → 处理 cls/style/attr
```

## 关键算法复杂度<!-- @sync -->
O(1) — 所有函数均为常数时间操作

## 公共调用 (@skill-api)<!-- @sync -->
- 各视图模块调用 `DateUtils` 方法计算时间范围
- 高频事件监听调用 `throttleByFrame` 优化性能
- 视图组件调用 `createEl` 创建 DOM 元素

## 关键条件 (@skill-condition)<!-- @sync -->
- `DateUtils` 所有方法均返回新 Date 对象，不修改入参
- `throttleByFrame`: 使用 boolean `scheduled` 标志防止重复调度
- `createEl`: textOrOpts 为字符串时设 textContent，为对象时 Object.assign；opts 可选

## 依赖<!-- @sync -->
无外部依赖

## 错误处理<!-- @sync -->
- `DateUtils.formatDate` 中 `pad` 函数通过字符串补零，无异常风险
- `createEl` 对 opts.attr 使用 `Object.hasOwn` 安全检查

## 测试要点 <!-- @manual -->
- 验证日期边界：getDayRange 的 start 为 00:00:00.000，end 为 23:59:59.999
- 验证跨年/跨月：getMonthRange 在 1 月和 12 月边界正确
- 验证节流：高频多次调用仅执行一次

## 修改指南 <!-- @auto-record -->
- 2026-05-08: v4.0 初始创建，按标准模板格式化