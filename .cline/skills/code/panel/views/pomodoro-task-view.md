---
name: 番茄钟视图开发
description: 简单番茄钟计时器，关联任务 ID
skill-version: 4.0
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
- Skill：`.cline/skills/code/panel/views/pomodoro-task-view.md`

## 功能 <!-- @manual -->
- 25分钟工作，5分钟休息
- 内存计数，不持久化
- 可关联任务 ID

## 实现方式 <!-- @sync -->
- `setInterval` 倒计时

## 核心函数 (@skill-sig) <!-- @sync -->
- `startTimer(durationSeconds): void`
- `pauseTimer(): void`
- `resetTimer(): void`
- `setTaskContext(taskId): void`

## DOM 结构 <!-- @sync -->
```html
<div class="pomodoro-view">
  <div class="timer-display">25:00</div>
  <div class="task-info">当前任务: ...</div>
  <div class="controls"><button>开始</button><button>暂停</button><button>重置</button></div>
</div>
```

## 状态模型 <!-- @sync -->

```
{ currentTaskId, remainingSeconds, isRunning, timerId }
```

## 事件流 <!-- @sync -->

- 开始 → 设置 interval
- 暂停 → 清除 interval
- 重置 → 重置为 25:00

## 关键算法复杂度 <!-- @sync -->

O(1)

## 公共调用 <!-- @sync -->

无

## 依赖 <!-- @sync -->

无外部依赖

## 错误处理 <!-- @sync -->

- 无任务显示“未选择任务”

## 测试要点 <!-- @manual -->

- 验证计时归零触发回调

## 修改指南 <!-- @auto-record -->

- 2026-05-07: v4.0 初始化
