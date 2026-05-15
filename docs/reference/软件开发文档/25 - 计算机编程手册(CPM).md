---
标准: GB/T 8567-2006
版本: 1.0.0
生成时间: 2026-05-15
文档名称: 25 - 计算机编程手册 (CPM)
项目名称: Obsidian 任务管理插件
'@ai-rewrite': preserve
'@ai-merge': append
'@ai-human-sections':
  - "# 编程环境"
  - "# 编程信息"
---

说明

1. 《计算机编程手册》(CPM)提供了一个程序员理解如何在给定的计算机上编程所需的信息。本手册专注于计算机本身，而不是运行于计算机上的特定软件。
2. CPM主要针对新开发的计算机、特定用途的计算机、其他不能利用商用的或其他编程手册的计算机。

---

# 引言

## 标识

本文档适用于 Obsidian 任务管理插件，标识号为 obsidian-task-manage，版本 1.0.0。

## 计算机系统概述

本项目的开发和调试在 Docker 容器中进行，基于 Node.js v20 环境。目标运行平台为 Obsidian Windows 桌面版，依赖 Dataview、Tasks 社区插件。

## 文档概述

本文档为开发者提供本项目的完整编程指南，包括环境搭建、编译流程、测试方法、运行环境配置和编程规范。

# 引用文件

- 《软件(结构)设计说明》(SDD)
- 《接口设计说明》(IDD)

# 编程环境

## 环境准备

通过 Docker 将项目目录映射进 Node 容器：

```powershell
docker run -it --rm -v ${PWD}:/workspace -w /workspace node:20-slim bash
```

## 编译

手动编译：

```bash
npm run build
```

监听模式（保持窗口不关闭，Docker 实时监听文件变化并自动编译）：
```bash
npm run dev
```

退出容器：

```bash
exit
```

## 测试

单元测试：

```bash
npm test
```

代码质量检查：

（使用预配置的 ESLint，包含针对 Obsidian 的 [eslint-plugin-obsidianmd](https://github.com/obsidianmd/eslint-plugin)）

```bash
npm run lint
```
GitHub Action 已配置，每次提交会自动进行代码检查。

重载插件：

在 Obsidian 中按 `Ctrl/Cmd + P`，输入“重载插件”，使修改生效。

## 运行环境

目标运行环境为 Obsidian 笔记软件，依赖以下社区插件提供基础能力：

- Dataview：提供结构化数据查询和索引能力。
- Tasks：提供任务标记的基础解析和状态管理能力。

插件代码需确保在 Obsidian Dataview 环境中稳定运行。语法层面以 ES5 为主，谨慎使用 ES6 语法；经过充分验证的现有 ES6 代码可保持不变，新增代码优先使用 ES5 兼容写法。

```yaml
环境:
  编译器: TypeScript → esbuild
  工具:
    - Node.js v20
    - Docker
    - Jest
    - ESLint + eslint-plugin-obsidianmd
    - Obsidian Plugin API
  设置:
    - LANG: C.UTF-8
    - LC_ALL: C.UTF-8
    - NODE_ENV: production
```

# 编程信息

## 语法标准

插件代码以 ES5 语法为主，谨慎使用 ES6 语法。经过充分验证的 ES6 代码可保持不变，新增代码优先使用 ES5 兼容写法。

```yaml
指令:
  助记符: ADD_VIEW
  格式: 创建文件 → 注册 → 添加分支 → 添加按钮
  操作: 添加一个新的任务视图到系统
  周期: 4步

指令:
  助记符: BUILD
  格式: npm run build
  操作: 编译 TypeScript 为单文件插件
  周期: 1

指令:
  助记符: LINT
  格式: npm run lint
  操作: 运行 ESLint 检查代码风格和 Obsidian API 规范
  周期: 1
```

项目采用统一的命名约定，确保代码风格一致。

| 元素         | 规则                       | 示例                        |
| ------------ | -------------------------- | --------------------------- |
| 文件名       | kebab-case                 | `base-task-view.js`         |
| 视图类型常量 | `VIEW_TYPE_` + UPPER_SNAKE | `VIEW_TYPE_CALENDAR`        |
| 类名         | PascalCase                 | `BaseTaskView`              |
| 函数/变量    | camelCase                  | `getAllTasks`               |
| CSS 类名     | kebab-case，视图前缀       | `.task-list`, `.cal-header` |

```yaml
命名规范:
  文件名: kebab-case
  视图类型常量: VIEW_TYPE_ + UPPER_SNAKE
  类名: PascalCase
  函数名: camelCase
  CSS类名: kebab-case，视图前缀

代码风格:
  缩进: 2空格
  引号: 单引号
  分号: 必须
  尾逗号: 始终
```

# 注解

（无）

# 附录

[JavaScript元数据格式规范](./JavaScript元数据格式规范.md)
