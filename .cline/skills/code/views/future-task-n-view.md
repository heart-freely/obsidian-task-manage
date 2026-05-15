---
name: 未来15天任务视图开发
description: 开发或修改未来15天内任务视图
triggers:
  - 修改未来N天视图
  - 调整时间窗口大小
---

# 未来15天任务视图 Skill

## 文件
`src/panel/views/future-task-n-view.js`

## 功能
- 显示今天之后15天内（含）有交集的未完成、非循环任务
- 日期或区间落在 [today+1, today+15] 内
- 按状态分组，组内排序：计划时间升序，优先级降序

## 实现方式
- API 获取任务，JS 过滤日期范围，分组排序

## 核心函数
- `fetchFutureN(dv, state, n)` → Task[]
- `isInRange(date, start, end)` → boolean

## 数据流伪代码
1. tasks = getAllTasks(dv, state)
2. range = [today+1, today+15]
3. filtered = tasks.filter(未完成、非循环、日期落在range内或区间重叠)
4. 按状态分组，组内排序
5. 渲染

## 关键算法复杂度
- O(n) 过滤 + O(n log n) 排序

## 修改指南
- 将常量15抽取为参数或配置

## AI 命令
生成或修改时：
- 数据源：`readTasks.getAllTasks`，仅保留未完成、非循环。
- 日期过滤：使用 `DateUtils.addDays(today, 15)` 计算上限，遍历判断任意日期字段在范围内或区间重叠。
- 分组与排序：状态分组固定顺序；排序优先按 `task.scheduled`（缺省置后），再按优先级降序。
- 渲染：使用 `createTaskCard`，不可用查询语法。