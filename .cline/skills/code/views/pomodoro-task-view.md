---
name: 番茄钟视图开发
description: 开发或修改番茄钟计时器视图
triggers:
  - 修改番茄钟视图
  - 调整计时逻辑
---

# 番茄钟视图 Skill

## 文件
`src/panel/views/pomodoro-task-view.js`

## 功能
- 简单番茄钟计时器，关联任务ID
- 25分钟工作，5分钟休息
- 不持久化，内存计数

## 实现方式
- `setInterval` 计时，UI 显示倒计时
- 任务关联通过参数传入

## 核心函数
- `startTimer(duration)`, `pauseTimer()`, `resetTimer()`

## DOM 结构
```html
<div class="pomodoro-view">
  <span class="timer-display">25:00</span>
  <button>开始</button><button>暂停</button><button>重置</button>
</div>
```

## 修改指南

    添加声音提醒

## AI 命令
生成或修改时：
- 纯前端计时器实现，不涉及文件读写。
- 使用 `setInterval`，任务关联通过参数传入。