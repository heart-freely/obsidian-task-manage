---
name: 插件主入口
skill-version: 4.0
description: 插件入口文件，负责注册所有视图、命令、设置标签页，加载/保存配置
triggers:
    - 修改插件生命周期
    - 注册新的视图或命令
    - 调整设置标签页
---

# 插件主入口 Skill

## 文件 <!-- @sync -->

`src/main.js`

## 导出 <!-- @sync -->

- `TaskDataViewPlugin` (default export, extends `Plugin`)
- `TaskDataViewSettingTab` (class, extends `PluginSettingTab`)

## 关联文件 <!-- @sync -->

- 源码：`src/main.js`
- Skill：`.cline/skills/code/main.md`
- 视图 skill 汇总：`.cline/skills/code/views/views.md`

## 功能 <!-- @manual -->

- Obsidian 插件主类 TaskDataViewPlugin，管理插件生命周期
- 加载配置并合并到全局 CONFIG
- 注册 17 个子视图（导航中心 + 16 个独立视图）
- 注册 15 个命令（打开各视图）
- 注册设置标签页（任务文件夹/根路径/每日工时）
- 创建轻量键值存储适配器 storageAdapter

## 核心函数 (@skill-sig) <!-- @sync -->

- `TaskDataViewPlugin extends Plugin` - 插件主类
- `onload(): Promise<void>` - 插件加载入口
- `activateView(viewType: string): Promise<void>` - 激活指定类型的视图
- `saveSettings(settings: object): Promise<void>` - 合并保存配置
- `onunload(): void` - 插件卸载
- `TaskDataViewSettingTab extends PluginSettingTab` - 设置标签页类

## 导入 <!-- @sync -->

- `obsidian`: Plugin, PluginSettingTab, Setting
- `configs/plugin-configs`: CONFIG, DEFAULT_SETTINGS
- `panel/panel`: NavigatorView, VIEW_TYPE_NAVIGATOR
- 所有 views 子模块及其 VIEW*TYPE*\* 常量（共 16 个独立视图）
- `utils/logger`: logger

## 导出视图清单 @skill-anchor <!-- @sync -->

| viewType               | 视图类            | 实例ID    | 文件                                  |
| ---------------------- | ----------------- | --------- | ------------------------------------- |
| `task-dataview-view`   | NavigatorView     | navigator | `panel/panel.js`                      |
| `important-task-view`  | ImportantTaskView | important | `panel/views/important-task-view.js`  |
| `recurring-task-view`  | RecurringTaskView | recurring | `panel/views/recurring-task-view.js`  |
| `today-task-view`      | TodayTaskView     | today     | `panel/views/today-task-view.js`      |
| `future-n-task-view`   | FutureNTaskView   | futuren   | `panel/views/future-task-n-view.js`   |
| `future-all-task-view` | FutureAllTaskView | futureall | `panel/views/future-task-all-view.js` |
| `overdue-task-view`    | OverdueTaskView   | overdue   | `panel/views/overdue-task-view.js`    |
| `depends-task-view`    | DependsTaskView   | depends   | `panel/views/depends-task-view.js`    |
| `tag-task-view`        | TagTaskView       | tag       | `panel/views/tag-task-view.js`        |
| `inbox-task-view`      | InboxTaskView     | inbox     | `panel/views/inbox-task-view.js`      |
| `organize-task-view`   | OrganizeTaskView  | organize  | `panel/views/organize-task-view.js`   |
| `timeline-task-view`   | TimelineTaskView  | timeline  | `panel/views/timeline-task-view.js`   |
| `table-task-view`      | TableTaskView     | table     | `panel/views/table-task-view.js`      |
| `tree-task-view`       | TreeTaskView      | tree      | `panel/views/tree-task-view.js`       |
| `calendar-task-view`   | CalendarTaskView  | calendar  | `panel/views/calendar-task-view.js`   |
| `gantt-task-view`      | GanttTaskView     | gantt     | `panel/views/gantt-task-view.js`      |
| `pomodoro-task-view`   | PomodoroTaskView  | pomodoro  | `panel/views/pomodoro-task-view.js`   |

## 命令清单 @skill-anchor <!-- @sync -->

| 命令ID                  | 名称              | 激活视图             |
| ----------------------- | ----------------- | -------------------- |
| `open-navigator`        | 打开任务导航中心  | VIEW_TYPE_NAVIGATOR  |
| `open-important-tasks`  | 打开重要任务      | VIEW_TYPE_IMPORTANT  |
| `open-recurring-tasks`  | 打开循环任务      | VIEW_TYPE_RECURRING  |
| `open-today-tasks`      | 打开今天任务      | VIEW_TYPE_TODAY      |
| `open-future-n-tasks`   | 打开未来 n 天任务 | VIEW_TYPE_FUTURE_N   |
| `open-future-all-tasks` | 打开未来所有任务  | VIEW_TYPE_FUTURE_ALL |
| `open-overdue-tasks`    | 打开逾期任务      | VIEW_TYPE_OVERDUE    |
| `open-depends-tasks`    | 打开依赖任务      | VIEW_TYPE_DEPENDS    |
| `open-tag-tasks`        | 打开标签任务      | VIEW_TYPE_TAG        |
| `open-inbox-tasks`      | 打开收集箱        | VIEW_TYPE_INBOX      |
| `open-organize-tasks`   | 打开整理处        | VIEW_TYPE_ORGANIZE   |
| `open-timeline-tasks`   | 打开时间线视图    | VIEW_TYPE_TIMELINE   |
| `open-table-tasks`      | 打开任务表        | VIEW_TYPE_TABLE      |
| `open-calendar-tasks`   | 打开日历图        | VIEW_TYPE_CALENDAR   |
| `open-gantt`            | 打开甘特图        | VIEW_TYPE_GANTT      |

## 设置标签页 (@skill-dom) <!-- @sync -->

`.plugin-main > .setting-tab` 包含：

| 设置项     | 类型            | 说明                   |
| ---------- | --------------- | ---------------------- |
| 任务文件夹 | textarea (多行) | 每行一个文件夹路径     |
| 根路径     | text (单行)     | 仓库中任务文件的根目录 |
| 每日工时   | text (数字)     | 用于工时统计计算       |

## 全局状态 (@skill-global-state) <!-- @sync -->

```js
CONFIG = {
  TASK_FOLDERS: string[],         // 任务文件夹路径列表
  ROOT_PATH: string,               // 仓库中任务文件的根目录
  WORK_HOURS_PER_DAY: number,      // 每日工时
  ALLOWED_STATUSES: string[],      // 允许的状态列表
  TASK_SECTION: string,            // 任务区标题
  CLOSED_SECTION: string,          // 已完成任务区标题
  TAG_SEPARATOR: string,           // 标签分隔符
  // ... 更多配置项见 plugin-configs
}

storageAdapter: { getItem, setItem }  // 轻量键值存储适配器
```

## 数据流伪代码 (@skill-flow) <!-- @sync -->

```text
onload()
  → loadData() + 合并设置到 CONFIG
  → 创建 storageAdapter
  → registerView(17x):
    - NavigatorView (navigator)
    - ImportantTaskView (important)
    - RecurringTaskView (recurring)
    - TodayTaskView (today)
    - FutureNTaskView (futuren)
    - FutureAllTaskView (futureall)
    - OverdueTaskView (overdue)
    - DependsTaskView (depends)
    - TagTaskView (tag)
    - InboxTaskView (inbox)
    - OrganizeTaskView (organize)
    - TimelineTaskView (timeline)
    - TableTaskView (table)
    - TreeTaskView (tree)
    - CalendarTaskView (calendar)
    - GanttTaskView (gantt)
    - PomodoroTaskView (pomodoro)
  → addCommand(15x): 各命令调用 activateView
  → addRibbonIcon(): compass 图标 → 打开导航中心
  → addSettingTab(): TaskDataViewSettingTab
```

## 关键条件 @skill-condition <!-- @sync -->

- 视图复用: 若视图已存在对应叶节点 → 直接复用并聚焦
- 视图新建: 若不存在 → 创建新叶节点并设置视图状态
- 配置合并: 用户设置通过 Object.assign 合并到 DEFAULT_SETTINGS 再写到 CONFIG
- saveSettings 同时更新 Plugin 持久化存储和全局 CONFIG 对象
- 命令 ID 一旦发布不可变更

## 依赖 <!-- @sync -->

- `obsidian`: Plugin, PluginSettingTab, Setting
- `configs/plugin-configs`: CONFIG, DEFAULT_SETTINGS
- `panel/panel`: NavigatorView, VIEW_TYPE_NAVIGATOR
- 所有 views 子模块及其 VIEW*TYPE*\* 常量
- `utils/logger`: logger

## 测试要点 <!-- @manual -->

- 验证 onload 中 17 个视图正确注册
- 验证 activateView 复用/新建叶节点的逻辑
- 验证 saveSettings 同步更新 CONFIG 和持久化
- 验证设置标签页各字段读写正确
- 验证 storageAdapter getItem/setItem 的键值存储正确性

## 修改指南 <!-- @auto-record -->

- 2026-05-09: v4.0 从源码注释中提取完整定义
