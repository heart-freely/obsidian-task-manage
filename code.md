# Micro Codebase Export

## Project Statistics

- Total files: 64

## Folder Structure

```
src
  commands
    index.ts
  configs
    plugin-configs.ts
  main.ts
  settings.ts
  store
    preset-manager.ts
    store.ts
  tasks
    process
      calcul-chart-process.ts
      common-process.ts
      filter-task-process.ts
      inbox-task-process.ts
      kanban-task-process.ts
      matrix-task-process.ts
      organize-task-process.ts
      recurring-task-process.ts
      task-query-process.ts
      tree-task-process.ts
    read
      read-tasks.ts
    write
      write-tasks.ts
  types.ts
  ui
    bars
      business-filter-bar.ts
      sort-bar.ts
      view-style-bar.ts
    components
      boards
        kanban.ts
        matrix.ts
      calendar
        day.ts
        month.ts
        quarter.ts
        task-calendar.ts
        week.ts
        year.ts
      cards
        task-card.ts
      charts
        chart-interact.ts
        detail.ts
        echarts.ts
        statistics.ts
      editors
        bulk-edit.ts
        single-edit.ts
      filters
        date-filter.ts
        mark-filter.ts
        status-filter.ts
      gantt
        gantt.ts
      lists
        task-list.ts
        task-tree.ts
      tables
        task-table.ts
      timeline
        task-timeline.ts
      tooltip
        tooltip.ts
    layout
      navigator-layout-impl.ts
      navigator-layout.ts
    panels
      filter-bar.ts
      side-bar.ts
      view-container.ts
    views
      all-tasks-view.ts
      base-view.ts
      depends-view.ts
      future-view.ts
      important-view.ts
      inbox-view.ts
      organize-view.ts
      overdue-view.ts
      recurring-view.ts
      table-view.ts
      tag-view.ts
      today-view.ts
  utils
    logger.ts

```

### src\commands\index.ts

```ts
// PATH: src\commands\index.ts [TYPESCRIPT]
// DEPS: obsidian, ../store/store

EXPORT [F:1]

F+ registerAllCommands(plugin:Plugin, store:Store) {
  // Function registerAllCommands
  ...}

```

### src\configs\plugin-configs.ts

```ts
// PATH: src\configs\plugin-configs.ts [TYPESCRIPT]
// DESC: src/configs/plugin-configs.js


```

### src\main.ts

```ts
// PATH: src\main.ts [TYPESCRIPT]
// DEPS: obsidian, ./commands, ./settings, ./store/store, ./types

EXPORT [C:1]

C+ TaskManagePlugin extends Plugin {
  // Class TaskManagePlugin
  F+ onload {
  // Method onload
  [FLOW: async-await]
  ...}
  F+ activateView(viewType:string) {
  // Method activateView
  [FLOW: async-await]
  ...}
}
PATTERNS:
- Async/Promise pattern
- Inheritance pattern

```

### src\settings.ts

```ts
// PATH: src\settings.ts [TYPESCRIPT]
// DEPS: obsidian

EXPORT [C:1, I:1]

I+ TaskManageSettings {
  // Interface TaskManageSettings
  ...}
C+ TaskManageSettingTab extends PluginSettingTab {
  // Class TaskManageSettingTab
  V+ plugin:any {
  // Property plugin
  ...}
  F+ super(app, plugin) {
  // Method super
  ...}
  F+ display {
  // Method display
  ...}
}
PATTERNS:
- Inheritance pattern

```

### src\store\preset-manager.ts

```ts
// PATH: src\store\preset-manager.ts [TYPESCRIPT]
// DESC: src/store/preset-manager.ts 添加方案
// DEPS: ../types, ./store

EXPORT [F:4]

F+ addPreset(store:Store, preset:Omit<Preset, "id"> & { id?:string }) {
  // Function addPreset
  ...}
F+ removePreset(store:Store, presetId:string) {
  // Function removePreset
  ...}
F+ updatePreset(store:Store, presetId:string, changes:Partial<Preset>) {
  // Function updatePreset
  ...}
F+ activatePreset(store:Store, presetId:string) {
  // Function activatePreset
  ...}
F- generateId {
  // Function generateId
  ...}
PATTERNS:
- Factory pattern

```

### src\store\store.ts

```ts
// PATH: src\store\store.ts [TYPESCRIPT]
// DEPS: ../types

EXPORT [C:1]

C+ Store {
  // Class Store
  V- state:AppState {
  // Property state
  ...}
  V- listeners:Listener[] {
  // Property listeners
  ...}
  F+ getState {
  // Method getState
  ...}
  F+ update(partial:Partial<AppState>) {
  // Method update
  ...}
  F+ subscribe(listener:Listener):() => void {
  // Method subscribe
  ...}
  F- notify {
  // Method notify
  ...}
  F- save {
  // Method save
  [FLOW: error-handling→async-await]
  ...}
  F+ setSaveFn(fn:(data) {
  // Method setSaveFn
  ...}
  F+ getActivePreset {
  // Method getActivePreset
  ...}
}
PATTERNS:
- Async/Promise pattern

```

### src\tasks\process\calcul-chart-process.ts

```ts
// PATH: src\tasks\process\calcul-chart-process.ts [TYPESCRIPT]
// DESC: src/tasks/process/calcul-chart-process.js 图表数据计算及任务计算（纯函数） ========== 原 calcul-echarts 计算 ==========
// DEPS: ../../configs/plugin-configs

EXPORT [F:5]

F+ computeTotalSpanDays(tasks, fieldStart, fieldEnd) {
  // Function computeTotalSpanDays
  [FLOW: iteration]
  ...}
F+ calcPlannedDuration(tasks) {
  // Function calcPlannedDuration
  [FLOW: iteration]
  ...}
F+ calcActualDuration(tasks) {
  // Function calcActualDuration
  [FLOW: iteration]
  ...}
F+ calcTotalSpanHours(tasks, fieldStart, fieldEnd) {
  // Function calcTotalSpanHours
  ...}
F+ prepareDailyStatusStack(tasks, dateRange, formatDate, setStart, setEnd) {
  // Function prepareDailyStatusStack
  [FLOW: conditional]
  ...}
F- keyOf(d) {
  // Function keyOf
  [FLOW: iteration]
  ...}
F- initDay {
  // Function initDay
  ...}
PATTERNS:
- Factory pattern

```

### src\tasks\process\common-process.ts

```ts
// PATH: src\tasks\process\common-process.ts [TYPESCRIPT]
// DESC: src/common.js 纯工具函数，不依赖 Obsidian 或 Dataview * 日期工具集

EXPORT [F:2]

F+ throttleByFrame(fn) {
  // Function throttleByFrame
  ...}
F+ createEl(tag, textOrOpts, opts) {
  // Function createEl
  [FLOW: conditional]
  ...}
PATTERNS:
- Factory pattern

```

### src\tasks\process\filter-task-process.ts

```ts
// PATH: src\tasks\process\filter-task-process.ts [TYPESCRIPT]
// DEPS: ../../types

EXPORT [F:1]

F+ filterTasks(tasks:any[], filter:GlobalFilter):any[] {
  // Function filterTasks
  ...}

```

### src\tasks\process\inbox-task-process.ts

```ts
// PATH: src\tasks\process\inbox-task-process.ts [TYPESCRIPT]
// DESC: src/tasks/process/inbox-task-process.js
// DEPS: ../../configs/plugin-configs

EXPORT [F:1]

F- fetchInboxTasks(app) {
  // Function fetchInboxTasks
  ...}
F+ processInboxTasks(allTasks) {
  // Function processInboxTasks
  [FLOW: conditional]
  ...}
PATTERNS:
- Async/Promise pattern
- Factory pattern

```

### src\tasks\process\kanban-task-process.ts

```ts
// PATH: src\tasks\process\kanban-task-process.ts [TYPESCRIPT]
// DESC: src/tasks/process/kanban-task-process.js

EXPORT [F:1]

F- fetchKanbanTasks(app) {
  // Function fetchKanbanTasks
  ...}
F+ processKanbanTasks(allTasks) {
  // Function processKanbanTasks
  [FLOW: iteration]
  ...}
PATTERNS:
- Async/Promise pattern
- Factory pattern

```

### src\tasks\process\matrix-task-process.ts

```ts
// PATH: src\tasks\process\matrix-task-process.ts [TYPESCRIPT]
// DESC: src/tasks/process/matrix-task-process.js

EXPORT [F:3]

F- formatDate(date) {
  // Function formatDate
  [FLOW: iteration]
  ...}
F+ fetchRawTasks(app) {
  // Function fetchRawTasks
  ...}
F+ processTasks(allTasks, hideRecurring = false) {
  // Function processTasks
  [FLOW: iteration]
  ...}
F+ sortTasks(tasks, sortConfig) {
  // Function sortTasks
  ...}
PATTERNS:
- Async/Promise pattern
- Factory pattern

```

### src\tasks\process\organize-task-process.ts

```ts
// PATH: src\tasks\process\organize-task-process.ts [TYPESCRIPT]
// DESC: src/tasks/process/organize-task-process.js
// DEPS: ../read/read-tasks

EXPORT [F:6]

F+ isIncomplete(s) {
  // Function isIncomplete
  ...}
F+ isCompleted(s) {
  // Function isCompleted
  ...}
F+ hasEssentialTags(t) {
  // Function hasEssentialTags
  ...}
F- replaceMark(line, regex, newMark) {
  // Function replaceMark
  ...}
F+ loadSnapshots {
  // Function loadSnapshots
  [FLOW: try-catch]
  ...}
F+ saveSnapshots(snapshots) {
  // Function saveSnapshots
  [FLOW: try-catch]
  ...}
F+ addSnapshot(snapshots, map) {
  // Function addSnapshot
  ...}
F- writeToFiles(app, tasks, taskIds, linesMap) {
  // Function writeToFiles
  [FLOW: iteration]
  ...}
PATTERNS:
- Async/Promise pattern
- Factory pattern

```

### src\tasks\process\recurring-task-process.ts

```ts
// PATH: src\tasks\process\recurring-task-process.ts [TYPESCRIPT]
// DESC: src/tasks/process/recurring-task-process.js

F- fetchRecurringTasksGrouped(app) {
  // Function fetchRecurringTasksGrouped
  [FLOW: conditional]
  ...}
PATTERNS:
- Async/Promise pattern
- Factory pattern

```

### src\tasks\process\task-query-process.ts

```ts
// PATH: src\tasks\process\task-query-process.ts [TYPESCRIPT]
// DESC: src/tasks/process/task-query-process.js
// DEPS: ../../configs/plugin-configs, ../../tasks/read/read-tasks

F- baseQuery(extra = '') {
  // Function baseQuery
  ...}
F- fetchTasks(app, extraQuery = '') {
  // Function fetchTasks
  ...}
F- fetchImportantTasks(app) {
  // Function fetchImportantTasks
  ...}
F- fetchRecurringTasks(app) {
  // Function fetchRecurringTasks
  ...}
F- fetchTodayTasks(app) {
  // Function fetchTodayTasks
  [FLOW: iteration]
  ...}
F- fetchFutureTasks(app, days = 15) {
  // Function fetchFutureTasks
  ...}
F- fetchOverdueTasks(app) {
  // Function fetchOverdueTasks
  [FLOW: iteration]
  ...}
F- fetchDependsTasks(app) {
  // Function fetchDependsTasks
  ...}
F- fetchTagTasks(app, tag) {
  // Function fetchTagTasks
  [FLOW: conditional]
  ...}
F- fetchTodayTasksGrouped(app) {
  // Function fetchTodayTasksGrouped
  [FLOW: iteration]
  ...}
F- fetchImportantTasksByStatus(app) {
  // Function fetchImportantTasksByStatus
  [FLOW: iteration]
  ...}
PATTERNS:
- Async/Promise pattern
- Factory pattern

```

### src\tasks\process\tree-task-process.ts

```ts
// PATH: src\tasks\process\tree-task-process.ts [TYPESCRIPT]


```

### src\tasks\read\read-tasks.ts

```ts
// PATH: src\tasks\read\read-tasks.ts [TYPESCRIPT]
// DESC: src/tasks/read/read-tasks.js
// DEPS: ../../utils/logger, ../../configs/plugin-configs, ../process/common-process

EXPORT [F:6]

F+ getTaskStatus(line) {
  // Function getTaskStatus
  ...}
F+ getStatusIcon(task) {
  // Function getStatusIcon
  ...}
F+ isTaskToday(task) {
  // Function isTaskToday
  ...}
F+ computeTaskTimeRange(task) {
  // Function computeTaskTimeRange
  ...}
F+ ensureTaskProperties(task) {
  // Function ensureTaskProperties
  [FLOW: iteration]
  ...}
F+ getAllTasks(force, dv, state) {
  // Function getAllTasks
  [FLOW: try-catch]
  ...}
F- m(rx, idx) {
  // Function m
  ...}
PATTERNS:
- Factory pattern

```

### src\tasks\write\write-tasks.ts

```ts
// PATH: src\tasks\write\write-tasks.ts [TYPESCRIPT]


```

### src\types.ts

```ts
// PATH: src\types.ts [TYPESCRIPT]
// DESC: src/types.ts * 任务统一结构（由 read-tasks 解析生成）

EXPORT [I:5]

I+ TaskItem {
  // Interface TaskItem
  ...}
I+ GlobalFilter {
  // Interface GlobalFilter
  ...}
I+ Preset {
  // Interface Preset
  ...}
I+ PresetGroup {
  // Interface PresetGroup
  ...}
I+ AppState {
  // Interface AppState
  ...}

```

### src\ui\bars\business-filter-bar.ts

```ts
// PATH: src\ui\bars\business-filter-bar.ts [TYPESCRIPT]


```

### src\ui\bars\sort-bar.ts

```ts
// PATH: src\ui\bars\sort-bar.ts [TYPESCRIPT]
// DEPS: ../../store/store

EXPORT [F:1]

F+ renderSortBar(container:HTMLElement, store:Store) {
  // Function renderSortBar
  [FLOW: iteration]
  ...}
PATTERNS:
- Factory pattern

```

### src\ui\bars\view-style-bar.ts

```ts
// PATH: src\ui\bars\view-style-bar.ts [TYPESCRIPT]
// DEPS: ../../store/store

EXPORT [F:1]

F+ renderViewStyleBar(container:HTMLElement, store:Store) {
  // Function renderViewStyleBar
  [FLOW: iteration]
  ...}
PATTERNS:
- Factory pattern

```

### src\ui\components\boards\kanban.ts

```ts
// PATH: src\ui\components\boards\kanban.ts [TYPESCRIPT]
// DEPS: ../../../configs/plugin-configs

EXPORT [F:1]

F+ renderKanban(container:HTMLElement, tasks:any[]) {
  // Function renderKanban
  [FLOW: conditional]
  ...}
PATTERNS:
- Observer pattern for events

```

### src\ui\components\boards\matrix.ts

```ts
// PATH: src\ui\components\boards\matrix.ts [TYPESCRIPT]
// DEPS: ../../../configs/plugin-configs

EXPORT [F:1]

F+ renderMatrix(container:HTMLElement, tasks:any[]) {
  // Function renderMatrix
  [FLOW: conditional]
  ...}
PATTERNS:
- Observer pattern for events

```

### src\ui\components\calendar\day.ts

```ts
// PATH: src\ui\components\calendar\day.ts [TYPESCRIPT]
// DEPS: ../../../tasks/process/common-process

EXPORT [F:1]

F+ renderCalendarDay(container:HTMLElement, tasks:any[], options?:{ onClick?) {
  // Function renderCalendarDay
  ...}
F- getDatesForTask(task:any, intervalMode:string):string[] {
  // Function getDatesForTask
  [FLOW: conditional]
  ...}
PATTERNS:
- Observer pattern for events
- Factory pattern

```

### src\ui\components\calendar\month.ts

```ts
// PATH: src\ui\components\calendar\month.ts [TYPESCRIPT]
// DEPS: ../../../tasks/process/common-process

EXPORT [F:1]

F+ renderCalendarMonth(container:HTMLElement, tasks:any[], options?:{ onClick?) {
  // Function renderCalendarMonth
  ...}
F- isTaskInDate(task:any, date:Date, intervalMode:string):boolean {
  // Function isTaskInDate
  ...}
PATTERNS:
- Observer pattern for events
- Factory pattern

```

### src\ui\components\calendar\quarter.ts

```ts
// PATH: src\ui\components\calendar\quarter.ts [TYPESCRIPT]
// DEPS: ../../../tasks/process/common-process

EXPORT [F:1]

F+ renderCalendarQuarter(container:HTMLElement, tasks:any[], options?:{ onClick?) {
  // Function renderCalendarQuarter
  ...}
F- renderMiniMonth(container:HTMLElement, year:number, month:number, tasks:any[], options?:any) {
  // Function renderMiniMonth
  [FLOW: iteration]
  ...}
F- isTaskInDate(task:any, date:Date, intervalMode:string):boolean {
  // Function isTaskInDate
  ...}
PATTERNS:
- Factory pattern

```

### src\ui\components\calendar\task-calendar.ts

```ts
// PATH: src\ui\components\calendar\task-calendar.ts [TYPESCRIPT]
// DEPS: ../../../tasks/process/common-process

EXPORT [F:1]

F+ renderCalendar(container:HTMLElement, tasks:any[]) {
  // Function renderCalendar
  [FLOW: iteration]
  ...}

```

### src\ui\components\calendar\week.ts

```ts
// PATH: src\ui\components\calendar\week.ts [TYPESCRIPT]
// DEPS: ../../../tasks/process/common-process

EXPORT [F:1]

F+ renderCalendarWeek(container:HTMLElement, tasks:any[], options?:{ onClick?) {
  // Function renderCalendarWeek
  ...}
F- isTaskInDate(task:any, date:Date, intervalMode:string):boolean {
  // Function isTaskInDate
  ...}
F- getRelevantDates(tasks:any[], intervalMode:string):Date[] {
  // Function getRelevantDates
  [FLOW: iteration]
  ...}
PATTERNS:
- Observer pattern for events
- Factory pattern

```

### src\ui\components\calendar\year.ts

```ts
// PATH: src\ui\components\calendar\year.ts [TYPESCRIPT]
// DEPS: ../../../tasks/process/common-process

EXPORT [F:1]

F+ renderCalendarYear(container:HTMLElement, tasks:any[], options?:{ onClick?) {
  // Function renderCalendarYear
  ...}
F- isTaskInDate(task:any, date:Date, intervalMode:string):boolean {
  // Function isTaskInDate
  ...}
PATTERNS:
- Factory pattern

```

### src\ui\components\cards\task-card.ts

```ts
// PATH: src\ui\components\cards\task-card.ts [TYPESCRIPT]
// DEPS: ../../../configs/plugin-configs

EXPORT [F:1]

F+ createTaskCard(task:any):HTMLElement {
  // Function createTaskCard
  ...}
PATTERNS:
- Observer pattern for events

```

### src\ui\components\charts\chart-interact.ts

```ts
// PATH: src\ui\components\charts\chart-interact.ts [TYPESCRIPT]


```

### src\ui\components\charts\detail.ts

```ts
// PATH: src\ui\components\charts\detail.ts [TYPESCRIPT]
// DEPS: ./echarts, ../../../configs/plugin-configs, ../../../tasks/process/common-process

EXPORT [F:1]

F+ renderDetail(container:HTMLElement, tasks:any[]) {
  // Function renderDetail
  [FLOW: iteration]
  ...}

```

### src\ui\components\charts\echarts.ts

```ts
// PATH: src\ui\components\charts\echarts.ts [TYPESCRIPT]
// DESC: src/echarts/echarts-utils.js 直接导入打包的 ECharts，无需动态加载 确保全局可用（兼容旧代码中 window.echarts 引用）
// DEPS: echarts

EXPORT [F:1]

F+ ensureEcharts(callback) {
  // Function ensureEcharts
  ...}

```

### src\ui\components\charts\statistics.ts

```ts
// PATH: src\ui\components\charts\statistics.ts [TYPESCRIPT]
// DEPS: ../../../configs/plugin-configs, ./echarts

EXPORT [F:1]

F+ renderStatistics(container:HTMLElement, tasks:any[]) {
  // Function renderStatistics
  [FLOW: iteration]
  ...}
F- makePieChart(title:string, data:{ name) {
  // Function makePieChart
  ...}

```

### src\ui\components\editors\bulk-edit.ts

```ts
// PATH: src\ui\components\editors\bulk-edit.ts [TYPESCRIPT]


```

### src\ui\components\editors\single-edit.ts

```ts
// PATH: src\ui\components\editors\single-edit.ts [TYPESCRIPT]


```

### src\ui\components\filters\date-filter.ts

```ts
// PATH: src\ui\components\filters\date-filter.ts [TYPESCRIPT]


```

### src\ui\components\filters\mark-filter.ts

```ts
// PATH: src\ui\components\filters\mark-filter.ts [TYPESCRIPT]


```

### src\ui\components\filters\status-filter.ts

```ts
// PATH: src\ui\components\filters\status-filter.ts [TYPESCRIPT]


```

### src\ui\components\gantt\gantt.ts

```ts
// PATH: src\ui\components\gantt\gantt.ts [TYPESCRIPT]

EXPORT [F:1]

F+ renderGantt(container:HTMLElement, tasks:any[]) {
  // Function renderGantt
  [FLOW: iteration]
  ...}
PATTERNS:
- Factory pattern

```

### src\ui\components\lists\task-list.ts

```ts
// PATH: src\ui\components\lists\task-list.ts [TYPESCRIPT]
// DESC: src/ui/components/lists/task-list.ts
// DEPS: ../cards/task-card

EXPORT [F:1]

I- TaskListOptions {
  // Interface TaskListOptions
  ...}
F+ renderTaskList(container:HTMLElement, tasks:any[], options:TaskListOptions = {}) {
  // Function renderTaskList
  ...}
PATTERNS:
- Observer pattern for events

```

### src\ui\components\lists\task-tree.ts

```ts
// PATH: src\ui\components\lists\task-tree.ts [TYPESCRIPT]
// DEPS: ../../../configs/plugin-configs

EXPORT [F:1]

F+ renderTaskTree(container:HTMLElement, tasks:any[], options?:{ hideFolders?) {
  // Function renderTaskTree
  ...}
PATTERNS:
- Observer pattern for events

```

### src\ui\components\tables\task-table.ts

```ts
// PATH: src\ui\components\tables\task-table.ts [TYPESCRIPT]

EXPORT [F:1]

I- TaskTableOptions {
  // Interface TaskTableOptions
  ...}
F+ renderTaskTable(container:HTMLElement, tasks:any[], options:TaskTableOptions = {}) {
  // Function renderTaskTable
  ...}
PATTERNS:
- Observer pattern for events

```

### src\ui\components\timeline\task-timeline.ts

```ts
// PATH: src\ui\components\timeline\task-timeline.ts [TYPESCRIPT]
// DEPS: ../../../configs/plugin-configs

EXPORT [F:1]

F+ renderTimeline(container:HTMLElement, tasks:any[]) {
  // Function renderTimeline
  [FLOW: iteration]
  ...}
PATTERNS:
- Observer pattern for events

```

### src\ui\components\tooltip\tooltip.ts

```ts
// PATH: src\ui\components\tooltip\tooltip.ts [TYPESCRIPT]


```

### src\ui\layout\navigator-layout-impl.ts

```ts
// PATH: src\ui\layout\navigator-layout-impl.ts [TYPESCRIPT]
// DEPS: ../../store/store, ../panels/filter-bar, ../panels/side-bar, ../panels/view-container

EXPORT [C:1]

C+ NavigatorLayout {
  // Class NavigatorLayout
  ...}

```

### src\ui\layout\navigator-layout.ts

```ts
// PATH: src\ui\layout\navigator-layout.ts [TYPESCRIPT]
// DEPS: obsidian, ../../store/store, ./navigator-layout-impl

EXPORT [C:1]

C+ NavigatorView extends ItemView {
  // Class NavigatorView
  V- store:Store {
  // Property store
  ...}
  F+ super(leaf) {
  // Method super
  ...}
  F+ getViewType {
  // Method getViewType
  ...}
  F+ getDisplayText {
  // Method getDisplayText
  ...}
  F+ getIcon {
  // Method getIcon
  ...}
  F+ onOpen {
  // Method onOpen
  [FLOW: async-await]
  ...}
  F+ onClose {
  // Method onClose
  [FLOW: async-await]
  ...}
}
PATTERNS:
- Factory pattern
- Inheritance pattern

```

### src\ui\panels\filter-bar.ts

```ts
// PATH: src\ui\panels\filter-bar.ts [TYPESCRIPT]
// DESC: src/ui/panels/filter-bar.ts
// DEPS: ../../configs/plugin-configs, ../../store/store, ../../tasks/process/common-process, ../../types

EXPORT [C:1]

C+ FilterBar {
  // Class FilterBar
  F- defaultFilter {
  // Method defaultFilter
  ...}
}
PATTERNS:
- Observer pattern for events
- Factory pattern

```

### src\ui\panels\side-bar.ts

```ts
// PATH: src\ui\panels\side-bar.ts [TYPESCRIPT]
// DEPS: ../../store/store, ../../types

EXPORT [C:1]

C+ SideBar {
  // Class SideBar
  V+ text:"➕ 新建方案", {
  // Property text
  ...}
  V+ cls:"side-btn", {
  // Property cls
  ...}
}
PATTERNS:
- Observer pattern for events

```

### src\ui\panels\view-container.ts

```ts
// PATH: src\ui\panels\view-container.ts [TYPESCRIPT]
// DEPS: ../../store/store, ../views/base-view

EXPORT [C:1]

C+ ViewContainer {
  // Class ViewContainer
  V- container:HTMLElement {
  // Property container
  ...}
  V- store:Store {
  // Property store
  ...}
  V- app:any {
  // Property app
  ...}
  V- currentView:BaseTaskView | null {
  // Property currentView
  ...}
  F+ refresh {
  // Method refresh
  [FLOW: async-await]
  ...}
}
PATTERNS:
- Observer pattern for events
- Async/Promise pattern
- Factory pattern

```

### src\ui\views\all-tasks-view.ts

```ts
// PATH: src\ui\views\all-tasks-view.ts [TYPESCRIPT]
// DEPS: ../../tasks/process/filter-task-process, ../../tasks/read/read-tasks, ../../types, ../bars/sort-bar, ../bars/view-style-bar

EXPORT [C:1]

C+ AllTasksView extends BaseTaskView {
  // Class AllTasksView
  F+ render {
  // Method render
  [FLOW: error-handling→async-await]
  ...}
  F- openTask(task:any) {
  // Method openTask
  ...}
  F- applySort(tasks:any[], sort:{ type) {
  // Method applySort
  ...}
  F- getDefaultFilter {
  // Method getDefaultFilter
  ...}
}
PATTERNS:
- Inheritance pattern

```

### src\ui\views\base-view.ts

```ts
// PATH: src\ui\views\base-view.ts [TYPESCRIPT]
// DEPS: ../../store/store

C- BaseTaskView {
  // Class BaseTaskView
  V# container:HTMLElement {
  // Property container
  ...}
  V# store:Store {
  // Property store
  ...}
  V# app:any {
  // Property app
  ...}
  F+ destroy {
  // Method destroy
  ...}
}
PATTERNS:
- Observer pattern for events
- Async/Promise pattern

```

### src\ui\views\depends-view.ts

```ts
// PATH: src\ui\views\depends-view.ts [TYPESCRIPT]


```

### src\ui\views\future-view.ts

```ts
// PATH: src\ui\views\future-view.ts [TYPESCRIPT]


```

### src\ui\views\important-view.ts

```ts
// PATH: src\ui\views\important-view.ts [TYPESCRIPT]


```

### src\ui\views\inbox-view.ts

```ts
// PATH: src\ui\views\inbox-view.ts [TYPESCRIPT]


```

### src\ui\views\organize-view.ts

```ts
// PATH: src\ui\views\organize-view.ts [TYPESCRIPT]


```

### src\ui\views\overdue-view.ts

```ts
// PATH: src\ui\views\overdue-view.ts [TYPESCRIPT]


```

### src\ui\views\recurring-view.ts

```ts
// PATH: src\ui\views\recurring-view.ts [TYPESCRIPT]


```

### src\ui\views\table-view.ts

```ts
// PATH: src\ui\views\table-view.ts [TYPESCRIPT]


```

### src\ui\views\tag-view.ts

```ts
// PATH: src\ui\views\tag-view.ts [TYPESCRIPT]


```

### src\ui\views\today-view.ts

```ts
// PATH: src\ui\views\today-view.ts [TYPESCRIPT]
// DEPS: ../../tasks/process/filter-task-process, ../../tasks/process/task-query-process, ../../types, ../components/lists/task-list, ./base-view

EXPORT [C:1]

C+ TodayView extends BaseTaskView {
  // Class TodayView
  F+ render {
  // Method render
  [FLOW: error-handling→async-await]
  ...}
}
PATTERNS:
- Async/Promise pattern
- Inheritance pattern

```

### src\utils\logger.ts

```ts
// PATH: src\utils\logger.ts [TYPESCRIPT]
// DESC: src/utils/logger.js 简易日志工具，生产模式下仅输出错误


```
