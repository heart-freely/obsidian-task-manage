---
name: 日志工具
description: 插件日志记录工具，用于调试和错误追踪
skill-version: 1.0
triggers:
    - 修改日志逻辑
    - 添加日志功能
---

# 日志工具 Skill

## 文件 <!-- @sync -->

`src/utils/logger.js`

## 导出 <!-- @sync -->

- `Logger`
- `logDebug`
- `logError`
- `logInfo`

## 关联文件 <!-- @sync -->

- 源码：`src/utils/logger.js`
- Skill：`.cline/skills/code/utils/logger.md`

## 功能 <!-- @manual -->

- 分级日志（debug/info/error）
- 日志级别控制
- 可选的控制台输出

## 核心函数 (@skill-sig) <!-- @sync -->

- `Logger` 类 - 日志记录器
- `logDebug(msg: string): void` - 调试日志
- `logError(msg: string): void` - 错误日志
- `logInfo(msg: string): void` - 信息日志

## 依赖 <!-- @sync -->

- 无（纯工具函数）

## 错误处理 <!-- @sync -->

- 日志级别低于阈值时静默忽略
