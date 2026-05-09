---
name: 通用 Tooltip 管理器
description: 通用 Tooltip 管理器，支持显示/隐藏/定位/内容渲染
skill-version: 1.0
triggers:
    - 修改 Tooltip 逻辑
    - 添加 Tooltip 功能
---

# 通用 Tooltip 管理器 Skill

## 文件 <!-- @sync -->

`src/panel/interacts/tooltip-interact.js`

## 导出 <!-- @sync -->

- `TooltipManager`
- `showTooltip`
- `hideTooltip`

## 关联文件 <!-- @sync -->

- 源码：`src/panel/interacts/tooltip-interact.js`
- Skill：`.cline/skills/code/panel/interacts/tooltip-interact.md`

## 功能 <!-- @manual -->

- 通用 Tooltip 显示/隐藏/定位
- Tooltip 内容动态渲染

## 核心函数 (@skill-sig) <!-- @sync -->

- `TooltipManager.show(trigger: HTMLElement, content: string|HTMLElement): void` - 显示 Tooltip
- `TooltipManager.hide(): void` - 隐藏 Tooltip
- `TooltipManager.position(trigger: HTMLElement, tooltip: HTMLElement): void` - 定位 Tooltip

## 依赖 <!-- @sync -->

- 无外部依赖

## 错误处理 <!-- @sync -->

- 重复显示时自动隐藏前一个
