---
标准: GB/T 8567-2006
版本: 1.0.0
生成时间: 2026-05-17
文档名称: 25 - 计算机编程手册 (CPM)
项目名称: Obsidian Task Manage
---

# 计算机编程手册（CPM）

## 说明

1. 本手册为《计算机编程手册》（CPM），依据 GB/T 8567-2006 编制。
2. 本手册描述在本项目所依赖的**计算平台**上编程所需的信息。该平台为 Obsidian 应用运行时环境（基于 Electron 框架，集成 Chromium 浏览器引擎与 Node.js 运行时）。
3. 本手册适用于需要理解该平台底层编程特征的程序员，包括指令集、内存模型、事件机制、输入/输出映射及编译工具链。

## 引言

### 标识

- 项目名称：Obsidian Task Manage
- 目标平台：Obsidian 应用程序（https://obsidian.md）
- 编程语言：TypeScript 5.x
- 入口点：`main.ts` → 编译输出 `main.js`
- 包管理器：npm

### 计算机系统概述

本插件运行于 **Obsidian 虚拟计算机**，其体系结构如下：

- **处理器**：JavaScript 引擎（V8），执行 ECMAScript 指令。
- **存储器**：
  - 主存：运行时 JavaScript 堆。
  - 外存：用户仓库文件系统（通过 `app.vault` API 访问）。
  - 配置存储：`loadData()` / `saveData()` 提供的 JSON 存储。
- **中断/事件系统**：Obsidian 生命周期钩子（`onload`、`onunload`）及工作区事件（`file-open`、`active-leaf-change` 等）。
- **输入/输出**：通过 Obsidian API 注册视图、命令、设置面板，与用户交互。

### 文档概述

本手册描述在该计算机上进行原生插件开发所需的编程信息，包括：

- 指令集（可调用的 API 操作码）
- 寄存器/内存模型（可访问的全局状态）
- 中断与事件处理机制
- 输入/输出地址映射
- 编译工具链与加载约定

### 引用文件

- Obsidian API 文档：https://docs.obsidian.md
- 官方类型定义：`obsidian` 包（@types/obsidian）
- 示例插件实现：https://github.com/obsidianmd/obsidian-sample-plugin

## 编程环境

### 基本构成

- **指令集**：Obsidian 公开的 API 方法，分类如下：

| 类别     | 操作码示例                 | 说明                                                         |
| :------- | :------------------------- | :----------------------------------------------------------- |
| 生命周期 | `onload()`, `onunload()`   | 插件加载/卸载时自动调用                                      |
| 命令     | `addCommand()`             | 注册全局命令，绑定回调                                       |
| 视图     | `registerView()`           | 注册自定义视图类型，提供 `getViewType()`、`getDisplayText()` |
| 设置     | `addSettingTab()`          | 添加设置页面                                                 |
| 事件     | `registerEvent()`          | 监听工作区、保险库事件                                       |
| 数据     | `loadData()`, `saveData()` | 读写插件配置数据                                             |
| 文件     | `app.vault.*`              | 仓库文件读写、创建、删除                                     |
| 工作区   | `app.workspace.*`          | 获取活动文件、叶子、布局操作                                 |

- **寄存器/内存模型**：

| 寄存器名         | 类型 | 访问方式             | 内容                                            |
| :--------------- | :--- | :------------------- | :---------------------------------------------- |
| `app`            | 全局 | `this.app`           | Obsidian 应用实例，提供保险库、工作区、元数据等 |
| `app.vault`      | 只读 | `this.app.vault`     | 仓库文件系统接口                                |
| `app.workspace`  | 只读 | `this.app.workspace` | 工作区状态与操作                                |
| `settings`       | 读写 | `this.settings`      | 插件私有设置（通过 `loadData()` 初始化）        |
| `plugin.dataDir` | 只读 | `this.manifest.dir`  | 插件目录路径                                    |

- **中断/事件处理机制**：
  - 生命周期中断：Obsidian 在插件加载、卸载、设置变更时自动触发相应方法。
  - 事件循环：通过 `registerEvent()` 订阅事件，事件触发时执行回调。所有注册的事件必须在 `onunload` 中（或使用 `registerEvent` 自动）清理。

- **输入/输出地址映射**：

| I/O 设备 | 映射 API                       | 说明                           |
| :------- | :----------------------------- | :----------------------------- |
| 用户命令 | `addCommand` → 命令面板/快捷键 | 将函数映射到用户可触发的操作   |
| 视图     | `registerView` → 侧边栏/主区域 | 将自定义视图组件映射到 UI 区域 |
| 设置面板 | `addSettingTab` → 设置窗口     | 将设置 UI 映射到插件专属标签页 |
| 通知     | `new Notice()`                 | 输出信息到通知栏               |
| 控制台   | `console.log`                  | 输出调试信息到开发者控制台     |

### 输入/输出格式

- **输入**：TypeScript 源码（`.ts`）。
- **输出**：`main.js`（ECMAScript 模块），Obsidian 通过 `require` 加载并执行。

### 数据格式

- **设置存储**：JSON 对象，由 `loadData()` / `saveData()` 序列化/反序列化。
- **自定义数据**：任何可 JSON 序列化的 JavaScript 值。

## 编程信息

### 编码

- 语言：TypeScript（严格模式 `"strict": true`）
- 字符集：UTF-8
- 缩进：2 空格
- 引号：单引号

### 编译

- 编译工具：esbuild（配置文件 `esbuild.config.mjs`）
- 开发命令：`npm run dev`（监视模式，增量编译）
- 生产命令：`npm run build`（一次性完整打包，输出 `main.js`）

### 调试

- 使用 Obsidian 开发者工具（`Ctrl/Cmd+Shift+I`）
- 通过 `console.log` 输出变量状态
- 可配置 VS Code 附加到 Obsidian 进程进行断点调试

### 测试

- 单元测试框架可选（Jest/Vitest），测试命令 `npm test`
- 集成测试：手动安装至测试库，验证交互

### 指令集（完整操作码列表）

参考 Obsidian API 文档：https://docs.obsidian.md/Reference/TypeScript+API

关键操作码示例（已在“基本构成”中列举）。所有操作码均通过 `this` 或 `this.app` 调用。

### 命名规范

- 文件名：kebab-case
- 类名：PascalCase
- 函数/变量：camelCase
- 常量：UPPER_SNAKE

### 编码惯例（平台相关）

- 必须使用 `this.registerEvent`、`this.registerInterval` 等方法注册需要清理的资源，防止内存泄漏。
- 如需访问 Node.js 或 Electron 专有 API（如 `fs`、`path`），必须设置 `isDesktopOnly: true`，并在代码前检查 `window.process` 是否存在。
- 所有异步操作优先使用 `async/await`，并捕获异常。

## 注解

### 清单文件（manifest.json）字段与平台加载的关系

| 字段            | 作用                                                   |
| :-------------- | :----------------------------------------------------- |
| `id`            | 插件唯一标识，平台通过此 ID 加载对应目录下的 `main.js` |
| `version`       | 语义化版本，平台用于更新检测                           |
| `minAppVersion` | 平台检查版本兼容性，低于此版本则禁止加载               |
| `isDesktopOnly` | 若为 `true`，平台在移动端不加载该插件                  |

## 附录

无。
