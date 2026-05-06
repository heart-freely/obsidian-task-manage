
---

## 4. `.cline/skills/code/views/pomodoro-task-view.md`（番茄钟视图）

```markdown
---
name: 番茄钟视图开发
description: 开发或修改番茄钟计时器视图
skill-version: 3.1
triggers:
  - 修改番茄钟视图
  - 调整计时逻辑
---

# 番茄钟视图 Skill

## 文件 <!-- @sync -->
`src/panel/views/pomodoro-task-view.js`

## 导出 <!-- @sync -->
- `PomodoroTaskView`
- `VIEW_TYPE_POMODORO`

## 关联文件 <!-- @sync -->
- 源码：`src/panel/views/pomodoro-task-view.js`
- Skill：`.cline/skills/code/views/pomodoro-task-view.md`

## 功能 <!-- @manual -->
- 简单番茄钟计时器，关联任务ID
- 25分钟工作，5分钟休息
- 不持久化，内存计数

## 实现方式 <!-- @sync -->
- 使用 `setInterval` 计时，UI 显示倒计时（MM:SS）
- 任务关联通过参数传入（如 URL 参数或外部调用）

## 核心函数 (@skill-sig) <!-- @sync -->
- `startTimer(durationSeconds: number): void` - 开始计时
- `pauseTimer(): void` - 暂停计时
- `resetTimer(): void` - 重置为默认工作长度（25分钟）
- `setTaskContext(taskId: string): void` - 关联当前任务ID

## DOM 结构 (@skill-dom) <!-- @sync -->
```html
<div class="pomodoro-view">
  <div class="timer-display">25:00</div>
  <div class="task-info">当前任务: [任务标题]</div>
  <div class="controls">
    <button class="start">开始</button>
    <button class="pause">暂停</button>
    <button class="reset">重置</button>
  </div>
</div>
状态模型 (@skill-state) <!-- @sync -->
js

state = {
  currentTaskId: string | null,
  remainingSeconds: number,   // 当前剩余秒数
  isRunning: boolean,
  timerId: number | null
}

事件流 (@skill-flow) <!-- @sync -->

    页面加载 → 初始化显示 25:00

    点击开始 → 清除已有 interval → 设置新的 interval（每秒更新剩余秒数）→ 剩余秒数-1，更新显示 → 归零时触发完成（可播放声音，切换到休息周期）

    点击暂停 → 清除 interval，设置 isRunning = false

    点击重置 → 清除 interval，重置剩余秒数为 25*60，显示 25:00

数据流伪代码 <!-- @sync -->
text

控件事件触发对应方法
start: 若已暂停则继续，否则开始倒计时
每次 tick: remainingSeconds--，更新显示，若<=0则停止并发出完成事件
reset: 停止计时，设置 remainingSeconds = 25*60，更新显示

关键算法复杂度 (@skill-algorithm) <!-- @sync -->

    O(1) 所有操作，无复杂循环。

公共调用 <!-- @sync -->

    无（纯前端组件）

关键条件 (@skill-condition) <!-- @sync -->

    计时器精确到秒，使用 setInterval(fn, 1000)。

    组件卸载时需清除 interval 防止内存泄漏。

依赖 <!-- @sync -->

    无外部依赖（不依赖 Obsidian API 除视图容器外）

错误处理 <!-- @sync -->

    无任务关联时，显示“未选择任务”。

    计时器溢出处理：剩余秒数不小于0。

测试要点 <!-- @manual -->

    验证开始、暂停、重置功能。

    验证时间归零时触发回调（可添加声音提示）。

修改指南 <!-- @auto-record -->

    2026-05-06: 初始版本（基于 v3.1 格式规范化）

text


