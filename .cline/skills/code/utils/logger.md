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

- `logger`（默认导出）- 日志对象，包含 `info` / `warn` / `error` / `debug` 四个方法
- 无命名导出

## 关联文件 <!-- @sync -->

- 源码：`src/utils/logger.js`
- Skill：`.cline/skills/code/utils/logger.md`

## 功能 <!-- @manual -->

- 分级日志（info/warn/error/debug）
- 生产模式静默 info 和 debug 级别
- 控制台输出，带 `[TASK-*]` 前缀

## 核心函数 (@skill-sig) <!-- @sync -->

- `logger.info(...args): void` - 输出信息日志，生产模式静默
- `logger.warn(...args): void` - 输出警告日志，始终输出
- `logger.error(...args): void` - 输出错误日志，始终输出
- `logger.debug(...args): void` - 输出调试日志，生产模式静默
- `isProduction: boolean` - 生产模式检测（检查 `process.env.NODE_ENV`）

## 依赖 <!-- @sync -->

- 无（纯工具函数）

## 错误处理 <!-- @sync -->

- 无显式错误处理
- `process.env.NODE_ENV` 检测尝试包裹在 try/catch 中，兼容无 `process` 对象的环境（如浏览器）
- 若 `NODE_ENV` 未定义或非 `"production"`，所有级别日志均输出
