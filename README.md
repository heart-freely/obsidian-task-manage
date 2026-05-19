## 概述

这是一个功能丰富的 Obsidian 任务管理插件，使用 Dataview 和 Tasks 插件 API 作为数据源，采用 ItemView 架构实现多个视图（矩阵、看板、日历、甘特图、时间线、任务表、整理箱等），并统一复用全局筛选条件、排序、左侧树导航。

---

## 项目结构

```text
src/
├── __mocks__/
│   └── obsidian.js
├── __tests__/
│   ├── common-process.test.js
│   ├── filter-task-process.test.js
│   └── persist-storage.test.js
├── configs/
│   └── plugin-configs.js
├── echarts/
│   └── echarts.js
├── panel/
│   ├── bars/
│   │   ├── control-botton-bar.js
│   │   ├── date-botton-bar.js
│   │   ├── hide-botton-bar.js
│   │   ├── mark-botton-bar.js
│   │   ├── quick-botton-bar.js
│   │   ├── side-botton-bar.js
│   │   └── sort-botton-bar.js
│   ├── components/
│   │   └── tree-view-components.js
│   ├── images/
│   │   └── panel/
│   ├── interacts/
│   │   ├── chart-interact.js
│   │   └── tooltip-interact.js
│   ├── views/
│   │   ├── base-list-view.js
│   │   ├── base-table-view.js
│   │   ├── base-task-view.js
│   │   ├── calendar-task-view.js
│   │   ├── data-base-tasks-view.js
│   │   ├── data-detail-tasks-view.js
│   │   ├── depends-task-view.js
│   │   ├── edit-tasks-view.js
│   │   ├── future-task-all-view.js
│   │   ├── future-task-n-view.js
│   │   ├── gantt-task-view.js
│   │   ├── important-task-view.js
│   │   ├── inbox-task-view.js
│   │   ├── kanban-task-view.js
│   │   ├── matrix-task-view.js
│   │   ├── organize-task-view.js
│   │   ├── overdue-task-view.js
│   │   ├── pomodoro-task-view.js
│   │   ├── recurring-task-view.js
│   │   ├── table-task-view.js
│   │   ├── tag-task-view.js
│   │   ├── timeline-task-view.js
│   │   ├── today-task-view.js
│   │   ├── tree-task-view.js
│   │   └── view-list-tasks.js
│   └── panel.js
├── storage/
│   └── persist-storage.js
├── tasks/
│   ├── process/
│   │   ├── calcul-chart-process.js
│   │   ├── common-process.js
│   │   ├── filter-task-process.js
│   │   ├── inbox-task-process.js
│   │   ├── kanban-task-process.js
│   │   ├── matrix-task-process.js
│   │   ├── organize-task-process.js
│   │   ├── recurring-task-process.js
│   │   ├── task-query-process.js
│   │   └── tree-task-process.js
│   ├── read/
│   │   └── read-tasks.js
│   └── write/
│       └── write-tasks.js
├── utils/
│   └── logger.js
└── main.js
```
